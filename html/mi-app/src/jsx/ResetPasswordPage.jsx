import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import "../css/login.css";
import { useApi } from "../context/ApiContext.jsx"; 



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
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Verificando token...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Error</h1>
            <div className="error-message">⚠️ {error}</div>
            <Link to="/login" style={{ color: "#007bff", marginTop: "16px", display: "block" }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/src/img/seniat_logo.png" alt="SENIAT" className="login-logo" />
          <h1>Resetear Contraseña</h1>
          <p>Usuario: <strong>{username}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="nueva-password">Nueva Contraseña</label>
            <input
              id="nueva-password"
              type="password"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              placeholder="Ingresa tu nueva contraseña"
              disabled={loading}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmar-password">Confirmar Contraseña</label>
            <input
              id="confirmar-password"
              type="password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              placeholder="Confirma tu nueva contraseña"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn--primary btn--full"
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <Link to="/login" style={{ color: "#007bff", textDecoration: "none" }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
