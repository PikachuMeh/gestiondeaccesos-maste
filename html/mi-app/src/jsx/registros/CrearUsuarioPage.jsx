// src/jsx/registros/CrearUsuarioPage.jsx - MEJORADO CON RESTRICCIONES POR ROL

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useApi } from "../../context/ApiContext.jsx";

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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          {isAdmin() ? "Crear Nuevo Usuario" : "Crear Operador"}
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            ✅ Usuario creado exitosamente. Redirigiendo...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Información Básica</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Juan"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apellidos *
                </label>
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleChange}
                  placeholder="Pérez García"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cédula *
                </label>
                <input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChange}
                  placeholder="12345678"
                  maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      cedulaValida ? "bg-green-500" : "bg-gray-300"
                    }`}
                    style={{ width: `${Math.min((formData.cedula.length / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="usuario@ejemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Credenciales */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Credenciales de Acceso</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="usuario_123"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div></div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contraseña *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Rol - CON RESTRICCIONES */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Asignación</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol *
              </label>
              <select
                name="rol_id"
                value={formData.rol_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {!isAdmin() && (
                <p className="text-xs text-blue-600 mt-1">
                  ℹ️ Como Supervisor, solo puedes crear Operadores
                </p>
              )}
            </div>
          </div>

          {/* Foto */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Foto de Perfil</h2>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {fotoPreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={fotoPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg mb-4"
                  />
                  <button
                    type="button"
                    onClick={handleClearFoto}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    ❌ Cambiar Foto
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
                    className="block cursor-pointer text-gray-600"
                  >
                    <div className="text-4xl mb-2">📷</div>
                    <p className="font-medium">Haz clic para seleccionar foto</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Formatos: JPG, PNG, GIF, WEBP | Máximo: 5MB
                    </p>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="border-t pt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
