import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useApi } from "../context/ApiContext.jsx";
import { FaExclamationTriangle, FaArrowLeft, FaCheck, FaLock, FaUser } from "react-icons/fa";

export default function ResetPasswordPage() {
  const { API_V1 } = useApi();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (!tokenFromUrl) {
      setError("Token no proporcionado");
      setValidatingToken(false);
      return;
    }

    setToken(tokenFromUrl);
    verificarToken(tokenFromUrl);
  }, [searchParams]);

  const verificarToken = async (tokenToVerify) => {
    try {
      // Verificar que coincida con tu ruta del backend
      const response = await fetch(
        `${API_V1}/auth/verificar-token-reset?token=${encodeURIComponent(tokenToVerify)}`,
        {
          method: 'GET',  // Asegurar que sea GET
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.valid) {
        setUsername(data.username);
      } else {
        setError("El token es inválido o ha expirado");
      }
    } catch (err) {
      console.error('Error verificando token:', err);
      setError("Error al verificar el token");
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (nuevaPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          nueva_password: nuevaPassword,
          confirmar_password: confirmarPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("✓ Contraseña actualizada exitosamente. Ahora puedes iniciar sesión.");
        navigate("/login");
      } else {
        setError(data.detail || "Error al resetear la contraseña");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Verificando token...</h1>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h1>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-center gap-2 mb-6">
            <FaExclamationTriangle /> {error}
          </div>
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-2">
            <FaArrowLeft /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center border-b border-gray-200 dark:border-gray-700">
          <img src="/src/img/seniat_logo.png" alt="SENIAT" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Resetear Contraseña</h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
            <FaUser className="text-gray-400" /> Usuario: <strong>{username}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <FaExclamationTriangle /> {error}
            </div>
          )}

          <div>
            <label htmlFor="nueva-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nueva Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                id="nueva-password"
                type="password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                disabled={loading}
                required
                autoFocus
                className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmar-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                id="confirmar-password"
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                disabled={loading}
                required
                className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center justify-center gap-2">
              <FaArrowLeft /> Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
