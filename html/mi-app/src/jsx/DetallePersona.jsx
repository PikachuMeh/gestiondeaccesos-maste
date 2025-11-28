// src/jsx/DetallePersonaPage.jsx - CORREGIDO CON IMAGENES DESDE API_BASE_URL
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";

export default function DetallePersonaPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/personas`;

  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      setError("Sesión expirada. Redirigiendo a login...");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    fetch(`${API_BASE}/${id}`, {
      signal: ctrl.signal,
      headers,
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error("Acceso denegado: Verifica tu sesión.");
          if (r.status === 401) throw new Error("No autenticado: Redirigiendo...");
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setPersona)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar la persona");
          if (
            err.message.includes("No autenticado") ||
            err.message.includes("Acceso denegado")
          ) {
            setTimeout(() => navigate("/login"), 2000);
          }
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [id, token, isAuthenticated, navigate]);

  // Estados de carga
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Cargando persona...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "15px",
            border: "1px solid #fcc",
          }}
        >
          ✗ {error}
        </div>
        <button
          onClick={() => navigate("/personas")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#999",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!persona) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Persona no encontrada</p>
      </div>
    );
  }

  // ✅ Construir URL de foto desde API_V1 (igual que en LoginPage)
  // persona.foto contiene el filename de la foto
  const fotoUrl = persona.foto ? `${API_V1}/personas/foto/${persona.foto}` : null;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1 style={{ margin: 0 }}>Detalle de Persona</h1>
        <button
          onClick={() => navigate("/personas")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#999",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Contenedor principal - Grid 2 columnas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "30px",
          alignItems: "start",
        }}
      >

        {/* ===== COLUMNA IZQUIERDA - FOTO ===== */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "15px",
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>
            Foto de Identificación
          </h3>

          {/* Foto - Mostrar desde API o placeholder */}
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={`${persona.nombre} ${persona.apellido}`}
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "2px solid #ccc",
              }}
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Ctext x='50%' y='50%' fill='%23999' text-anchor='middle' dy='.3em'%3ESin Foto%3C/text%3E%3C/svg%3E";
              }}
            />
          ) : (
            <div
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "10px",
                backgroundColor: "#e0e0e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #ccc",
                color: "#999",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Sin foto
            </div>
          )}

          {/* Nombre visible bajo la foto */}
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>
              {persona.nombre} {persona.apellido}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#666" }}>
              {persona.cargo || "Sin cargo"}
            </p>
          </div>
        </div>

        {/* ===== COLUMNA DERECHA - INFORMACIÓN ===== */}
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          <div style={{ display: "grid", gap: "15px" }}>
            {/* Fila 1 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Documento de Identidad:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                V-{persona.documento_identidad || "N/A"}
              </p>
            </div>

            {/* Fila 2 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Email:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.email || "N/A"}
              </p>
            </div>

            {/* Fila 3 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Empresa:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.empresa || "N/A"}
              </p>
            </div>

            {/* Fila 4 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Cargo:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.cargo || "N/A"}
              </p>
            </div>

            {/* Fila 5 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Dirección:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.direccion || "N/A"}
              </p>
            </div>

            {/* Fila 6 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Unidad:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.unidad || "N/A"}
              </p>
            </div>

            {/* Fila 7 - Observaciones (full width) */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Observaciones:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.observaciones || "N/A"}
              </p>
            </div>

            {/* Fila 8 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Fecha de Creación:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.fecha_creacion
                  ? new Date(persona.fecha_creacion).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>

            {/* Fila 9 */}
            <div>
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Última Actualización:
              </p>
              <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {persona.fecha_actualizacion
                  ? new Date(persona.fecha_actualizacion).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "30px",
          justifyContent: "flex-start",
        }}
      >
        <button
          onClick={() => navigate(`/personas/${id}/editar`)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          ✏️ Editar
        </button>

        {isAuthenticated() && (
          <button
            onClick={() => navigate(`/accesos?persona=${id}`)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            📋 Ver Accesos
          </button>
        )}
      </div>
    </div>
  );
}

