// src/jsx/AccesosPage.jsx - CORREGIDO: Usar 'id' en lugar de 'id_visita'
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { useApi } from "../context/ApiContext";

const PAGE_SIZE = 10;

// ✅ TOAST NOTIFICATIONS
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  return (
    <div
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 z-50`}
    >
      {message}
    </div>
  );
}

// ✅ COMPONENTE MODAL DE CONFIRMACIÓN
function ConfirmDeleteModal({ isOpen, title, message, onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
        {/* Icono */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0-12a9 9 0 110 18 9 9 0 010-18z"
              />
            </svg>
          </div>
        </div>

        {/* Contenido */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{title}</h2>
        <p className="text-gray-600 text-center mb-6">{message}</p>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Borrando...
              </>
            ) : (
              "Sí, borrar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccesosPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/visitas`;

  const navigate = useNavigate();
  const { token, isAdmin, loading: authLoading } = useAuth();

  const didMount = useRef(false);

  // Estado
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tiposActividad, setTiposActividad] = useState([]);

  // Filtros
  const [estadoId, setEstadoId] = useState("");
  const [tipoActividadId, setTipoActividadId] = useState("");
  const [q, setQ] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePersona, setDeletePersona] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // ✅ Cargar tipos de actividad
  useEffect(() => {
    if (!token) return;

    const ctrl = new AbortController();
    fetch(`${API_BASE}/tipo_actividad`, {
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setTiposActividad(Array.isArray(json) ? json : []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("❌ Error cargando tipos de actividad:", err);
        }
      });

    return () => ctrl.abort();
  }, [token, API_BASE]);

  // ✅ Cargar visitas
  useEffect(() => {
    if (!didMount.current) didMount.current = true;

    if (!token) return;

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const skip = (page - 1) * PAGE_SIZE;
    const limit = PAGE_SIZE;

    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    if (estadoId) params.append("estado_id", String(estadoId));
    if (tipoActividadId) params.append("tipo_actividad_id", String(tipoActividadId));

    const url = `${API_BASE}?${params.toString()}`;

    fetch(url, {
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setRows(json.items ?? []);
        setPages(json.pages ?? 1);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("❌ Error cargando visitas:", err);
          setError(err.message || "Error al cargar accesos");
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [page, estadoId, tipoActividadId, token, API_BASE]);

  // ✅ Filtro local
  const filtered = rows.filter((v) => {
    if (!q.trim()) return true;
    const searchText = [
      v.persona?.nombre || "",
      v.persona?.documento_identidad || "",
      v.persona?.empresa || "",
      v.actividad?.nombre_actividad || "",
      v.centro_datos?.nombre || "",
    ]
      .join(" ")
      .toLowerCase();
    return searchText.includes(q.toLowerCase());
  });

  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(pages, p + 1));

  // ✅ ABRIR MODAL - SIMPLE
  const openDeleteModal = (id, nombre) => {
    console.log("📌 openDeleteModal - id:", id, "nombre:", nombre);
    setDeleteTarget(id);
    setDeletePersona(nombre);
    setShowModal(true);
  };

  // ✅ CERRAR MODAL
  const closeModal = () => {
    setShowModal(false);
    setDeleteTarget(null);
    setDeletePersona(null);
    setDeleteLoading(false);
  };

  // ✅ CONFIRMAR Y BORRAR
  const handleConfirmDelete = async () => {
    console.log("🗑️ handleConfirmDelete - deleteTarget:", deleteTarget);

    if (!deleteTarget) {
      console.error("❌ deleteTarget es null/undefined");
      setToast({ message: "❌ Error: ID de visita no válido", type: "error" });
      return;
    }

    console.log("✅ Iniciando DELETE");
    setDeleteLoading(true);

    const deleteUrl = `${API_BASE}/${deleteTarget}`;
    console.log("📍 URL DELETE:", deleteUrl);

    try {
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📊 Respuesta status:", response.status);

      const responseText = await response.text();
      console.log("📊 Respuesta texto:", responseText);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${responseText || "Error desconocido"}`
        );
      }

      console.log("✅ Respuesta exitosa!");

      // ✅ ACTUALIZACIÓN AUTOMÁTICA - ELIMINA LA FILA
      // Usar 'id' en lugar de 'id_visita'
      setRows((prevRows) => {
        const newRows = prevRows.filter((r) => r.id !== deleteTarget);
        console.log("📌 Filas antes:", prevRows.length, "Filas después:", newRows.length);
        return newRows;
      });

      // ✅ Mostrar toast de éxito
      setToast({ message: "✅ Visita eliminada exitosamente", type: "success" });

      // ✅ Cerrar modal
      closeModal();

    } catch (err) {
      console.error("❌ Error al borrar:", err.message);

      // ✅ Mostrar toast de error
      setToast({
        message: `❌ Error: ${err.message}`,
        type: "error",
      });

      setDeleteLoading(false);
    }
  };

  // Esperar a que se cargue la autenticación
  if (authLoading) {
    return <div style={{ padding: "20px" }}>⏳ Cargando autenticación...</div>;
  }

  if (!token) {
    return <div style={{ padding: "20px" }}>❌ No autenticado</div>;
  }

  // Mostrar contenido
  return (
    <div style={{ padding: "20px" }}>
      <h1>📋 Accesos y Visitas</h1>

      {error && (
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "15px",
            border: "1px solid #fcc",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: "8px", flex: 1, minWidth: "200px" }}
        />
        <select
          value={estadoId}
          onChange={(e) => setEstadoId(e.target.value)}
          style={{ padding: "8px" }}
        >
          <option value="">Todos los estados</option>
          <option value="1">Activo</option>
          <option value="2">Inactivo</option>
        </select>
        <select
          value={tipoActividadId}
          onChange={(e) => setTipoActividadId(e.target.value)}
          style={{ padding: "8px" }}
        >
          <option value="">Todos los tipos</option>
          {tiposActividad.map((tipo) => (
            <option key={tipo.id_tipo_actividad} value={tipo.id_tipo_actividad}>
              {tipo.nombre_actividad}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ padding: "20px" }}>⏳ Cargando... ({rows.length} datos)</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "20px" }}>Sin resultados (Total: {rows.length})</div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc", backgroundColor: "#f5f5f5" }}>
                <th style={{ textAlign: "left", padding: "10px" }}>Fecha</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Persona</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Cédula</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Empresa</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Actividad</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Centro</th>
                {isAdmin() && <th style={{ textAlign: "center", padding: "10px" }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  style={{
                    borderBottom: "1px solid #ddd",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <td style={{ padding: "10px" }}>
                    {v.fecha_programada ? v.fecha_programada.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: "10px" }}>{v.persona?.nombre || "—"}</td>
                  <td style={{ padding: "10px" }}>
                    {v.persona?.documento_identidad || "—"}
                  </td>
                  <td style={{ padding: "10px" }}>{v.persona?.empresa || "—"}</td>
                  <td style={{ padding: "10px" }}>
                    {v.actividad?.nombre_actividad || "—"}
                  </td>
                  <td style={{ padding: "10px" }}>{v.centro_datos?.nombre || "—"}</td>
                  {isAdmin() && (
                    <td style={{ textAlign: "center", padding: "10px" }}>
                      <button
                        onClick={() =>
                          openDeleteModal(
                            v.id,
                            `${v.persona?.nombre || "Visitante"} (${v.persona?.documento_identidad})`
                          )
                        }
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#ff6b6b",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = "#ff5252")}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff6b6b")}
                      >
                        🗑️ Borrar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={onPrev}
              disabled={page === 1}
              style={{
                padding: "8px 16px",
                cursor: page === 1 ? "default" : "pointer",
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              ← Anterior
            </button>
            <span style={{ alignSelf: "center" }}>
              Página {page} de {pages}
            </span>
            <button
              onClick={onNext}
              disabled={page === pages}
              style={{
                padding: "8px 16px",
                cursor: page === pages ? "default" : "pointer",
                opacity: page === pages ? 0.5 : 1,
              }}
            >
              Siguiente →
            </button>
          </div>
        </>
      )}

      {/* ✅ MODAL DE CONFIRMACIÓN */}
      <ConfirmDeleteModal
        isOpen={showModal}
        title="Eliminar Visita"
        message={`¿Está seguro de que desea borrar la visita de ${deletePersona}? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={closeModal}
        isLoading={deleteLoading}
      />

      {/* ✅ TOAST NOTIFICATIONS */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
