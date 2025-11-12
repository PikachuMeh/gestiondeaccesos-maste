// src/jsx/AuditPage.jsx (corregido: mapeo fields backend → realizado/tabla_afectada; filtros text)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // Ajusta path si necesario
import "../css/audit_panel.css";  // Asume existe (crea si no, ver abajo)


const API_BASE = "http://localhost:8000/api/v1/audit/logs";  // Endpoint paginado
const PAGE_SIZE = 10;


export default function AuditPage() {
  const navigate = useNavigate();
  const { token } = useAuth();  // Token para headers
  const didMount = useRef(false);


  // Estados
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Filtros (match backend params)
  const [realizado, setRealizado] = useState("");  // e.g., "borrar_persona" (exacto)
  const [tablaAfectada, setTablaAfectada] = useState("");  // e.g., "personas"
  const [usuarioId, setUsuarioId] = useState("");  // ID user


  useEffect(() => {
    didMount.current = true;
    fetchLogs();
    return () => { didMount.current = false; };
  }, [page, realizado, tablaAfectada, usuarioId]);  // Re-fetch en cambios


  const fetchLogs = async () => {
    setLoading(true);
    setError(null);


    const params = new URLSearchParams({ page, size: PAGE_SIZE });
    if (realizado) params.append("realizado", realizado);  // CORREGIDO: realizado (no accion)
    if (tablaAfectada) params.append("tabla_afectada", tablaAfectada);  // AGREGADO: Entidad
    if (usuarioId) params.append("usuario_id", usuarioId);


    try {
      const response = await fetch(`${API_BASE}?${params}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error("Endpoint no encontrado: Verifica /audit/logs en backend");
        throw new Error(`HTTP ${response.status}: ${response.statusText || "Error desconocido"}`);
      }
      const data = await response.json();
      if (didMount.current) {
        setRows(data.items || []);  // Match paginate_and_format
        setPages(data.pages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      if (didMount.current) setError(err.message);
    } finally {
      if (didMount.current) setLoading(false);
    }
  };


  // AGREGADO: Traduce realizado a display amigable y clase CSS
  const getAccionDisplay = (realizado) => {
    if (!realizado) return "N/A";
    if (realizado.includes("borrar") || realizado.includes("delete")) return "Borrado";
    if (realizado.includes("crear") || realizado.includes("create")) return "Creación";
    if (realizado.includes("editar") || realizado.includes("update")) return "Edición";
    if (realizado.includes("consultar") || realizado.includes("get")) return "Consulta";
    return realizado.charAt(0).toUpperCase() + realizado.slice(1);  // Title case default
  };

  const getAccionClass = (realizado) => {
    if (realizado?.includes("borrar")) return "ap-action-borrado";
    if (realizado?.includes("crear")) return "ap-action-creacion";
    if (realizado?.includes("editar")) return "ap-action-edicion";
    if (realizado?.includes("consultar")) return "ap-action-consulta";
    return "ap-action-default";
  };

  const getEntidadDisplay = (tabla) => tabla || "N/A";


  if (loading) return <div className="ap-loading">Cargando logs de auditoría...</div>;
  if (error) return <div className="ap-error">Error: {error}</div>;


  const fmtFecha = (f) => new Date(f).toLocaleString("es-VE");  // Para fecha_completa (ISO)


  return (
    <div className="ap-container">
      <h1 className="ap-title">Gestión Avanzada - Logs de Auditoría (Borrados y Cambios)</h1>
      <p className="ap-subtitle">Vista de todas las acciones realizadas por operadores del sistema.</p>


      {/* Filtros (inputs text para flexibilidad) */}
      <div className="ap-filters">
        <input
          type="text"
          placeholder="Acción (e.g., borrar_persona, consultar_visitas)"
          value={realizado}
          onChange={(e) => setRealizado(e.target.value)}
          className="ap-filter"
        />
        <input
          type="text"
          placeholder="Entidad (e.g., personas, visitas)"
          value={tablaAfectada}
          onChange={(e) => setTablaAfectada(e.target.value)}
          className="ap-filter"
        />
        <input
          type="number"
          placeholder="ID Usuario"
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          className="ap-filter"
        />
        <button onClick={fetchLogs} className="ap-btn-filter">Filtrar</button>
        <button onClick={() => { setRealizado(""); setTablaAfectada(""); setUsuarioId(""); setPage(1); }} className="ap-btn-clear">Limpiar</button>
      </div>


      {/* Tabla Logs (mapeo corregido) */}
      <div className="ap-table-container">
        <table className="ap-table">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Entidad ID</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((log) => (
                <tr key={log.id}>
                  <td>{fmtFecha(log.fecha_completa)}</td>  
                  <td>{log.usuario?.username || "N/A"}</td>  
                  <td className={getAccionClass(log.realizado)}>{getAccionDisplay(log.realizado)}</td>  
                  <td>{getEntidadDisplay(log.tabla_afectada)}</td>  
                  <td>{log.registro_id || "N/A"}</td>  
                  <td>{log.detalles ? (typeof log.detalles === 'object' ? JSON.stringify(log.detalles).slice(0, 50) + "..." : log.detalles.slice(0, 50) + "...") : "—"}</td>  
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="ap-no-data">No hay logs disponibles. Intenta crear acciones en el sistema para generar logs.</td></tr>
            )}
          </tbody>
        </table>
      </div>


      {/* Paginación */}
      <div className="ap-pagination">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Anterior</button>
        <span>Página {page} de {pages} (Total: {total})</span>
        <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}>Siguiente</button>
      </div>


      <button className="ap-btn-back" onClick={() => navigate("/accesos")}>Volver a Accesos</button>
    </div>
  );
}
