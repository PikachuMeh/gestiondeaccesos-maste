import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/editar_persona.css";

const API_BASE = "http://localhost:8000/api/v1/personas";

export default function EditarPersonaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Cargar datos de la persona al montar el componente
  useEffect(() => {
    fetch(`${API_BASE}/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
      .finally(() => setLoading(false));
  }, [id]);

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
        body: data,
        // No establecer Content-Type, el navegador lo hace automáticamente con FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
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

  if (loading) return <div className="ep-loading">Cargando datos...</div>;

  // Determinar qué foto mostrar
  const displayFoto = previewUrl || fotoActual;

  return (
    <div className="ep-container">
      <div className="ep-card">
        <div className="ep-header">
          <h1 className="ep-title">Editar Persona</h1>
          <button className="ep-btn-back" onClick={() => navigate("/personas")}>
            ← Volver a Lista
          </button>
        </div>

        {error && <div className="ep-error">Error: {error}</div>}
        {successMessage && <div className="ep-success">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="ep-form">
          {/* Sección de foto */}
          <div className="ep-foto-section">
            <div className="ep-foto-preview">
              {displayFoto ? (
                <img
                  src={displayFoto}
                  alt="Vista previa"
                  className="ep-foto-img"
                />
              ) : (
                <div className="ep-foto-placeholder">
                  <span className="ep-foto-icon">🖼️</span>
                  <span>Sin foto</span>
                </div>
              )}
            </div>
            
            <div className="ep-foto-controls">
              <label htmlFor="foto" className="ep-btn ep-btn--upload">
                📷 {fotoActual ? "Cambiar foto" : "Subir foto"}
              </label>
              <input
                type="file"
                id="foto"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleFotoChange}
                style={{ display: "none" }}
              />
              
              {(nuevaFoto || previewUrl) && (
                <button
                  type="button"
                  className="ep-btn ep-btn--remove"
                  onClick={handleRemoverFoto}
                >
                  ❌ Quitar nueva foto
                </button>
              )}
            </div>
            
            {nuevaFoto && (
              <p className="ep-foto-info">
                Nuevo archivo: {nuevaFoto.name} ({(nuevaFoto.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="ep-form-grid">
            {/* Nombre */}
            <div className="ep-field">
              <label htmlFor="nombre" className="ep-label">
                Nombre <span className="ep-required">*</span>
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="ep-input"
                required
              />
            </div>

            {/* Apellido */}
            <div className="ep-field">
              <label htmlFor="apellido" className="ep-label">
                Apellido <span className="ep-required">*</span>
              </label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className="ep-input"
                required
              />
            </div>

            {/* Cédula */}
            <div className="ep-field">
              <label htmlFor="documento_identidad" className="ep-label">
                Cédula <span className="ep-required">*</span>
              </label>
              <input
                type="text"
                id="documento_identidad"
                name="documento_identidad"
                value={formData.documento_identidad}
                onChange={handleChange}
                className="ep-input"
                required
                disabled
                title="La cédula no se puede modificar"
              />
            </div>

            {/* Email */}
            <div className="ep-field">
              <label htmlFor="email" className="ep-label">
                Correo Electrónico <span className="ep-required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="ep-input"
                required
              />
            </div>

            {/* Empresa */}
            <div className="ep-field">
              <label htmlFor="empresa" className="ep-label">
                Empresa <span className="ep-required">*</span>
              </label>
              <input
                type="text"
                id="empresa"
                name="empresa"
                value={formData.empresa}
                onChange={handleChange}
                className="ep-input"
                required
              />
            </div>

            {/* Cargo */}
            <div className="ep-field">
              <label htmlFor="cargo" className="ep-label">
                Cargo
              </label>
              <input
                type="text"
                id="cargo"
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                className="ep-input"
              />
            </div>

            {/* Dirección */}
            <div className="ep-field ep-field--full">
              <label htmlFor="direccion" className="ep-label">
                Dirección <span className="ep-required">*</span>
              </label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="ep-input"
                required
              />
            </div>

            {/* Unidad */}
            <div className="ep-field">
              <label htmlFor="unidad" className="ep-label">
                Unidad
              </label>
              <input
                type="text"
                id="unidad"
                name="unidad"
                value={formData.unidad}
                onChange={handleChange}
                className="ep-input"
              />
            </div>

            {/* Observaciones */}
            <div className="ep-field ep-field--full">
              <label htmlFor="observaciones" className="ep-label">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                className="ep-textarea"
                rows="4"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="ep-actions">
            <button
              type="button"
              className="ep-btn ep-btn--cancel"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="ep-btn ep-btn--save"
              disabled={saving}
            >
              {saving ? "Guardando..." : "💾 Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
