// src/jsx/AccesosPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";

const API_BASE = "http://localhost:8000/api/v1/visitas";
const PAGE_SIZE = 10;

export default function AccesosPage() {
  const didMount = useRef(false);
  const navigate = useNavigate();
  const { token, isAdmin, isOperatorOrAbove, handleApiError } = useAuth();

  // Datos de tabla
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros (estado por id y actividad por id)
  const [estadoId, setEstadoId] = useState("");
  const [tipoActividadId, setTipoActividadId] = useState("");
  const [q, setQ] = useState("");

  // Catálogo de actividades
  const [tiposActividad, setTiposActividad] = useState([]);

  // Estado UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar catálogo de tipos de actividad desde /visitas/tipo_actividad
  useEffect(() => {
    if (!token) return;

    const ctrl = new AbortController();

    fetch(`${API_BASE}/tipo_actividad`, {
      signal: ctrl.signal,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) {
            handleApiError({ status: 401 });
            return;
          }
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((json) => {
        if (Array.isArray(json)) {
          setTiposActividad(json);
        } else {
          setTiposActividad([]);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error cargando tipos de actividad:", err);
        }
      });

    return () => ctrl.abort();
  }, [token, handleApiError]);

  // Cargar visitas desde backend (usa skip/limit)
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

    // Filtro de estado por id_estado (estado_id en query)
    if (estadoId) {
      params.append("estado_id", String(estadoId));
    }

    // Filtro de tipo de actividad
    if (tipoActividadId) {
      params.append("tipo_actividad_id", String(tipoActividadId));
    }

    fetch(`${API_BASE}?${params.toString()}`, {
      signal: ctrl.signal,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) {
            handleApiError({ status: 401 });
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
  }, [page, estadoId, tipoActividadId, token, handleApiError]);

  // Filtro rápido local
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((v) => {
      const persona = v.persona?.nombre || "";
      const cedula = v.persona?.documento_identidad || "";
      const empresa = v.persona?.empresa || "";
      const unidad = v.persona?.unidad || "";
      const estado = v.estado?.nombre_estado || v.estado?.nombre || v.estado?.estado || "";
      const actividad = v.actividad?.nombre_actividad || v.actividad?.id_tipo_actividad || "";
      const centro = v.centro_datos?.nombre || "";
      const asunto = v.asunto || v.descripcion || v.descripcion_actividad || "";
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

  // Handlers de filtros
  const onEstado = (e) => {
    setEstadoId(e.target.value);
    setPage(1);
  };
  const onActividad = (e) => {
    setTipoActividadId(e.target.value);
    setPage(1);
  };

  const goToDetail = (id) => {
    if (!isOperatorOrAbove) {
      setError("Permiso denegado para ver detalles");
      return;
    }
    navigate(`/accesos/${id}`);
  };

  const handleNuevoAcceso = () => {
    if (!isOperatorOrAbove) {
      setError("Permiso denegado para crear accesos");
      return;
    }
    navigate("/accesos/nuevo");
  };

  const handleDelete = (id) => {
    if (!isAdmin) return;
    if (window.confirm("¿Borrar esta visita?")) {
      fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    <div className="max-w-7xl mx-auto">
      <div className="bg-surface rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Accesos / Visitas</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#00378B] focus:border-[#00378B]"
                placeholder="Buscar por persona, cédula, empresa, estado, actividad…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            {/* Filtro por estado (id_estado) */}
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#00378B] focus:border-[#00378B]"
              value={estadoId}
              onChange={onEstado}
            >
              <option value="">Estado: Todos</option>
              <option value="1">Programada</option>
              <option value="2">En curso</option>
              <option value="3">Finalizada</option>
              <option value="4">Cancelada</option>
            </select>

            {/* Filtro por actividad (tipo_actividad_id) */}
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#00378B] focus:border-[#00378B]"
              value={tipoActividadId}
              onChange={onActividad}
            >
              <option value="">Actividad: Todas</option>
              {tiposActividad.map((t) => (
                <option key={t.id_tipo_actividad} value={t.id_tipo_actividad}>
                  {t.nombre_actividad}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">{total} resultados</div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Area
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Centro de Datos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-outline-variant">
                {filtered.map((v, i) => {
                  const persona = v.persona || {};
                  const area = v.area || {};
                  const actividad = v.actividad || {};
                  const cd = v.centro_datos || {};
                  return (
                    <tr
                      key={v.id ?? i}
                      className="hover:bg-surface-variant cursor-pointer"
                      onClick={() => goToDetail(v.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                        {fmtFecha(v.fecha_programada || v.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                        {persona.nombre ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                        {persona.documento_identidad ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                        {persona.empresa ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                        {actividad.nombre_actividad ?? actividad.id_tipo_actividad ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                        {area.nombre ?? area.id ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">
                        {cd.nombre ?? "—"}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button
                              className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                              onClick={() => handleDelete(v.id)}
                              title="Eliminar acceso"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      Sin resultados
                    </td>
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
                disabled={pageSafe === 1}
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
                  Página <span className="font-medium">{pageSafe}</span> de{" "}
                  <span className="font-medium">{pages}</span>
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onPrev}
                    disabled={pageSafe === 1}
                  >
                    <span className="sr-only">Anterior</span>
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {pageSafe}
                  </span>
                  <button
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onNext}
                    disabled={pageSafe === pages}
                  >
                    <span className="sr-only">Siguiente</span>
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
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
