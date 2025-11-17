// PersonasPage.jsx (actualizado: con borrado condicional por rol)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // AGREGADO: Para token y checks de rol (ajusta ruta)

const API_BASE = "http://localhost:8000/api/v1/personas";
const PAGE_SIZE = 10;

// Normaliza cédula (sin cambios)
const normDoc = (s) => s.replace(/[^0-9]/g, "");

export default function PersonasPage() {
  const navigate = useNavigate();
  const didMount = useRef(false);

  // AGREGADO: De AuthContext para auth y permisos
  const { token, isSupervisorOrAbove,isOperatorOrAbove } = useAuth();
  const canDelete = isSupervisorOrAbove();  // Solo rol <=2 (SUPERVISOR/ADMIN)
  const canEdit = isOperatorOrAbove(); 

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
    <div className="max-w-7xl mx-auto">
      <div className="bg-surface rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Personas {canDelete ? "(Gestión Completa)" : "(Solo Consulta)"}</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#00378B] focus:border-[#00378B]"
                placeholder="Buscar por nombre, correo o unidad…"
                value={q}
                onChange={(e) => onSearchName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#00378B] focus:border-[#00378B]"
                placeholder="Cédula (ej. V-12345678)"
                value={doc}
                onChange={(e) => onSearchDoc(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          {total} resultados
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">Cargando…</div>
      )}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-surface rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-variant">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Cédula</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Nombre y Apellido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Unidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-outline-variant">
                {rows.map((p, i) => (
                  <tr key={p.id ?? `${p.documento_identidad}-${i}`} className="hover:bg-surface-variant cursor-pointer" onClick={() => onVerPersona(p.id)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                      {p.documento_identidad ? `V-${p.documento_identidad}` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">{p.nombre ?? "—"} {p.apellido}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">{p.unidad ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">{p.empresa ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <>
                            <button
                              className="text-yellow-600 hover:text-yellow-700 p-2 rounded-md hover:bg-yellow-50 transition-colors"
                              onClick={() => onEditarPersona(p.id)}
                              title="Editar persona"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            {canDelete && (
                              <button
                                className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                                onClick={() => handleDeletePersona(p.id, `${p.nombre} ${p.apellido}`)}
                                title="Eliminar persona"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                            {!canDelete && (
                              <span className="text-gray-400 text-sm">Sin acciones</span>
                            )}
                          </>
                        )}
                        {!canEdit && (
                          <span className="text-gray-400 text-sm">Sin acciones</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Sin resultados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface px-4 py-3 flex items-center justify-between border-t border-outline sm:px-6 rounded-b-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onPrev}
                disabled={page === 1}
              >
                Anterior
              </button>
              <button
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                onClick={onNext}
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Página <span className="font-medium">{page}</span> de <span className="font-medium">{pages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onPrev}
                    disabled={page === 1}
                  >
                    <span className="sr-only">Anterior</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {page}
                  </span>
                  <button
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onNext}
                    disabled={page === pages}
                  >
                    <span className="sr-only">Siguiente</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
