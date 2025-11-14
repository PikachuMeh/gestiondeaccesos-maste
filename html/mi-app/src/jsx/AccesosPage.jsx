import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // Ajusta ruta si necesario
import "../css/lista_acceso.css";

const API_BASE = "http://localhost:8000/api/v1/visitas";
const PAGE_SIZE = 10;

export default function AccesosPage() {
  const didMount = useRef(false);
  const navigate = useNavigate();
  const { token, isAdmin, isOperatorOrAbove, handleApiError } = useAuth();

  // Datos
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [estadoId, setEstadoId] = useState("");
  const [tipoActividadId, setTipoActividadId] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [q, setQ] = useState("");

  // Estado UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar desde backend
  useEffect(() => {
    if (!didMount.current) didMount.current = true;
    if (!token) return;  // ProtectedRoute maneja esto

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
      ...(estadoId ? { estado_id: String(estadoId) } : {}),
      ...(tipoActividadId ? { tipo_actividad_id: String(tipoActividadId) } : {}),
      ...(personaId ? { persona_id: String(personaId) } : {}),
    });

    fetch(`${API_BASE}?${params.toString()}`, {
      signal: ctrl.signal,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) {
            handleApiError({ status: 401 });  // Trigger logout y redirect
            return;
          }
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((json) => {
        const items = json.items ?? [];
        setRows(items);
        setPages(json.pages ?? 1);
        setTotal(json.total ?? items.length);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          if (err.message.includes("401")) {
            handleApiError({ status: 401 });
          } else {
            setError(err.message || "Error al cargar accesos");
          }
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [page, estadoId, tipoActividadId, personaId, token, handleApiError, navigate]);

  // Filtro rápido
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((v) => {
      const persona = v.persona?.nombre || "";
      const cedula = v.persona?.documento_identidad || "";
      const empresa = v.persona?.empresa || "";
      const unidad = v.persona?.unidad || "";
      const estado = v.estado?.nombre || v.estado?.estado || "";
      const actividad = v.actividad?.nombre || v.actividad?.tipo || "";
      const centro = v.centro_datos?.nombre || "";
      const asunto = v.asunto || v.descripcion || "";
      const fecha = v.fecha_programada || v.fecha || "";
      return [
        persona, cedula, empresa, unidad, estado, actividad, centro, asunto, fecha
      ].join(" ").toLowerCase().includes(t);
    });
  }, [q, rows]);

  const pageSafe = Math.min(page, Math.max(1, pages));
  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(pages, p + 1));

  // Handlers de filtros
  const onEstado = (e) => { setEstadoId(e.target.value); setPage(1); };
  const onActividad = (e) => { setTipoActividadId(e.target.value); setPage(1); };
  const onPersona = (e) => { setPersonaId(e.target.value); setPage(1); };

  // Verifica rol antes de navegar
  const goToDetail = (id) => {
    if (!isOperatorOrAbove) {
      setError("Permiso denegado para ver detalles");
      return;
    }
    navigate(`/accesos/${id}`);
  };

  // Botón para nuevo acceso
  const handleNuevoAcceso = () => {
    if (!isOperatorOrAbove) {
      setError("Permiso denegado para crear accesos");
      return;
    }
    navigate("/accesos/nuevo");
  };

  // Handler para borrado (solo admin)
  const handleDelete = (id) => {
    if (!isAdmin) return;
    if (window.confirm("¿Borrar esta visita?")) {
      fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then((r) => {
          if (!r.ok) {
            if (r.status === 401) {
              handleApiError({ status: 401 });
              return;
            }
            throw new Error(`HTTP ${r.status}`);
          }
          return r;
        })
        .then(() => setPage(1))
        .catch((err) => {
          if (err.message.includes("401")) {
            handleApiError({ status: 401 });
          } else {
            setError("Error al borrar");
          }
        });
    }
  };

  return (
    <div className="vp-screen">
      <div className="vp-card">
        <h1 className="vp-title">Accesos / Visitas</h1>

        <div className="vp-toolbar">
          <div className="vp-search">
            <span className="vp-search__icon" aria-hidden>🔎</span>
            <input
              className="vp-search__input"
              placeholder="Buscar por persona, cédula, empresa, estado, actividad…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="vp-filters">
            <select className="vp-select" value={estadoId} onChange={onEstado}>
              <option value="">Estado: Todos</option>
              <option value="1">Programada</option>
              <option value="2">En curso</option>
              <option value="3">Finalizada</option>
              <option value="4">Cancelada</option>
            </select>

            <select className="vp-select" value={tipoActividadId} onChange={onActividad}>
              <option value="">Actividad: Todas</option>
              <option value="1">Mantenimiento</option>
              <option value="2">Instalación</option>
              <option value="3">Auditoría</option>
            </select>
          </div>

          {isOperatorOrAbove && (
            <button className="btn btn--success" onClick={handleNuevoAcceso}>
              Nuevo Acceso
            </button>
          )}

          <span className="vp-count">{total} resultados</span>
        </div>

        {loading && <div className="vp-state">Cargando…</div>}
        {error && !loading && <div className="vp-state vp-state--err">Error: {error}</div>}

        {!loading && !error && (
          <>
            <div className="vp-tablewrap">
              <table className="vp-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Persona</th>
                    <th>Cédula</th>
                    <th>Empresa</th>
                    <th>Actividad</th>
                    <th>Area</th>
                    <th>Centro de Datos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => {
                    const persona = v.persona || {};
                    const area = v.area || {};
                    const actividad = v.actividad || {};
                    const cd = v.centro_datos || {};
                    return (
                      <tr key={v.id ?? i}>
                        <td>{fmtFecha(v.fecha_programada || v.fecha)}</td>
                        <td>{persona.nombre ?? "—"}</td>
                        <td>{persona.documento_identidad ?? "—"}</td>
                        <td>{persona.empresa ?? "—"}</td>
                        <td>{actividad.nombre_actividad ?? actividad.id_tipo_actividad ?? "—"}</td>
                        <td>{area.nombre ?? area.id ?? "—"}</td>
                        <td>{cd.nombre ?? "—"}</td>
                        <td>
                          {isOperatorOrAbove && (
                            <button className="vp-btn" onClick={() => goToDetail(v.id)}>
                              Ver
                            </button>
                          )}
                          {isAdmin && (
                            <button className="vp-btn vp-btn--delete" onClick={() => handleDelete(v.id)}>
                              Borrar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="vp-empty">Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="vp-pagination">
              <button className="vp-btn" onClick={onPrev} disabled={pageSafe === 1}>Anterior</button>
              <span className="vp-page">{pageSafe} / {pages}</span>
              <button className="vp-btn" onClick={onNext} disabled={pageSafe === pages}>Siguiente</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Función auxiliar para formatear fecha
function fmtFecha(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
