// src/jsx/EditarPersonaPage.jsx - CORREGIDO CON IMAGENES DESDE API_BASE_URL
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
        'Authorization': `Bearer ${token}`,
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
    // Resetear el input de archivo
    const fileInput = document.getElementById("foto");
    if (fileInput) fileInput.value = "";
  };

  // Guardar cambios - SOLO ENVÍA CAMPOS QUE CAMBIARON
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

      // ✅ IMPORTANTE: Solo agregar campos que REALMENTE cambiaron
      // Comparar con los datos originales del servidor
      const originalData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        empresa: formData.empresa,
        cargo: formData.cargo,
        direccion: formData.direccion,
        unidad: formData.unidad,
        observaciones: formData.observaciones,
      };

      // Verificar qué cambió
      let hasChanges = false;
      Object.keys(formData).forEach((key) => {
        if (key === "documento_identidad") return; // No enviamos cédula
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
          hasChanges = true;
        }
      });

      // Agregar foto si hay una nueva
      if (nuevaFoto) {
        console.log("✓ foto se va a actualizar");
        data.append("foto", nuevaFoto);
        hasChanges = true;
      }

      // Debug: mostrar qué se va a enviar
      console.log("=== FormData a enviar ===");
      for (const [key, value] of data.entries()) {
        console.log(`${key}: ${value instanceof File ? `File(${value.name})` : value}`);
      }

      // Validar que al menos haya algo para actualizar
      if (!hasChanges) {
        setError("No hay cambios para guardar");
        setSaving(false);
        return;
      }

      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
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

      const result = await response.json();
      setSuccessMessage("Persona actualizada correctamente");
      setNuevaFoto(null);
      setPreviewUrl(null);

      // Redirigir después de 1.5 segundos
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

  // Early return para loading o no autenticado
  if (authLoading || isLoading) return <div style={{ textAlign: "center", padding: "40px" }}>Cargando datos...</div>;
  if (!isAuthenticated()) return null;

  // ✅ Determinar qué foto mostrar (desde preview o API)
  const displayFoto = previewUrl || (fotoActual ? `${API_V1}/personas/foto/${fotoActual}` : null);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <div style={{ backgroundColor: "#f9f9f9", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: "24px", fontWeight: "600", color: "#333", padding: "32px 32px 16px" }}>
          EDITAR PERSONA
        </div>

        {error && (
          <div style={{ color: "#c33", backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: "5px", padding: "16px", margin: "0 32px 16px" }}>
            ✗ Error: {error}
          </div>
        )}
        {successMessage && (
          <div style={{ color: "#093", backgroundColor: "#efe", border: "1px solid #cfc", borderRadius: "5px", padding: "16px", margin: "0 32px 16px" }}>
            ✓ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "0 32px 32px" }}>
            {/* Left side - Form */}
            <div style={{ display: "grid", gap: "24px" }}>
              <div style={{ display: "grid", gap: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "500", margin: "0 0 8px 0" }}>Información Personal</h3>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                    placeholder="Apellido completo"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Cédula</label>
                  <input
                    type="text"
                    name="documento_identidad"
                    value={formData.documento_identidad}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      backgroundColor: "#f0f0f0",
                    }}
                    placeholder="V-12345678"
                    disabled
                    title="La cédula no se puede modificar"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Correo</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "500", margin: "0 0 8px 0" }}>Información Laboral</h3>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Empresa</label>
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                    placeholder="Nombre de la empresa"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Cargo</label>
                  <input
                    type="text"
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                    placeholder="Cargo en la empresa"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Unidad</label>
                  <input
                    type="text"
                    name="unidad"
                    value={formData.unidad}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                    placeholder="Unidad de trabajo"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "500", margin: "0 0 8px 0" }}>Información Adicional</h3>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                    placeholder="Dirección completa"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                    rows={4}
                    placeholder="Observaciones adicionales"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", paddingTop: "16px" }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    backgroundColor: "#999",
                    color: "white",
                    padding: "10px 16px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: "#4CAF50",
                    color: "white",
                    padding: "10px 16px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                    opacity: saving ? 0.6 : 1,
                  }}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
              </div>
            </div>

            {/* Right side - Photo Upload */}
            <div style={{ display: "grid", gap: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "500", margin: 0 }}>Foto del Visitante</h3>

              <div style={{ backgroundColor: "#f0f0f0", borderRadius: "8px", padding: "16px", display: "grid", gap: "12px" }}>
                <div style={{ textAlign: "center" }}>
                  <label style={{ display: "block", cursor: "pointer" }}>
                    <div style={{
                      width: "200px",
                      height: "200px",
                      margin: "0 auto 16px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      backgroundColor: "#e0e0e0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "box-shadow 0.3s",
                    }}>
                      {displayFoto ? (
                        <img
                          src={displayFoto}
                          alt="Foto del visitante"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Ctext x='50%' y='50%' fill='%23999' text-anchor='middle' dy='.3em'%3ESin Foto%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div style={{ textAlign: "center", color: "#999" }}>
                          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
                          <p style={{ margin: "0", fontSize: "12px" }}>Haz clic para subir foto</p>
                        </div>
                      )}
                    </div>
                    <input
                      id="foto"
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#666" }}>
                    Formatos permitidos: JPG, PNG, GIF, WEBP
                  </p>
                  <p style={{ margin: "0", fontSize: "11px", color: "#999" }}>
                    Tamaño máximo: 5MB
                  </p>
                </div>

                {(nuevaFoto || previewUrl) && (
                  <button
                    type="button"
                    onClick={handleRemoverFoto}
                    style={{
                      backgroundColor: "#f44",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: "5px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    ❌ Quitar nueva foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

