import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import {
  FaHistory,
  FaFilter,
  FaEraser,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaSearch,
  FaCalendarAlt,
  FaTable,
  FaUser
} from "react-icons/fa";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 400;

// Acciones disponibles (normalizar búsqueda)
const ACCIONES_DISPONIBLES = [
  { value: "crear", label: "Crear" },
  { value: "editar", label: "Editar" },
  { value: "borrar", label: "Borrar" },
  { value: "consultar", label: "Consultar" },
  { value: "ingreso", label: "Ingreso (Visita)" },
  { value: "salida", label: "Salida (Visita)" },
];

// Funciones helper memoizadas (fuera del componente para no recrearse)
const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getAccionDisplay = (realizado) => {
  if (!realizado) return "N/A";
  const r = realizado.toLowerCase();
  if (r.includes("borrar") || r.includes("delete")) return "Borrado";
  if (r.includes("crear") || r.includes("create")) return "Creación";
  if (r.includes("editar") || r.includes("update")) return "Edición";
  if (r.includes("consultar") || r.includes("get")) return "Consulta";
  if (r.includes("ingreso")) return "Ingreso";
  if (r.includes("salida")) return "Salida";
  return realizado.charAt(0).toUpperCase() + realizado.slice(1);
};

const getAccionClass = (realizado) => {
  const r = realizado?.toLowerCase() || "";
  if (r.includes("borrar") || r.includes("delete"))
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-800";
  if (r.includes("crear") || r.includes("create"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-800";
  if (r.includes("editar") || r.includes("update"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-800";
  if (r.includes("consultar") || r.includes("get"))
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800";
  if (r.includes("ingreso"))
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-800";
  if (r.includes("salida"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-800";
  return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600";
};

const getEntidadDisplay = (tabla) => {
  if (!tabla) return "N/A";
  const entities = {
    usuarios: "Usuarios",
    personas: "Personas",
    visitas: "Visitas",
    centros_datos: "Centros de datos",
    control: "Auditoría",
  };
  return entities[tabla] || tabla.charAt(0).toUpperCase() + tabla.slice(1);
};

const buildHumanMessage = (log) => {
  const { realizado, tabla_afectada, registro_id, detalles, usuario } = log || {};
  const actor = usuario?.username || "Usuario desconocido";

  let parsed = null;
  if (detalles && typeof detalles === "string") {
    try {
      parsed = JSON.parse(detalles);
    } catch {
      // ignorar
    }
  } else if (typeof detalles === "object" && detalles !== null) {
    parsed = detalles;
  }

  const entityName = getEntidadDisplay(tabla_afectada);
  let sujeto = "";

  if (parsed?.usuario_afectado) {
    const u = parsed.usuario_afectado;
    sujeto = `${u.nombre_completo || u.username || "usuario"} (ID ${u.id ?? "?"})`;
  } else if (parsed?.entidad) {
    const e = parsed.entidad;
    sujeto = `${e.nombre || e.descripcion || entityName} (ID ${registro_id ?? e.id ?? "?"})`;
  } else if (registro_id) {
    sujeto = `${entityName} con ID ${registro_id}`;
  } else {
    sujeto = entityName;
  }

  const r = (realizado || "").toLowerCase();

  if (tabla_afectada === "usuarios") {
    if (r.includes("crear"))
      return `${actor} creó el usuario ${sujeto}.`;
    if (r.includes("editar") || r.includes("update"))
      return `${actor} actualizó los datos del usuario ${sujeto}.`;
    if (r.includes("borrar") || r.includes("delete") || r.includes("desactivar"))
      return `${actor} eliminó o desactivó al usuario ${sujeto}.`;
  }

  if (tabla_afectada === "personas") {
    if (r.includes("crear"))
      return `${actor} registró la persona ${sujeto}.`;
    if (r.includes("editar") || r.includes("update"))
      return `${actor} modificó los datos de la persona ${sujeto}.`;
    if (r.includes("borrar") || r.includes("delete"))
      return `${actor} eliminó el registro de la persona ${sujeto}.`;
  }

  if (tabla_afectada === "visitas") {
    if (r.includes("crear"))
      return `${actor} creó un nuevo acceso/visita para ${sujeto}.`;
    if (r.includes("editar") || r.includes("update"))
      return `${actor} modificó la visita asociada a ${sujeto}.`;
    if (r.includes("borrar") || r.includes("delete"))
      return `${actor} eliminó la visita de ${sujeto}.`;
    if (r.includes("ingreso"))
      return `${actor} registró el ingreso de la visita ${sujeto}.`;
    if (r.includes("salida"))
      return `${actor} registró la salida de la visita ${sujeto}.`;
  }

  const accionLabel = getAccionDisplay(realizado);
  if (accionLabel === "Consulta") {
    return `${actor} consultó información de ${sujeto}.`;
  }

  return `${actor} realizó una acción de ${accionLabel.toLowerCase()} sobre ${sujeto}.`;
};

export default function AuditPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/audit/logs`;
  const navigate = useNavigate();
  const { token } = useAuth();

  const didMount = useRef(false);
  const debounceTimer = useRef(null);

  // Estados
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateError, setDateError] = useState("");

  // Filtros (SIN usuario_id)
  const [realizado, setRealizado] = useState("");
  const [tablaAfectada, setTablaAfectada] = useState("");
  const [actorUsername, setActorUsername] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Validar fechas con useCallback para evitar recreaciones
  const validateDates = useCallback(
    (from, to) => {
      let msg = "";
      if (to && to > todayStr) {
        msg = "La fecha 'hasta' no puede ser posterior a hoy.";
      } else if (from && to && from > to) {
        msg = "La fecha 'desde' no puede ser mayor que la fecha 'hasta'.";
      }
      setDateError(msg);
      return msg === "";
    },
    [todayStr]
  );

  // Fetch optimizado con useCallback
  const fetchLogs = useCallback(async () => {
    if (!token || dateError) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
      });

      if (realizado.trim()) params.append("realizado", realizado.trim().toLowerCase());
      if (tablaAfectada.trim()) params.append("tabla_afectada", tablaAfectada.trim());
      if (actorUsername.trim())
        params.append("usuario_username", actorUsername.trim());
      if (fechaDesde.trim()) params.append("fecha_desde", fechaDesde.trim());
      if (fechaHasta.trim()) params.append("fecha_hasta", fechaHasta.trim());

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Endpoint de auditoría no encontrado. Verifica /api/v1/audit/logs en el backend."
          );
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!didMount.current) return;

      setRows(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      if (didMount.current) setError(err.message || "Error al cargar logs");
    } finally {
      if (didMount.current) setLoading(false);
    }
  }, [
    token,
    dateError,
    page,
    realizado,
    tablaAfectada,
    actorUsername,
    fechaDesde,
    fechaHasta,
    API_BASE,
  ]);

  // Debounce effect mejorado
  useEffect(() => {
    didMount.current = true;

    const isValidDates = validateDates(fechaDesde, fechaHasta);
    if (!isValidDates) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      return () => {
        didMount.current = false;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      fetchLogs();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [
    page,
    realizado,
    tablaAfectada,
    actorUsername,
    fechaDesde,
    fechaHasta,
    validateDates,
    fetchLogs,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      didMount.current = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Handlers con useCallback
  const handlePreviousPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((p) => (p < pages ? p + 1 : p));
  }, [pages]);

  const handleClearFilters = useCallback(() => {
    setRealizado("");
    setTablaAfectada("");
    setActorUsername("");
    setFechaDesde("");
    setFechaHasta("");
    setPage(1);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-800 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <FaHistory className="text-blue-600 dark:text-blue-400" /> Auditoría del Sistema
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Vista resumida de las acciones realizadas por los usuarios del sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FaFilter className="text-gray-400" /> Filtros
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Acción (SELECT DROPDOWN) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Acción Realizada
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <select
                value={realizado}
                onChange={(e) => setRealizado(e.target.value)}
                className="w-full pl-10 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="">Todas las acciones</option>
                {ACCIONES_DISPONIBLES.map((accion) => (
                  <option key={accion.value} value={accion.value}>
                    {accion.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla Afectada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tabla Afectada
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaTable className="text-gray-400" />
              </div>
              <select
                value={tablaAfectada}
                onChange={(e) => setTablaAfectada(e.target.value)}
                className="w-full pl-10 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="">Todas las tablas</option>
                <option value="usuarios">Usuarios</option>
                <option value="personas">Personas</option>
                <option value="visitas">Visitas</option>
                <option value="centros_datos">Centros de datos</option>
                <option value="control">Auditoría</option>
              </select>
            </div>
          </div>

          {/* Actor Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Usuario (Actor)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                value={actorUsername}
                onChange={(e) => setActorUsername(e.target.value)}
                placeholder="Ej: admin"
                className="w-full pl-10 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Desde (Fecha)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-gray-400" />
              </div>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                max={todayStr}
                className="w-full pl-10 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hasta (Fecha)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-gray-400" />
              </div>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                max={todayStr}
                className="w-full pl-10 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Error de fechas */}
        {dateError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
            <FaExclamationCircle /> {dateError}
          </div>
        )}

        {/* Botón Limpiar */}
        <button
          onClick={handleClearFilters}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          <FaEraser /> Limpiar Filtros
        </button>
      </div>

      {/* Error General */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando registros de auditoría...</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {!loading && (
        <>
          {rows.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {total === 0
                  ? "No hay logs disponibles con los filtros aplicados."
                  : "Sin registros en esta página."}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Fecha / Hora
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Usuario (Actor)
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Acción
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Entidad
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((log, idx) => (
                      <tr
                        key={`${log.id || idx}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                          {fmtFecha(log.fecha_completa || log.fecha)}
                        </td>
                        <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                          {log.usuario?.username || "N/A"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getAccionClass(
                              log.realizado
                            )}`}
                          >
                            {getAccionDisplay(log.realizado)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                          {getEntidadDisplay(log.tabla_afectada)}
                        </td>
                        <td className="px-6 py-3 text-gray-900 dark:text-gray-100 max-w-md truncate">
                          {buildHumanMessage(log)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación */}
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-gray-600 dark:text-gray-400 text-sm">
                Página {page} de {pages} | Total: {total} registros
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  <FaChevronLeft /> Anterior
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={page === pages}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Siguiente <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}