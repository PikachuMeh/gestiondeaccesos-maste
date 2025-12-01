// src/jsx/EditarPersonaPage.jsx - FOTO EN MISMO NIVEL QUE FORMULARIO (COMO ORIGINAL)

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";

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
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {error && (
        <div
          style={{
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            color: "#c33",
            padding: "15px",
            marginBottom: "20px",
            borderRadius: "5px",
          }}
        >
          ❌ {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            backgroundColor: "#efe",
            border: "1px solid #cfc",
            color: "#3c3",
            padding: "15px",
            marginBottom: "20px",
            borderRadius: "5px",
          }}
        >
          ✅ {successMessage}
        </div>
      )}

      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "bold" }}>
          EDITAR PERSONA
        </h1>

        <form onSubmit={handleSubmit}>
          {/* Contenedor principal con 2 columnas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "20px" }}>
            {/* Columna Izquierda - Formulario */}
            <div>
              {/* Información Personal */}
              <div style={{ marginBottom: "30px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px" }}>
                  Información Personal
                </h2>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Apellido
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Cédula
                  </label>
                  <input
                    type="text"
                    value={formData.documento_identidad}
                    disabled
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#f5f5f5",
                      color: "#999",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Correo
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                    required
                  />
                </div>
              </div>

              {/* Información Laboral */}
              <div style={{ marginBottom: "30px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px" }}>
                  Información Laboral
                </h2>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Empresa
                  </label>
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Unidad
                  </label>
                  <input
                    type="text"
                    name="unidad"
                    value={formData.unidad}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              {/* Información Adicional */}
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px" }}>
                  Información Adicional
                </h2>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Dirección
                  </label>
                  <textarea
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    rows="2"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    rows="3"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Columna Derecha - Foto */}
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px" }}>
                Foto del Visitante
              </h2>

              {/* Preview de imagen */}
              <div
                style={{
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  minHeight: "250px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "15px",
                  overflow: "hidden",
                }}
              >
                {previewUrl ? (
                  // Nueva foto seleccionada
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : fotoActual ? (
                  // Foto actual (construcción de URL correcta)
                  console.log("Foto actual:", fotoActual),
                  <img
                    src={getImageUrl(fotoActual)}
                    alt="Foto actual"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300?text=Sin+Foto";
                    }}
                  />
                ) : (
                  // Sin foto
                  <div style={{ textAlign: "center", color: "#999" }}>
                    <div style={{ fontSize: "48px", marginBottom: "10px" }}>📸</div>
                    <p>Sin foto</p>
                  </div>
                )}
              </div>

              {/* Selector de archivo */}
              <div
                style={{
                  border: "2px dashed #ccc",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: "#fafafa",
                  marginBottom: "10px",
                }}
              >
                <input
                  type="file"
                  id="foto"
                  accept="image/*"
                  onChange={handleFotoChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="foto" style={{ cursor: "pointer", display: "block" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
                  <p style={{ fontWeight: "500", margin: "0 0 5px 0" }}>Seleccionar foto</p>
                  <p style={{ fontSize: "12px", color: "#999", margin: 0 }}>
                    Formatos permitidos: JPG, PNG, GIF, WEBP
                  </p>
                  <p style={{ fontSize: "12px", color: "#999", margin: "5px 0 0 0" }}>
                    Tamaño máximo: 5MB
                  </p>
                </label>
              </div>

              {(previewUrl || nuevaFoto) && (
                <button
                  type="button"
                  onClick={handleRemoverFoto}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  🗑️ Eliminar foto
                </button>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "30px" }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: "10px 20px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                opacity: saving ? 0.6 : 1,
              }}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
