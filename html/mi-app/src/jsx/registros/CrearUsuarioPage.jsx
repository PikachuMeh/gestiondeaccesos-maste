// src/jsx/registros/CrearUsuarioPage.jsx - MEJORADO CON RESTRICCIONES POR ROL

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useApi } from "../../context/ApiContext.jsx";
import {
  FaUser,
  FaIdCard,
  FaEnvelope,
  FaLock,
  FaBriefcase,
  FaCamera,
  FaTrash,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaUserPlus
} from "react-icons/fa";

export default function CrearUsuarioPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/usuarios`;
  const navigate = useNavigate();
  const { token, user, isAuthenticated, isAdmin, isSupervisorOrAbove } = useAuth();

  const [formData, setFormData] = useState({
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

  const [fotoPreview, setFotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ PROTECCIÓN Y RESTRICCIONES POR ROL
  useEffect(() => {
    const checkAccess = () => {
      if (!isAuthenticated()) {
        navigate("/login");
        return false;
      }

      // ADMIN: puede crear cualquier rol
      // SUPERVISOR: puede crear solo OPERADOR
      if (!isAdmin() && !isSupervisorOrAbove()) {
        setError("Acceso denegado: No tienes permisos para crear usuarios.");
        const timer = setTimeout(() => navigate("/usuarios"), 2000);
        return () => clearTimeout(timer);
      }

      return true;
    };

    checkAccess();
  }, []);

  // ✅ ROLES DISPONIBLES SEGÚN EL ROL DEL USUARIO ACTUAL
  const getRolesAvailable = () => {
    if (isAdmin()) {
      // ADMIN puede crear: Supervisor y Operador
      return [
        { id: 2, name: "Supervisor" },
        { id: 3, name: "Operador" },
      ];
    } else {
      // SUPERVISOR solo puede crear: Operador
      return [
        { id: 3, name: "Operador" },
      ];
    }
  };

  const roles = getRolesAvailable();

  // Asegurar que el rol_id sea válido para el usuario actual
  useEffect(() => {
    const validRoles = roles.map((r) => r.id);
    if (!validRoles.includes(formData.rol_id)) {
      setFormData((prev) => ({
        ...prev,
        rol_id: roles[0]?.id || 3,
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "cedula") {
      const soloNumeros = value.replace(/\D/g, "");
      const limitado = soloNumeros.slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: limitado }));
    } else if (name === "nombre") {
      const soloLetras = value.replace(/[^a-zA-Zá-ú\s]/g, "");
      setFormData((prev) => ({ ...prev, [name]: soloLetras }));
    } else if (name === "apellidos") {
      const soloLetras = value.replace(/[^a-zA-Zá-ú\s]/g, "");
      setFormData((prev) => ({ ...prev, [name]: soloLetras }));
    } else if (name === "username") {
      const soloValidos = value.replace(/[^a-zA-Z0-9_-]/g, "");
      setFormData((prev) => ({ ...prev, [name]: soloValidos }));
    } else {
      const finalValue = name === "rol_id" ? Number(value) : value;
      setFormData((prev) => ({ ...prev, [name]: finalValue }));
    }

    setError("");
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de archivo no permitido. Usa: JPG, PNG, GIF o WEBP");
        return;
      }

      const maxSizeMB = 5;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Archivo demasiado grande. Máximo: ${maxSizeMB}MB`);
        return;
      }

      setFormData((prev) => ({ ...prev, foto: file }));

      const reader = new FileReader();
      reader.onload = (event) => {
        setFotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleClearFoto = () => {
    setFormData((prev) => ({ ...prev, foto: null }));
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

    if (!/^\d{7,10}$/.test(formData.cedula)) {
      setError("Cédula debe ser numérica de 7-10 dígitos");
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

    // ✅ VALIDACIÓN DE ROL: Asegurar que el rol seleccionado sea permitido
    const validRoles = roles.map((r) => r.id);
    if (!validRoles.includes(formData.rol_id)) {
      setError(`Rol no permitido. Roles disponibles: ${roles.map((r) => r.name).join(", ")}`);
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
      const formDataToSend = new FormData();
      formDataToSend.append("username", formData.username.trim());
      formDataToSend.append("password", formData.password);
      formDataToSend.append("email", formData.email.trim());
      formDataToSend.append("cedula", formData.cedula.trim());
      formDataToSend.append("rol_id", formData.rol_id.toString());
      formDataToSend.append("nombre", formData.nombre.trim());
      formDataToSend.append("apellidos", formData.apellidos.trim());

      if (formData.foto) {
        formDataToSend.append("foto", formData.foto);
      }

      const response = await fetch(`${API_BASE}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errData = await response.json();
        let errorMsg = "Error desconocido";

        if (response.status === 422) {
          if (errData.detail && Array.isArray(errData.detail)) {
            errorMsg = errData.detail
              .map((item) => item.msg || item.detail || JSON.stringify(item))
              .join("; ");
          } else if (errData.detail) {
            errorMsg = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
          }
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          errorMsg = "Sesión expirada o sin permisos. Redirigiendo al login.";
          setTimeout(() => navigate("/login"), 1500);
        } else if (response.status === 409) {
          errorMsg = errData.detail || "Conflicto: Datos duplicados (username, email, cédula)";
        } else {
          errorMsg = errData.detail || `Error HTTP ${response.status}`;
        }

        setError(errorMsg);
        return;
      }

      setSuccess(true);
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        cedula: "",
        nombre: "",
        apellidos: "",
        rol_id: roles[0]?.id || 3,
        foto: null,
      });
      setFotoPreview(null);

      setTimeout(() => {
        navigate("/usuarios");
      }, 2000);
    } catch (err) {
      setError("Error de conexión: " + (err.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/usuarios");
  };

  const selectedRol = roles.find((r) => r.id === formData.rol_id);
  const cedulaValida = /^\d{7,10}$/.test(formData.cedula);
  const usernameValido = formData.username.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(formData.username);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FaUserPlus className="text-blue-600 dark:text-blue-400" />
              {isAdmin() ? "Crear Nuevo Usuario" : "Crear Operador"}
            </h1>

            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                <FaExclamationCircle /> {error}
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg flex items-center gap-2">
                <FaCheckCircle /> Usuario creado exitosamente. Redirigiendo...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Información Básica */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <FaUser className="text-gray-500" /> Información Básica
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Juan"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleChange}
                      placeholder="Pérez García"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaIdCard className="text-gray-400" /> Cédula *
                    </label>
                    <input
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleChange}
                      placeholder="12345678"
                      maxLength="10"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                    <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${cedulaValida ? "bg-green-500" : "bg-gray-400 dark:bg-gray-500"
                          }`}
                        style={{ width: `${Math.min((formData.cedula.length / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaEnvelope className="text-gray-400" /> Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="usuario@ejemplo.com"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Credenciales */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <FaLock className="text-gray-500" /> Credenciales de Acceso
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="usuario_123"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="hidden md:block"></div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mínimo 8 caracteres</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirmar Contraseña *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Rol */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <FaBriefcase className="text-gray-500" /> Asignación
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rol *
                  </label>
                  <select
                    name="rol_id"
                    value={formData.rol_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {!isAdmin() && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                      <FaExclamationCircle /> Como Supervisor, solo puedes crear Operadores
                    </p>
                  )}
                </div>
              </div>

              {/* Foto */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <FaCamera className="text-gray-500" /> Foto de Perfil
                </h2>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  {fotoPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={fotoPreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-full shadow-lg border-4 border-white dark:border-gray-600 mb-4"
                      />
                      <button
                        type="button"
                        onClick={handleClearFoto}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <FaTrash /> Eliminar Foto
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFotoChange}
                        className="hidden"
                        id="foto-input"
                      />
                      <label
                        htmlFor="foto-input"
                        className="cursor-pointer flex flex-col items-center justify-center"
                      >
                        <FaCamera className="text-5xl text-gray-400 mb-3" />
                        <p className="font-medium text-gray-900 dark:text-white">Haz clic para seleccionar foto</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Formatos: JPG, PNG, GIF, WEBP | Máximo: 5MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <FaTimes /> Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Creando..." : (
                    <>
                      <FaSave /> Crear Usuario
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
