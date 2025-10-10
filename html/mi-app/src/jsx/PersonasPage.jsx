import { useEffect, useMemo, useRef, useState } from "react";
import "../css/personas_panel.css";

export default function PersonasPage() {
  const didRun = useRef(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  let cedula
  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    const ctrl = new AbortController();
    setLoading(true);

    fetch("http://localhost:8000/api/v1/personas", { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(json => {
        const items = Array.isArray(json) ? json : (json.items ?? json.data ?? []);
        setRows(items);
        setError(null);
      })
      .catch(err => {
        if (err.name !== "AbortError") setError(err.message || "Error");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    
    return rows.filter(p => {
      const nombre = (p.nombre || "").toLowerCase();
      const cedula = String(p.documento_identidad || "").toLowerCase();
      const correo = (p.correo || "").toLowerCase();
      const unidad = (p.unidad || "").toLowerCase();
      return nombre.includes(t) || cedula.includes(t) || correo.includes(t) || unidad.includes(t);
    });
  }, [q, rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  const onPrev = () => setPage(p => Math.max(1, p - 1));
  const onNext = () => setPage(p => Math.min(totalPages, p + 1));

  return (
    <div className="pp-screen">
      <div className="pp-card">
        <h1 className="pp-title">Personas</h1>

        <div className="pp-toolbar">
          <div className="pp-search">
            <span className="pp-search__icon" aria-hidden>🔍</span>
            <input
              className="pp-search__input"
              placeholder="Buscar por nombre, cédula, correo o unidad…"
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <span className="pp-count">{filtered.length} resultados</span>
        </div>

        {loading && <div className="pp-state">Cargando…</div>}
        {error && !loading && <div className="pp-state pp-state--error">Error: {error}</div>}

        {!loading && !error && (
          <>
            <div className="pp-tablewrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Cédula</th>
                    <th>Nombre</th>
                    <th>Unidad</th>
                    <th>Empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((p, i) => (
                    <tr key={p.id ?? p.cedula ?? i}>
                      <td>{p.tipo_documento + p.documento_identidad || "—"}</td>
                      <td>{p.nombre ?? "—"}</td>
                      <td>{p.unidad ?? "—"}</td>
                      <td>{p.empresa ?? "—"}</td>
                    </tr>
                  ))}
                  {slice.length === 0 && (
                    <tr>
                      <td colSpan={4} className="pp-empty">Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pp-pagination">
              <button className="pp-btn" onClick={onPrev} disabled={pageSafe === 1}>Anterior</button>
              <span className="pp-page">{pageSafe} / {totalPages}</span>
              <button className="pp-btn" onClick={onNext} disabled={pageSafe === totalPages}>Siguiente</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
