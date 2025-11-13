// src/jsx/CrearUsuarioPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";  // Ajusta la ruta si es necesario

const API_BASE = "http://localhost:8000/api/v1/usuarios/";  // Trailing slash para evitar redirects 307

export default function CrearUsuarioPage() {
  const navigate = useNavigate();
  const { token, user, isAuthenticated, isAdmin } = useAuth();  // isAdmin: () => user?.rol_id === 1
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    cedula: "",
    nombre: "",  // NUEVO: Requerido por DB/model
    apellidos: "",  // NUEVO: Requerido por DB/model
    rol_id: 3  // Default: Operador
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verificar autenticación y rol de admin al montar el componente
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    if (!isAdmin()) {
      setError("Acceso denegado: Solo administradores pueden crear usuarios.");
      setTimeout(() => navigate("/dashboard"), 2000);  // Redirige no-admin
      return;
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const roles = [
    { id: 2, name: "Supervisor" },
    { id: 3, name: "Operador" }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");  // Limpia error al cambiar
  };

  const validateForm = () => {
    if (!formData.username.trim() || formData.username.length < 3) {
      setError("Username debe tener al menos 3 caracteres");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Contraseña debe tener al menos 8 caracteres");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    // Mejora: Regex alinea con backend
    if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(formData.email)) {
      setError("Email inválido (formato: usuario@dominio.com)");
      return false;
    }
    if (!/^\d{7,8}$/.test(formData.cedula)) {
      setError("Cédula debe ser numérica de 7-8 dígitos");
      return false;
    }
    // NUEVO: Validaciones para nombre y apellidos
    if (!formData.nombre.trim() || formData.nombre.length < 1) {
      setError("Nombre es requerido");
      return false;
    }
    if (!formData.apellidos.trim() || formData.apellidos.length < 1) {
      setError("Apellidos son requeridos");
      return false;
    }
    if (formData.rol_id !== 2 && formData.rol_id !== 3) {
      setError("Rol inválido: Solo Supervisor u Operador");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Usar FormData para compatibilidad con backend Form(...)
      const formDataToSend = new FormData();
      formDataToSend.append("username", formData.username.trim());
      formDataToSend.append("password", formData.password);
      formDataToSend.append("email", formData.email.trim());
      formDataToSend.append("cedula", formData.cedula.trim());
      formDataToSend.append("rol_id", formData.rol_id.toString());
      // NUEVO: Append campos requeridos
      formDataToSend.append("nombre", formData.nombre.trim());
      formDataToSend.append("apellidos", formData.apellidos.trim());

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          // NO agregar Content-Type; browser lo setea para FormData
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errData = await response.json();
        let errorMsg = "Error desconocido";
        
        if (response.status === 422) {
          // Manejo Pydantic detail array
          if (errData.detail && Array.isArray(errData.detail)) {
            errorMsg = errData.detail.map(item => item.msg).join('; ');
          } else if (errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          errorMsg = "Sesión expirada o sin permisos. Redirigiendo al login.";
          setTimeout(() => navigate("/login"), 1500);
        } else if (response.status === 409) {
          errorMsg = errData.detail || "Conflicto: Datos duplicados (username, email, cédula, nombre o apellidos)";
        } else {
          errorMsg = errData.detail || `Error HTTP ${response.status}`;
        }
        
        setError(errorMsg);
        return;
      }

      const data = await response.json();
      setSuccess(true);
      
      // Limpia el formulario después del éxito
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        cedula: "",
        nombre: "",
        apellidos: "",
        rol_id: 3
      });
      
      // Redirige después de 2 segundos
      setTimeout(() => {
        navigate("/usuarios");
      }, 2000);
    } catch (err) {
      setError("Error de conexión: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/usuarios");
  };

  // Early return para loading o no auth
  if (!isAuthenticated() || loading) {
    return <div className="crear-usuario-screen">Cargando...</div>;
  }
  if (error && !isAdmin()) {
    return <div className="error">Acceso denegado. Redirigiendo...</div>;
  }

  // Determina rol para mensaje de éxito
  const selectedRol = roles.find(r => r.id === parseInt(formData.rol_id));

  return (
    <div className="crear-usuario-screen">
      <h1>Crear Nuevo Usuario (Solo Administrador)</h1>
      
      {success && (
        <div className="success">
          Usuario "{formData.username}" ({selectedRol?.name || 'Operador'}) con nombre "{formData.nombre} {formData.apellidos}" creado exitosamente!
          Redirigiendo en 2 segundos...
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="crear-usuario-form">
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            minLength={3}
            placeholder="Nombre de usuario único (mín. 3 chars)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="usuario@ejemplo.com"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="cedula">Cédula:</label>
          <input
            type="text"
            id="cedula"
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            required
            placeholder="12345678 (7-8 dígitos)"
            maxLength={8}
          />
        </div>
        
        {/* NUEVO: Inputs para campos requeridos */}
        <div className="form-group">
          <label htmlFor="nombre">Nombre:</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            minLength={1}
            maxLength={200}
            placeholder="Nombre completo (requerido)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="apellidos">Apellidos:</label>
          <input
            type="text"
            id="apellidos"
            name="apellidos"
            value={formData.apellidos}
            onChange={handleChange}
            required
            minLength={1}
            maxLength={200}
            placeholder="Apellidos completos (requerido)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="rol_id">Rol:</label>
          <select 
            id="rol_id"
            name="rol_id" 
            value={formData.rol_id} 
            onChange={handleChange} 
            required
          >
            {roles.map(rol => (
              <option key={rol.id} value={rol.id}>
                {rol.name}
              </option>
            ))}
          </select>
        </div>
        
        {error && <div className="error">{error}</div>}
        
        <div className="form-actions">
          <button 
            type="submit" 
            disabled={loading || success} 
            className="btn btn--primary"
          >
            {loading ? "Creando..." : "Crear Usuario"}
          </button>
          <button 
            type="button" 
            onClick={handleCancel}
            disabled={loading || success}
            className="btn btn--secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
