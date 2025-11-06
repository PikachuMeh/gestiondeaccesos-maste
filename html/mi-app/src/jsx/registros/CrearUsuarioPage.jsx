// src/jsx/CrearUsuarioPage.jsx (nuevo)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";  // Para token

const API_BASE = "http://localhost:8000/api/v1/usuarios";

export default function CrearUsuarioPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    cedula: "",
    rol_id: 3  // Default: Operador
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const roles = [
    { id: 2, name: "Supervisor" },
    { id: 3, name: "Operador" }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");  // Limpia error en cambio
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (!formData.cedula.match(/^\d{7,8}$/)) {
      setError("Cédula debe ser numérica (7-8 dígitos)");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Email inválido");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          cedula: formData.cedula,
          rol_id: parseInt(formData.rol_id)
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error en creación");
      }
      const data = await response.json();
      setSuccess(true);
      alert(`Usuario "${formData.username}" (${roles.find(r => r.id === formData.rol_id).name}) creado exitosamente!`);
      navigate("/usuarios");  // Redirige a lista
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <div>Redirigiendo...</div>;  // Opcional, ya que navigate lo maneja
  }

  return (
    <div className="crear-usuario-screen">
      <h1>Crear Nuevo Usuario</h1>
      <form onSubmit={handleSubmit} className="crear-usuario-form">
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            minLength={3}
            placeholder="Nombre de usuario (único)"
          />
        </div>
        <div className="form-group">
          <label>Contraseña:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <div className="form-group">
          <label>Confirmar Contraseña:</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="usuario@ejemplo.com"
          />
        </div>
        <div className="form-group">
          <label>Cédula:</label>
          <input
            type="text"
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            required
            placeholder="12345678"
            maxLength={8}
          />
        </div>
        <div className="form-group">
          <label>Rol:</label>
          <select name="rol_id" value={formData.rol_id} onChange={handleChange} required>
            {roles.map(rol => (
              <option key={rol.id} value={rol.id}>{rol.name}</option>
            ))}
          </select>
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading} className="btn btn--primary">
          {loading ? "Creando..." : "Crear Usuario"}
        </button>
        <button type="button" onClick={() => navigate("/usuarios")} className="btn btn--secondary">
          Cancelar
        </button>
      </form>
    </div>
  );
}
