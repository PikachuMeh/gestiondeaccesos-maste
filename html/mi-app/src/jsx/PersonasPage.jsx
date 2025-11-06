// PersonasPage.jsx (actualizado: con borrado condicional por rol)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // AGREGADO: Para token y checks de rol (ajusta ruta)
import "../css/personas_panel.css";

const API_BASE = "http://localhost:8000/api/v1/personas";
const PAGE_SIZE = 10;

// Normaliza cédula (sin cambios)
const normDoc = (s) => s.replace(/[^0-9]/g, "");

export default function PersonasPage() {
  const navigate = useNavigate();
  const didMount = useRef(false);

  // AGREGADO: De AuthContext para auth y permisos
  const { token, isSupervisorOrAbove } = useAuth();
  const canDelete = isSupervisorOrAbove();  // Solo rol <=2 (SUPERVISOR/ADMIN)

  // Datos y paginación (sin cambios)
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Búsquedas (sin cambios)
  const [q, setQ] = useState("");
  const [doc, setDoc] = useState("");

  // Estado UI (sin cambios)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce para doc y q (sin cambios)
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

  // Carga de datos (AGREGADO: headers con Authorization si token)
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

    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${API_BASE}?${params.toString()}`, { signal: ctrl.signal, headers })
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
  }, [page, debQ, debDoc, token]);  // AGREGADO: token para re-fetch si cambia sesión

  // Navegación (sin cambios)
  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(pages, p + 1));

  // Handlers de búsqueda (sin cambios)
  const onSearchName = (val) => {
    setQ(val);
    setPage(1);
  };
  const onSearchDoc = (val) => {
    const v = normDoc(val);
    setDoc(v);
    setPage(1);
  };

  // Navegación a detalles (sin cambios)
  const onVerPersona = (id) => {
    navigate(`/personas/${id}`);
  };

  const onEditarPersona = (id) => {
    navigate(`/personas/${id}/editar`);
  };

  // AGREGADO: Handler para borrar persona
  const handleDeletePersona = async (personaId, personaNombre) => {
    if (!canDelete) {
      setError("No tienes permiso para eliminar personas");
      return;
    }
    if (!window.confirm(`¿Eliminar a "${personaNombre}"? Esta acción no se puede deshacer (se eliminará foto si existe).`)) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/${personaId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = errData.detail || `HTTP ${response.status}`;
        if (detail.includes("SENIAT") || detail.includes("visitas")) {
          setError(`No se puede eliminar: ${detail}`);  // Mensajes específicos de backend
        } else if (detail.includes("Rol insuficiente")) {
          setError("Permiso denegado: Solo SUPERVISOR o ADMIN pueden borrar");
        } else {
          setError(`Error: ${detail}`);
        }
        return;
      }
      // Actualiza UI: remueve de la lista
      setRows(prev => prev.filter(p => p.id !== personaId));
      setTotal(prev => Math.max(0, prev - 1));
      setError(null);
      alert("Persona eliminada correctamente");
    } catch (err) {
      setError(`Error eliminando persona: ${err.message}`);
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="pp-screen">
      <div className="pp-card">
        <h1 className="pp-title">Personas {canDelete ? "(Gestión Completa)" : "(Solo Consulta)"}</h1>  {/* AGREGADO: Indica modo */}

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
                    <th>Acciones</th>
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
                      <td>{p.unidad ?? "—"}</td>
                      <td>{p.empresa ?? "—"}</td>
                      <td>
                        <div className="pp-actions">
                          <button
                            className="pp-action-btn pp-action-btn--view"
                            onClick={() => onVerPersona(p.id)}
                            title="Ver detalles"
                          >
                            👁️ Ver
                          </button>
                          {canDelete && (  // AGREGADO: Solo si permiso (SUPERVISOR/ADMIN)
                            <>
                              <button
                                className="pp-action-btn pp-action-btn--edit"
                                onClick={() => onEditarPersona(p.id)}
                                title="Editar persona"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                className="pp-action-btn pp-action-btn--delete"  // AGREGADO: Nuevo botón
                                onClick={() => handleDeletePersona(p.id, `${p.nombre} ${p.apellido}`)}
                                title="Eliminar persona"
                              >
                                🗑️ Borrar
                              </button>
                            </>
                          )}
                          {!canDelete && (  // Fallback para OPERADOR/AUDITOR
                            <span className="pp-no-permission" title="Solo SUPERVISOR/ADMIN pueden editar/borrar">
                              Sin acciones
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="pp-empty">Sin resultados</td>
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
