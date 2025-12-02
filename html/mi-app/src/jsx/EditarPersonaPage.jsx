// src/jsx/EditarPersonaPage.jsx - FOTO EN MISMO NIVEL QUE FORMULARIO (COMO ORIGINAL)

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import {
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaBuilding,
  FaBriefcase,
  FaSitemap,
  FaMapMarkerAlt,
  FaStickyNote,
  FaCamera,
  FaTrash,
  FaSave,
  FaTimes,
  FaArrowLeft,
  FaExclamationCircle,
  FaCheckCircle
} from "react-icons/fa";

export default function EditarPersonaPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/personas`;
  const { id } = useParams();
  const navigate = useNavigate();

  const { token, loading: authLoading, isAuthenticated } = useAuth();

  // Estado para los datos de la persona
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    documento_identidad: "",
    email: "",
    empresa: "",
    cargo: "",
    direccion: "",
    unidad: "",
    departamento: "",
    observaciones: "",
  });

  // Estados para la foto
  const [fotoActual, setFotoActual] = useState(null);
  const [nuevaFoto, setNuevaFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // ✅ Construir URL de imagen desde API_BASE_URL (COMO EN EL ORIGINAL)
  const getImageUrl = (fotoPath) => {
    if (!fotoPath) return null;
    return `${API_V1}/files/${fotoPath}`;
  };

  // Cargar datos de la persona al montar el componente
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    if (authLoading) {
      return;
    }

    fetch(`${API_BASE}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            navigate("/login");
            throw new Error("Sesión expirada. Redirigiendo al login.");
          }
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setFormData({
          nombre: data.nombre || "",
          apellido: data.apellido || "",
          documento_identidad: data.documento_identidad || "",
          email: data.email || "",
          empresa: data.empresa || "",
          cargo: data.cargo || "",
          direccion: data.direccion || "",
          unidad: data.unidad || "",
          departamento: data.departamento || "",
          observaciones: data.observaciones || "",
        });
        setFotoActual(data.foto || null);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id, token, authLoading, isAuthenticated, navigate]);

  // Limpiar preview URL cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar cambio de foto
  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)");
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar los 5MB");
      return;
    }

    setNuevaFoto(file);
    setError(null);

    // Crear preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Eliminar foto seleccionada
  const handleRemoverFoto = () => {
    setNuevaFoto(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const fileInput = document.getElementById("foto");
    if (fileInput) fileInput.value = "";
  };

  // Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage("");

    try {
      const data = new FormData();

      // Agregar todos los campos
      Object.keys(formData).forEach((key) => {
        if (key === "documento_identidad") return;
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      });

      // ✅ Agregar foto SOLO si hay una nueva
      if (nuevaFoto) {
        data.append("foto", nuevaFoto);
      }

      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          setError("Sesión expirada. Redirigiendo al login.");
          navigate("/login");
          return;
        } else if (response.status === 409) {
          setError(errorData.detail || "Correo ya registrado");
        } else {
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
      }

      setSuccessMessage("Persona actualizada correctamente");
      setNuevaFoto(null);
      setPreviewUrl(null);

      setTimeout(() => {
        navigate(`/personas/${id}`);
      }, 1500);
    } catch (err) {
      console.error("Error guardando:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Cancelar y volver
  const handleCancel = () => {
    navigate(`/personas/${id}`);
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-lg flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-6 py-4 rounded-lg flex items-center gap-2">
          <FaCheckCircle /> {successMessage}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaUser className="text-blue-600 dark:text-blue-400" /> EDITAR PERSONA
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Contenedor principal con 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Columna Izquierda - Formulario */}
            <div className="space-y-8">
              {/* Información Personal */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <FaUser className="text-gray-500" /> Información Personal
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Apellido
                    </label>
                    <input
                      type="text"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaIdCard className="text-gray-400" /> Cédula
                    </label>
                    <input
                      type="text"
                      value={formData.documento_identidad}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaEnvelope className="text-gray-400" /> Correo
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Información Laboral */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <FaBriefcase className="text-gray-500" /> Información Laboral
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaBuilding className="text-gray-400" /> Empresa
                    </label>
                    <input
                      type="text"
                      name="empresa"
                      value={formData.empresa}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaBriefcase className="text-gray-400" /> Cargo
                    </label>
                    <input
                      type="text"
                      name="cargo"
                      value={formData.cargo}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaSitemap className="text-gray-400" /> Unidad
                    </label>
                    <input
                      type="text"
                      name="unidad"
                      value={formData.unidad}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Información Adicional */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <FaStickyNote className="text-gray-500" /> Información Adicional
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaMapMarkerAlt className="text-gray-400" /> Dirección
                    </label>
                    <textarea
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <FaStickyNote className="text-gray-400" /> Observaciones
                    </label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha - Foto */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <FaCamera className="text-gray-500" /> Foto del Visitante
              </h2>

              {/* Preview de imagen */}
              <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[250px] flex items-center justify-center mb-4 overflow-hidden relative">
                {previewUrl ? (
                  // Nueva foto seleccionada
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : fotoActual ? (
                  // Foto actual (construcción de URL correcta)
                  <img
                    src={getImageUrl(fotoActual)}
                    alt="Foto actual"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300?text=Sin+Foto";
                    }}
                  />
                ) : (
                  // Sin foto
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <FaCamera className="text-6xl mb-2 mx-auto" />
                    <p>Sin foto</p>
                  </div>
                )}
              </div>

              {/* Selector de archivo */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-4">
                <input
                  type="file"
                  id="foto"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
                <label htmlFor="foto" className="cursor-pointer block">
                  <FaCamera className="text-4xl text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Seleccionar foto</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Formatos permitidos: JPG, PNG, GIF, WEBP
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Tamaño máximo: 5MB
                  </p>
                </label>
              </div>

              {(previewUrl || nuevaFoto) && (
                <button
                  type="button"
                  onClick={handleRemoverFoto}
                  className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FaTrash /> Eliminar foto seleccionada
                </button>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              disabled={saving}
            >
              <FaTimes /> Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <>Guardando...</>
              ) : (
                <>
                  <FaSave /> Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
