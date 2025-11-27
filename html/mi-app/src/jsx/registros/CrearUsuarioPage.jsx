// src/jsx/CrearUsuarioPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";  // Ajusta la ruta si es necesario
import { useApi } from "../../context/ApiContext.jsx"; 

 

export default function CrearUsuarioPage() {
  const { API_V1 } = useApi();

  const API_BASE = `${API_V1}/usuarios/`; 
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px] gap-6">
          {/* Left side - User Form */}
          <div className="p-8">
            <form className="space-y-6" autoComplete="off" onSubmit={handleSubmit}>
              <div className="text-2xl font-semibold text-on-surface mb-8">CREAR NUEVO USUARIO</div>

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 mb-4">
                  Usuario "{formData.username}" ({selectedRol?.name || 'Operador'}) con nombre "{formData.nombre} {formData.apellidos}" creado exitosamente!
                  Redirigiendo en 2 segundos...
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Datos de Usuario</h3>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      required
                      minLength={3}
                      placeholder="Nombre de usuario único (mín. 3 chars)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      required
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Cédula</label>
                    <input
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleChange}
                      className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      required
                      placeholder="12345678 (7-8 dígitos)"
                      maxLength={8}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Información Personal</h3>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      required
                      minLength={1}
                      maxLength={200}
                      placeholder="Nombre completo (requerido)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Apellidos</label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleChange}
                      className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      required
                      minLength={1}
                      maxLength={200}
                      placeholder="Apellidos completos (requerido)"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Seguridad</h3>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Contraseña</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Confirmar Contraseña</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  {error}
                </div>
              )}

              <div className="flex justify-start pt-4 gap-4">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Creando..." : "Crear Usuario"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading || success}
                  className="bg-surface-variant text-on-surface-variant px-8 py-3 rounded-lg hover:bg-surface-variant/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* Middle side - Role Information */}
          <div className="p-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-on-surface">Configuración de Rol</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Rol del Usuario</label>
                  <select
                    name="rol_id"
                    value={formData.rol_id}
                    onChange={handleChange}
                    className="block w-full px-0 py-2 border-b-2 border-outline bg-transparent text-on-surface focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    required
                  >
                    {roles.map(rol => (
                      <option key={rol.id} value={rol.id}>
                        {rol.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-surface-variant rounded-lg p-4">
                <h4 className="text-md font-medium text-on-surface mb-3">Información del Rol Seleccionado</h4>
                <div className="space-y-2">
                  {formData.rol_id === 2 && (
                    <div>
                      <div className="text-sm font-medium text-on-surface-variant">Supervisor</div>
                      <div className="text-sm text-on-surface">Puede gestionar usuarios operativos y tiene acceso a funciones administrativas básicas.</div>
                    </div>
                  )}
                  {formData.rol_id === 3 && (
                    <div>
                      <div className="text-sm font-medium text-on-surface-variant">Operador</div>
                      <div className="text-sm text-on-surface">Puede registrar accesos y gestionar visitas diarias del sistema.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Requisitos de Seguridad</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Username: mínimo 3 caracteres</li>
                  <li>• Contraseña: mínimo 8 caracteres</li>
                  <li>• Email: formato válido</li>
                  <li>• Cédula: 7-8 dígitos numéricos</li>
                  <li>• Nombre y apellidos: requeridos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right side - User Avatar/Info */}
          <div className="bg-primary flex items-center justify-center p-8 relative overflow-hidden">
            {/* Parallax background layers */}
            <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/95 to-primary/90"></div>
            <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
              <div className="w-full h-full bg-linear-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
            </div>
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full transform rotate-45 animate-bounce" style={{animationDuration: '3s'}}></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-full transform -rotate-12 animate-pulse" style={{animationDelay: '1s'}}></div>

            <div className="text-center relative z-10">
              <div className="w-64 h-64 mx-auto mb-6 rounded-lg overflow-hidden shadow-2xl transform hover:scale-110 transition-all duration-500 hover:rotate-1">
                <div className="w-full h-full bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-32 h-32 text-white transform hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </div>

              {(formData.nombre || formData.apellidos) && (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">{formData.nombre} {formData.apellidos}</h3>
                  <p className="text-white/90 text-lg">{formData.username || 'Nuevo Usuario'}</p>
                  <p className="text-white/80">{selectedRol?.name || 'Rol por asignar'}</p>
                </div>
              )}

              {(!formData.nombre && !formData.apellidos) && (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">Crear Usuario</h3>
                  <p className="text-white/80">Complete el formulario para crear un nuevo usuario en el sistema</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
