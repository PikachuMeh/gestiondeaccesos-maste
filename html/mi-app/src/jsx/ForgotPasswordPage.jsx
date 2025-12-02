import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../context/ApiContext.jsx";
import { FaExclamationTriangle, FaCheck, FaArrowLeft, FaEnvelope } from "react-icons/fa";

export default function ForgotPasswordPage() {

  const { API_V1 } = useApi();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_V1}/auth/solicitar_recuperacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        // Ya NO mostrar el token en desarrollo
        setEmail("");  // Limpiar el campo
        if (data.token) {
          setResetToken(data.token);
        }
      } else {
        setError(data.detail || "Error al solicitar recuperación");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center border-b border-gray-200 dark:border-gray-700">
          <img src="/src/img/seniat_logo.png" alt="SENIAT" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Recuperar Contraseña</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Ingresa tu correo electrónico para recuperar tu contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <FaExclamationTriangle /> {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-1">
                <FaCheck /> {message}
              </div>
              {resetToken && (
                <div className="mt-2 text-xs border-t border-green-200 dark:border-green-800 pt-2">
                  <strong>Token generado (solo desarrollo):</strong>
                  <br />
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    Click aquí para resetear tu contraseña
                  </Link>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                required
                autoFocus
                className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Solicitar Recuperación"}
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
