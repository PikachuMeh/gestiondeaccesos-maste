// src/jsx/DetalleAccesoPage.jsx - Ver historial de accesos de una persona

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { useApi } from "../context/ApiContext";

export default function DetalleAccesoPage() {
  const { persona_id } = useParams(); // ID de la persona
  const { API_V1 } = useApi();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [accesos, setAccesos] = useState([]);
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  // Cargar información de la persona
  useEffect(() => {
    if (!token || !persona_id) {
      setError("No autenticado o ID inválido");
      setLoading(false);
      return;
    }

    const fetchPersona = async () => {
      try {
        const resp = await fetch(`${API_V1}/personas/${persona_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!resp.ok) {
          throw new Error(`Error: ${resp.status}`);
        }

        const data = await resp.json();
        setPersona(data);
      } catch (err) {
        console.error("Error cargando persona:", err);
        setError(err.message);
      }
    };

    fetchPersona();
  }, [persona_id, token, API_V1]);

  // Cargar historial de accesos
  useEffect(() => {
    if (!token || !persona_id) return;

    const fetchAccesos = async () => {
      try {
        setLoading(true);
        const skip = (page - 1) * PAGE_SIZE;
        
        // ✅ Endpoint para obtener visitas de una persona
        const resp = await fetch(
          `${API_V1}/visitas?persona_id=${persona_id}&skip=${skip}&limit=${PAGE_SIZE}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!resp.ok) {
          throw new Error(`Error: ${resp.status}`);
        }

        const data = await resp.json();
        setAccesos(data.items || data); // Adaptarse a la estructura de tu API
        
        // Calcular páginas totales
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / PAGE_SIZE));
        
        setError(null);
      } catch (err) {
        console.error("Error cargando accesos:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccesos();
  }, [persona_id, token, page, API_V1]);

  const handleBack = () => {
    navigate("/accesos");
  };

  const handleVerDetalles = (visitaId) => {
    navigate(`/accesos/${visitaId}`);
  };

  if (loading && !persona) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Cargando historial...</p>
      </div>
    );
  }

  if (error && !persona) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "15px",
          }}
        >
          ✗ {error}
        </div>
        <button
          onClick={handleBack}
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

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 10px 0" }}>Historial de Accesos</h1>
          {persona && (
            <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>
              <strong>{persona.nombre} {persona.apellido}</strong> - Cédula: {persona.documento_identidad}
            </p>
          )}
        </div>
        <button
          onClick={handleBack}
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

      {/* Error */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
            border: "1px solid #fcc",
          }}
        >
          ✗ {error}
        </div>
      )}

      {/* Tabla de accesos */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          border: "1px solid #ddd",
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <p>Cargando accesos...</p>
          </div>
        ) : accesos.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
            <p>No hay registros de acceso para esta persona</p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f5f5f5",
                  borderBottom: "2px solid #ddd",
                }}
              >
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Fecha Programada
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Actividad
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Centro de Datos
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Área(s)
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Estado
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {accesos.map((acceso, idx) => (
                <tr
                  key={acceso.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                  }}
                >
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    {acceso.fecha_programada
                      ? new Date(acceso.fecha_programada).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    {acceso.actividad?.nombre_actividad || "—"}
                  </td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    {acceso.centro_datos?.nombre || "—"}
                  </td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    {acceso.area?.nombre || "—"}
                  </td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          acceso.estado?.nombre_estado === "Completado"
                            ? "#d4edda"
                            : acceso.estado?.nombre_estado === "Pendiente"
                            ? "#fff3cd"
                            : "#f8d7da",
                        color:
                          acceso.estado?.nombre_estado === "Completado"
                            ? "#155724"
                            : acceso.estado?.nombre_estado === "Pendiente"
                            ? "#856404"
                            : "#721c24",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {acceso.estado?.nombre_estado || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() => handleVerDetalles(acceso.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginTop: "30px",
          }}
        >
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: "8px 16px",
              backgroundColor: page === 1 ? "#ccc" : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            ← Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: "8px 12px",
                backgroundColor: page === p ? "#2196F3" : "#f0f0f0",
                color: page === p ? "white" : "#333",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: page === p ? "bold" : "normal",
              }}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              padding: "8px 16px",
              backgroundColor: page === totalPages ? "#ccc" : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Info */}
      <div style={{ textAlign: "center", marginTop: "30px", color: "#666" }}>
        <p>
          Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong>
          {accesos.length > 0 && ` • Total de registros: ${accesos.length * totalPages}`}
        </p>
      </div>
    </div>
  );
}
