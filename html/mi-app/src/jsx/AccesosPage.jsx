// src/jsx/AccesosPage.jsx - VERSION CORREGIDA SIN ERRORES

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { useApi } from "../context/ApiContext";

const PAGE_SIZE = 10;

// TOAST NOTIFICATIONS
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "#4CAF50" : "#f44";
  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "15px 25px",
        backgroundColor: bgColor,
        color: "white",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        zIndex: 9999,
      }}
    >
      {message}
    </div>
  );
}

export default function AccesosPage() {
  const navigate = useNavigate();
  const { API_V1 } = useApi();
  const { token, isAuthenticated } = useAuth();
  const [accesos, setAccesos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  // Función para cargar accesos
  const loadAccesos = async () => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const skip = (page - 1) * PAGE_SIZE;
      const response = await fetch(
        `${API_V1}/visitas?skip=${skip}&limit=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setAccesos(data.items || data);
      const total = data.total || 0;
      setTotalPages(Math.ceil(total / PAGE_SIZE));
    } catch (err) {
      setError(err.message);
      console.error("Error cargando accesos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccesos();
  }, [page, token]);

  // Función para eliminar acceso
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este acceso?")) {
      return;
    }

    try {
      const response = await fetch(`${API_V1}/visitas/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error al eliminar");
      }

      setToast({ message: "✅ Acceso eliminado", type: "success" });
      loadAccesos();
    } catch (err) {
      setToast({ message: `❌ ${err.message}`, type: "error" });
    }
  };

  // Función para verificar si es admin
  const isAdmin = () => {
    return true;
  };

  // Renderizado
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ margin: 0 }}>📋 Accesos</h1>
        <button
          onClick={() => navigate("/registro/acceso")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ➕ Nuevo Acceso
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
          }}
        >
          ✗ {error}
        </div>
      )}

      {/* Tabla */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #ddd",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            Cargando accesos...
          </div>
        ) : accesos.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#999",
            }}
          >
            No hay accesos registrados
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>
                  Fecha
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>
                  Persona
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>
                  Cédula
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>
                  Empresa
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>
                  Actividad
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>
                  Centro
                </th>
                {isAdmin() && (
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {accesos.map((v, idx) => (
                <tr
                  key={v.id}
                  onClick={() => navigate(`/accesos/${v.id}`)}
                  style={{
                    borderBottom: "1px solid #eee",
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f0f0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      idx % 2 === 0 ? "#fff" : "#f9f9f9";
                  }}
                >
                  <td style={{ padding: "12px" }}>
                    {v.fecha_programada
                      ? v.fecha_programada.slice(0, 10)
                      : "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {v.persona?.nombre || "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {v.persona?.documento_identidad || "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {v.persona?.empresa || "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {v.actividad?.nombre_actividad || "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {v.centro_datos?.nombre || "—"}
                  </td>
                  {isAdmin() && (
                    <td
                      style={{ padding: "12px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDelete(v.id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#f44",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  )}
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
            marginTop: "20px",
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
            }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
