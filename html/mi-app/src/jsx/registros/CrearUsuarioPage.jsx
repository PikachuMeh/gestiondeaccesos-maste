// src/jsx/CrearUsuarioPage.jsx (ACTUALIZADO CON FOTO)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useApi } from "../../context/ApiContext.jsx";

export default function CrearUsuarioPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/usuarios/`;
  const OPERADORES_IMG_URL = import.meta.env.VITE_OPERADORES_IMG_URL || "http://localhost:5173/src/img/operadores/";
  
  const navigate = useNavigate();
  const { token, user, isAuthenticated, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    cedula: "",
    nombre: "",
    apellidos: "",
    rol_id: 3, // Default: Operador
    foto: null, // NUEVO: Archivo de foto
  });

  const [fotoPreview, setFotoPreview] = useState(null); // NUEVO: Preview de foto
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
      setTimeout(() => navigate("/dashboard"), 2000);
      return;
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const roles = [
    { id: 2, name: "Supervisor" },
    { id: 3, name: "Operador" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "rol_id" ? Number(value) : value,
    }));
    setError("");
  };

  // NUEVO: Manejador para cambio de foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de archivo no permitido. Usa: JPG, PNG, GIF o WEBP");
        return;
      }

      // Validar tamaño (máximo 5MB)
      const maxSizeMB = 5;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Archivo demasiado grande. Máximo: ${maxSizeMB}MB`);
        return;
      }

      // Guardar archivo y crear preview
      setFormData((prev) => ({
        ...prev,
        foto: file,
      }));

      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (event) => {
        setFotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);

      setError("");
    }
  };

  // NUEVO: Limpiar foto seleccionada
  const handleClearFoto = () => {
    setFormData((prev) => ({
      ...prev,
      foto: null,
    }));
    setFotoPreview(null);
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
    if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(formData.email)) {
      setError("Email inválido (formato: usuario@dominio.com)");
      return false;
    }
    if (!/^\d{7,8}$/.test(formData.cedula)) {
      setError("Cédula debe ser numérica de 7-8 dígitos");
      return false;
    }
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
      // Usar FormData para soportar archivos
      const formDataToSend = new FormData();
      formDataToSend.append("username", formData.username.trim());
      formDataToSend.append("password", formData.password);
      formDataToSend.append("email", formData.email.trim());
      formDataToSend.append("cedula", formData.cedula.trim());
      formDataToSend.append("rol_id", formData.rol_id.toString());
      formDataToSend.append("nombre", formData.nombre.trim());
      formDataToSend.append("apellidos", formData.apellidos.trim());
      
      // NUEVO: Agregar foto si existe
      if (formData.foto) {
        formDataToSend.append("foto", formData.foto);
        console.log(`Enviando foto: ${formData.foto.name}`);
      }

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // NO agregar Content-Type; browser lo setea para FormData
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errData = await response.json();
        let errorMsg = "Error desconocido";

        if (response.status === 422) {
          if (errData.detail && Array.isArray(errData.detail)) {
            errorMsg = errData.detail.map((item) => item.msg).join("; ");
          } else if (errData.detail) {
            errorMsg = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
          }
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          errorMsg = "Sesión expirada o sin permisos. Redirigiendo al login.";
          setTimeout(() => navigate("/login"), 1500);
        } else if (response.status === 409) {
          errorMsg = errData.detail || "Conflicto: Datos duplicados (username, email, cédula, nombre o apellidos)";
        } else if (response.status === 413) {
          errorMsg = errData.detail || "Archivo de foto demasiado grande";
        } else if (response.status === 415) {
          errorMsg = errData.detail || "Tipo de archivo de foto no permitido";
        } else {
          errorMsg = errData.detail || `Error HTTP ${response.status}`;
        }

        setError(errorMsg);
        return;
      }

      const data = await response.json();
      setSuccess(true);

      // Limpiar formulario después del éxito
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        cedula: "",
        nombre: "",
        apellidos: "",
        rol_id: 3,
        foto: null,
      });
      setFotoPreview(null);

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

  if (!isAuthenticated() || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      </div>
    );
  }

  const selectedRol = roles.find((r) => r.id === formData.rol_id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px] gap-6">
          {/* Left side - FORMULARIO */}
          <div className="p-8">
            <form className="space-y-6" autoComplete="off" onSubmit={handleSubmit}>
              <div className="text-2xl font-semibold text-on-surface mb-8">Crear Nuevo Operador</div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800">✗ {error}</div>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-green-800">✓ Usuario creado exitosamente. Redirigiendo...</div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Información Personal</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Username</label>
                    <input
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="nombre_usuario"
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Email</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="usuario@ejemplo.com"
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Cédula</label>
                    <input
                      id="cedula"
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleChange}
                      placeholder="12345678"
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Nombre</label>
                    <input
                      id="nombre"
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Juan"
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Apellidos</label>
                    <input
                      id="apellidos"
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleChange}
                      placeholder="Pérez García"
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Información de Seguridad</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Contraseña</label>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Confirmar Contraseña</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Rol</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Rol</label>
                    <select
                      id="rol_id"
                      name="rol_id"
                      value={formData.rol_id}
                      onChange={handleChange}
                      required
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    >
                      {roles.map((rol) => (
                        <option key={rol.id} value={rol.id}>
                          {rol.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-start pt-4 gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Creando..." : "Crear Usuario"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>

            {/* Resumen de datos */}
            <div className="mt-8 p-4 bg-surface-variant/50 rounded-lg border border-outline">
              <h3 className="text-lg font-medium text-on-surface mb-4">Resumen del nuevo usuario:</h3>
              <div className="space-y-2 text-sm text-on-surface">
                <p><strong>Usuario:</strong> {formData.username || "(sin definir)"}</p>
                <p><strong>Nombre:</strong> {formData.nombre || "(sin definir)"} {formData.apellidos || "(sin definir)"}</p>
                <p><strong>Rol:</strong> {selectedRol?.name || "(sin definir)"}</p>
                <p><strong>Foto:</strong> {fotoPreview ? "✓ Seleccionada" : "No seleccionada"}</p>
              </div>
            </div>
          </div>

          {/* Right side - Photo Display */}
          <div className="bg-primary flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/95 to-primary/90"></div>
            <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
              <div className="w-full h-full bg-linear-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
            </div>
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full transform rotate-45 animate-bounce" style={{animationDuration: '3s'}}></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-full transform -rotate-12 animate-pulse" style={{animationDelay: '1s'}}></div>

            <div className="text-center relative z-10">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Foto del Usuario</h3>

                <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
                  <div className="text-center">
                    <label className="block cursor-pointer">
                      <div className="w-48 h-48 mx-auto mb-4 rounded-lg overflow-hidden shadow-lg bg-white/20 flex items-center justify-center hover:shadow-xl transition-shadow">
                        {fotoPreview ? (
                          <img src={fotoPreview} alt="Foto del usuario" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <svg className="w-16 h-16 text-gray-700 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <p className="text-sm text-gray-800">Haz clic para subir foto</p>
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFotoChange} />
                    </label>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Formatos permitidos: JPG, PNG, GIF, WEBP</p>
                    <p className="text-xs text-gray-600">Tamaño máximo: 5MB</p>
                  </div>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Información Importante</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• La foto es opcional</li>
                    <li>• Se recomienda foto de frente y rostro claro</li>
                    <li>• La imagen se almacenará de forma segura</li>
                    <li>• Formatos: JPG, PNG, GIF, WEBP hasta 5MB</li>
                  </ul>
                </div>
              </div>

              {(formData.nombre || formData.apellidos) && (
                <div className="space-y-2 mt-6">
                  <h3 className="text-xl font-semibold text-white">{formData.nombre} {formData.apellidos}</h3>
                  {formData.username && <p className="text-white/90 text-lg">{formData.username}</p>}
                  {selectedRol && <p className="text-white/80">{selectedRol.name}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}