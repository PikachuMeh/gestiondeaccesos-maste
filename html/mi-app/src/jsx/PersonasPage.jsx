import { useEffect, useRef, useState } from "react";
import "../css/personas_panel.css";

const API_BASE = "http://localhost:8000/api/v1/personas";
const PAGE_SIZE = 10;

// Normaliza cédula (elimina prefijos y separadores, deja solo dígitos)
const normDoc = (s) => s.replace(/[^0-9]/g, "");

export default function PersonasPage() {
  const didMount = useRef(false);

  // Datos y paginación
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Búsquedas
  const [q, setQ] = useState("");          // nombre/unidad/correo (según tu backend)
  const [doc, setDoc] = useState("");      // cédula normalizada

  // Estado UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce para doc y q
  const [debQ, setDebQ] = useState(q);
  const [debDoc, setDebDoc] = useState(doc);
  
  useEffect(() => {
    const id = setTimeout(() => setDebQ(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const id = setTimeout(() => setDebDoc(doc), 300);
    return () => clearTimeout(id);
  }, [doc]);

  // Carga de datos cuando cambian page o los filtros con debounce
  useEffect(() => {
    if (!didMount.current) didMount.current = true;

    const ctrl = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
      ...(debQ.trim() ? { nombre: debQ.trim() } : {}),
      ...(debDoc.trim() ? { documento: debDoc.trim() } : {}),
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
  }, [page, debQ, debDoc]);

  // Navegación
  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(pages, p + 1));

  // Handlers de búsqueda
  const onSearchName = (val) => {
    setQ(val);
    setPage(1);
  };
  const onSearchDoc = (val) => {
    const v = normDoc(val);
    setDoc(v);
    setPage(1);
  };

  return (
    <div className="pp-screen">
      <div className="pp-card">
        <h1 className="pp-title">Personas</h1>

        <div className="pp-toolbar">
          <div className="pp-search">
            <span className="pp-search__icon" aria-hidden>🔍</span>
            <input
              className="pp-search__input"
              placeholder="Buscar por nombre, correo o unidad…"
              value={q}
              onChange={(e) => onSearchName(e.target.value)}
            />
          </div>

          <div className="pp-search">
            <span className="pp-search__icon" aria-hidden>🪪</span>
            <input
              className="pp-search__input"
              placeholder="Cédula (ej. V-12345678)"
              value={doc}
              onChange={(e) => onSearchDoc(e.target.value)}
            />
          </div>

          <span className="pp-count">{total} resultados</span>
        </div>

        {loading && <div className="pp-state">Cargando…</div>}
        {error && !loading && (
          <div className="pp-state pp-state--error">Error: {error}</div>
        )}

        {!loading && !error && (
          <>
            <div className="pp-tablewrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Cédula</th>
                    <th>Nombre y Apellido</th>
                    <th>Unidad</th>
                    <th>Empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr key={p.id ?? `${p.documento_identidad}-${i}`}>
                      <td>
                        {p.documento_identidad
                          ? `V-${p.documento_identidad}`
                          : "—"}
                      </td>
                      <td>{p.nombre ?? "—"} {p.apellido}</td>
                      <td>{p.departamento ?? "—"}</td>
                      <td>{p.empresa ?? "—"}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="pp-empty">Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pp-pagination">
              <button className="pp-btn" onClick={onPrev} disabled={page === 1}>
                Anterior  
              </button>
              <span className="pp-page">
                {page} / {pages}
              </span>
              <button
                className="pp-btn"
                onClick={onNext}
                disabled={page === pages}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
