import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // Ajusta la ruta según tu estructura (ej. si está en src/jsx/auth/)
import { useApi } from "../context/ApiContext.jsx"; 



export default function EditarPersonaPage() {
  const { API_V1 } = useApi();

  const API_BASE = `${API_V1}/personas`;
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, loading: authLoading, isAuthenticated } = useAuth();  // Obtener token y estado de auth

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
    observaciones: "",
  });

  // Estados para la foto
  const [fotoActual, setFotoActual] = useState(null);
  const [nuevaFoto, setNuevaFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Estados de UI (renombrado loading a isLoading para incluir authLoading)
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Cargar datos de la persona al montar el componente
  useEffect(() => {
    // Verificar autenticación antes de hacer el fetch
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    if (authLoading) {
      return;  // Esperar a que el Context cargue
    }

    fetch(`${API_BASE}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,  // Agregar header de autenticación
      },
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {  // Manejo específico de errores de auth
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
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Solo se permiten archivos de imagen (JPG, PNG, GIF)");
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
    // Resetear el input de archivo
    const fileInput = document.getElementById("foto");
    if (fileInput) fileInput.value = "";
  };

  // Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificar autenticación antes de enviar
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage("");

    try {
      // Crear FormData para enviar datos con archivo
      const data = new FormData();
      
      // Agregar todos los campos del formulario
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      // Agregar foto si hay una nueva
      if (nuevaFoto) {
        data.append("foto", nuevaFoto);
      }

      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,  // Agregar header de autenticación
        },
        body: data,
        // No establecer Content-Type, el navegador lo hace automáticamente con FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {  // Manejo de errores de auth
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          setError("Sesión expirada. Redirigiendo al login.");
          navigate("/login");
          return;
        } else if (response.status === 409) {  // Manejo específico para duplicados (ej. email)
          setError(errorData.detail || "Correo ya registrado");
        } else {
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
      }

      const result = await response.json();
      setSuccessMessage("Persona actualizada correctamente");
      
      // Redirigir después de 1.5 segundos
      setTimeout(() => {
        navigate(`/personas/${id}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Cancelar y volver
  const handleCancel = () => {
    navigate(`/personas/${id}`);
  };

  // Early return para loading o no autenticado
  if (authLoading || isLoading) return <div className="ep-loading">Cargando datos...</div>;
  if (!isAuthenticated()) return null;  // navigate ya maneja la redirección

  // Determinar qué foto mostrar (ajustado para path de foto actual)
  const displayFoto = previewUrl || (fotoActual ? `${window.location.origin}/img/personas/${fotoActual}` : null);  // Ajusta la URL base según tu config de static files (ej. /img/personas/ o endpoint /foto/{id})

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="text-2xl font-semibold text-on-surface p-8 pb-4">EDITAR PERSONA</div>

        {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mx-8 mb-4">Error: {error}</div>}
        {successMessage && <div className="text-green-600 bg-green-50 border border-green-200 rounded-lg p-4 mx-8 mb-4">{successMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-6 px-8 pb-8">
            {/* Left side - Form */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Información Personal</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="Nombre completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Apellido</label>
                    <input
                      type="text"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="Apellido completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Cédula</label>
                    <input
                      type="text"
                      name="documento_identidad"
                      value={formData.documento_identidad}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="V-12345678"
                      required
                      disabled
                      title="La cédula no se puede modificar"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Correo</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="usuario@ejemplo.com"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Información Laboral</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Empresa</label>
                    <input
                      type="text"
                      name="empresa"
                      value={formData.empresa}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="Nombre de la empresa"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Cargo</label>
                    <input
                      type="text"
                      name="cargo"
                      value={formData.cargo}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="Cargo en la empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Unidad</label>
                    <input
                      type="text"
                      name="unidad"
                      value={formData.unidad}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="Unidad de trabajo"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Información Adicional</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Dirección</label>
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                      placeholder="Dirección completa"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Observaciones</label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={handleChange}
                      className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all resize-none"
                      rows={3}
                      placeholder="Observaciones adicionales"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-start pt-4 gap-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
              </div>
            </div>

            {/* Right side - Photo Upload */}
            <div className="p-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-on-surface">Foto del Visitante</h3>

                <div className="bg-surface-variant rounded-lg p-6">
                  <div className="text-center">
                    <label className="block cursor-pointer">
                      <div className="w-48 h-48 mx-auto mb-4 rounded-lg overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center hover:shadow-xl transition-shadow">
                        {displayFoto ? (
                          <img src={displayFoto} alt="Foto del visitante" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <p className="text-sm text-gray-500">Haz clic para subir foto</p>
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                    </label>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600 mb-2">Formatos permitidos: JPG, PNG, GIF</p>
                    <p className="text-xs text-gray-500">Tamaño máximo: 5MB</p>

                    {(nuevaFoto || previewUrl) && (
                      <button
                        type="button"
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        onClick={handleRemoverFoto}
                      >
                        <span style={{ color: 'yellow', marginRight: '4px' }}>❌</span>
                        Quitar nueva foto
                      </button>

                    )}

                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
