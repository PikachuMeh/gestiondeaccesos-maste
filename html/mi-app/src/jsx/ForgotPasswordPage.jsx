import { useState } from "react";
import { Link } from "react-router-dom";
import "../css/login.css";
import { useApi } from "../context/ApiContext.jsx"; 


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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/src/img/seniat_logo.png" alt="SENIAT" className="login-logo" />
          <h1>Recuperar Contraseña</h1>
          <p>Ingresa tu correo electrónico para recuperar tu contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div className="success-message" style={{
              backgroundColor: "#d4edda",
              border: "1px solid #c3e6cb",
              color: "#155724",
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "16px"
            }}>
              ✓ {message}
              {resetToken && (
                <div style={{ marginTop: "12px", fontSize: "0.9em" }}>
                  <strong>Token generado (solo desarrollo):</strong>
                  <br />
                  <Link 
                    to={`/reset-password?token=${resetToken}`}
                    style={{ color: "#007bff" }}
                  >
                    Click aquí para resetear tu contraseña
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              required
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="btn btn--primary btn--full"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Solicitar Recuperación"}
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
