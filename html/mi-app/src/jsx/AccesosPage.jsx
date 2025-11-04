import { useEffect, useMemo, useRef, useState } from "react";
import "../css/lista_acceso.css";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1/visitas";
const PAGE_SIZE = 10;

export default function VisitasPage() {
  const didMount = useRef(false);
  const navigate = useNavigate();
  // Datos
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [estadoId, setEstadoId] = useState("");        // number | ""
  const [tipoActividadId, setTipoActividadId] = useState(""); // number | ""
  const [personaId, setPersonaId] = useState("");      // number | ""
  const [q, setQ] = useState("");                      // búsqueda rápida local

  // Estado UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar desde backend cuando cambian filtros/página
  useEffect(() => {
    if (!didMount.current) didMount.current = true;

    const ctrl = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
      ...(estadoId ? { estado_id: String(estadoId) } : {}),
      ...(tipoActividadId ? { tipo_actividad_id: String(tipoActividadId) } : {}),
      ...(personaId ? { persona_id: String(personaId) } : {}),
    });

    fetch(`${API_BASE}?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const items = json.items ?? [];
        setRows(items);
        setPages(json.pages ?? 1);
        setTotal(json.total ?? items.length);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "Error");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [page, estadoId, tipoActividadId, personaId]);

  // Filtro rápido local por texto (en campos comunes ya traídos en la página)
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
        persona,
        cedula,
        empresa,
        unidad,
        estado,
        actividad,
        centro,
        asunto,
        fecha,
      ]
        .join(" ")
        .toLowerCase()
        .includes(t);
    });
  }, [q, rows]);

  const pageSafe = Math.min(page, Math.max(1, pages));
  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(pages, p + 1));

  // Handlers de filtros (reinician a página 1)
  const onEstado = (e) => {
    setEstadoId(e.target.value);
    setPage(1);
  };
  const onActividad = (e) => {
    setTipoActividadId(e.target.value);
    setPage(1);
  };
  const onPersona = (e) => {
    setPersonaId(e.target.value);
    setPage(1);
  };

  const goToDetail = (id) => {
    // Ajusta a tu router si tienes vista de detalle
      navigate(`/accesos/${id}`);
    
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
              onChange={(e) => { setQ(e.target.value); }}
            />
          </div>

          <div className="vp-filters">
            <select className="vp-select" value={estadoId} onChange={onEstado}>
              <option value="">Estado: Todos</option>
              <option value="1">Programada</option>
              <option value="2">En curso</option>
              <option value="3">Finalizada</option>
              <option value="4">Cancelada</option>
              {/* Ajusta IDs a tu catálogo real */}
            </select>

            <select className="vp-select" value={tipoActividadId} onChange={onActividad}>
              <option value="">Actividad: Todas</option>
              <option value="1">Mantenimiento</option>
              <option value="2">Instalación</option>
              <option value="3">Auditoría</option>
              {/* Ajusta IDs a tu catálogo real */}
            </select>

            <input
              className="vp-input"
              type="number"
              min="1"
              placeholder="Persona ID"
              value={personaId}
              onChange={onPersona}
            />
          </div>

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
                    <th></th>
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
                          <button className="vp-btn" onClick={() => goToDetail(v.id)}>Ver</button>
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

function fmtFecha(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
