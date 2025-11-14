// src/jsx/AuditPage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // Ajusta ruta si necesario
import "../css/audit_panel.css";                   // Ajusta nombre si cambió

const API_BASE = "http://localhost:8000/api/v1/audit/logs";
const PAGE_SIZE = 10;

export default function AuditPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const didMount = useRef(false);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [realizado, setRealizado] = useState("");
  const [tablaAfectada, setTablaAfectada] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  

  useEffect(() => {
    didMount.current = true;
    fetchLogs();
    return () => {
      didMount.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, realizado, tablaAfectada, usuarioId]);

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
      });
      if (realizado.trim()) params.append("realizado", realizado.trim());
      if (tablaAfectada.trim()) params.append("tabla_afectada", tablaAfectada.trim());
      if (usuarioId.trim()) params.append("usuario_id", usuarioId.trim());

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Endpoint de auditoría no encontrado. Verifica /api/v1/audit/logs en el backend."
          );
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json(); // { items, total, page, pages }
      if (!didMount.current) return;

      setRows(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      if (didMount.current) setError(err.message || "Error al cargar logs");
    } finally {
      if (didMount.current) setLoading(false);
    }
  };

  // ==== Helpers de presentación ====

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
    return realizado.charAt(0).toUpperCase() + realizado.slice(1);
  };

  const getAccionClass = (realizado) => {
    const r = realizado?.toLowerCase() || "";
    if (r.includes("borrar") || r.includes("delete")) return "ap-action-borrado";
    if (r.includes("crear") || r.includes("create")) return "ap-action-creacion";
    if (r.includes("editar") || r.includes("update")) return "ap-action-edicion";
    if (r.includes("consultar") || r.includes("get")) return "ap-action-consulta";
    return "ap-action-default";
  };

  const getEntidadDisplay = (tabla) => {
    if (!tabla) return "N/A";
    switch (tabla) {
      case "usuarios":
        return "Usuarios";
      case "personas":
        return "Personas";
      case "visitas":
        return "Visitas";
      case "centros_datos":
        return "Centros de datos";
      case "control":
        return "Auditoría";
      default:
        return tabla.charAt(0).toUpperCase() + tabla.slice(1);
    }
  };

  // NUEVO: Construye mensaje legible a partir de realizado + tabla + detalles JSON
  const buildHumanMessage = (log) => {
    const { realizado, tabla_afectada, registro_id, detalles, usuario } = log || {};
    const actor = usuario?.username || "Usuario desconocido";

    // Intenta parsear detalles como JSON
    let parsed = null;
    if (detalles && typeof detalles === "string") {
      try {
        parsed = JSON.parse(detalles);
      } catch {
        // si no es JSON, lo usamos como texto
      }
    } else if (typeof detalles === "object" && detalles !== null) {
      parsed = detalles;
    }

    const entityName = getEntidadDisplay(tabla_afectada);

    // Caso 1: tenemos estructura con usuario afectado o entidad afectada
    let sujeto = "";
    if (parsed && parsed.usuario_afectado) {
      // Ejemplo de estructura que podrías guardar en log_utils:
      // { usuario_afectado: { username, nombre_completo, id }, ... }
      const u = parsed.usuario_afectado;
      sujeto = `${u.nombre_completo || u.username || "usuario"} (ID ${u.id ?? "?"})`;
    } else if (parsed && parsed.entidad) {
      const e = parsed.entidad;
      sujeto = `${e.nombre || e.descripcion || entityName} (ID ${registro_id ?? e.id ?? "?"})`;
    } else if (registro_id) {
      sujeto = `${entityName} con ID ${registro_id}`;
    } else {
      sujeto = entityName;
    }

    const accionLabel = getAccionDisplay(realizado); // “Creación”, “Edición”, etc.

    // Mensajes específicos por tipo de acción/tabla
    const r = (realizado || "").toLowerCase();
    if (tabla_afectada === "usuarios") {
      if (r.includes("crear")) {
        return `${actor} creó el usuario ${sujeto}.`;
      }
      if (r.includes("editar") || r.includes("update")) {
        return `${actor} actualizó los datos del usuario ${sujeto}.`;
      }
      if (r.includes("borrar") || r.includes("delete") || r.includes("desactivar")) {
        return `${actor} eliminó o desactivó al usuario ${sujeto}.`;
      }
    }

    if (tabla_afectada === "personas") {
      if (r.includes("crear")) {
        return `${actor} registró la persona ${sujeto}.`;
      }
      if (r.includes("editar") || r.includes("update")) {
        return `${actor} modificó los datos de la persona ${sujeto}.`;
      }
      if (r.includes("borrar") || r.includes("delete")) {
        return `${actor} eliminó el registro de la persona ${sujeto}.`;
      }
    }

    if (tabla_afectada === "visitas") {
      if (r.includes("crear")) {
        return `${actor} creó un nuevo acceso/visita para ${sujeto}.`;
      }
      if (r.includes("editar") || r.includes("update")) {
        return `${actor} modificó la visita asociada a ${sujeto}.`;
      }
      if (r.includes("borrar") || r.includes("delete")) {
        return `${actor} eliminó la visita de ${sujeto}.`;
      }
      if (r.includes("ingreso")) {
        return `${actor} registró el ingreso de la visita ${sujeto}.`;
      }
      if (r.includes("salida")) {
        return `${actor} registró la salida de la visita ${sujeto}.`;
      }
    }

    // Caso genérico
    if (accionLabel === "Consulta") {
      return `${actor} consultó información de ${sujeto}.`;
    }

    return `${actor} realizó una acción de ${accionLabel.toLowerCase()} sobre ${sujeto}.`;
  };

  if (loading) {
    return <div className="ap-loading">Cargando logs de auditoría...</div>;
  }

  if (error) {
    return <div className="ap-error">Error: {error}</div>;
  }

  return (
    <div className="ap-container">
      <h1 className="ap-title">Gestión avanzada - Auditoría</h1>
      <p className="ap-subtitle">
        Vista resumida de las acciones realizadas por los usuarios del sistema.
      </p>

      {/* Filtros */}
      <div className="ap-filters">
        <input
          type="text"
          placeholder="Acción (ej: crear_usuario, borrar_persona...)"
          value={realizado}
          onChange={(e) => {
            setRealizado(e.target.value);
            setPage(1);
          }}
          className="ap-filter"
        />
        <input
          type="text"
          placeholder="Entidad (usuarios, personas, visitas...)"
          value={tablaAfectada}
          onChange={(e) => {
            setTablaAfectada(e.target.value);
            setPage(1);
          }}
          className="ap-filter"
        />
        <input
          type="number"
          placeholder="ID usuario actor"
          value={usuarioId}
          onChange={(e) => {
            setUsuarioId(e.target.value);
            setPage(1);
          }}
          className="ap-filter"
        />
        <button onClick={fetchLogs} className="ap-btn-filter">
          Filtrar
        </button>
        <button
          onClick={() => {
            setRealizado("");
            setTablaAfectada("");
            setUsuarioId("");
            setPage(1);
          }}
          className="ap-btn-clear"
        >
          Limpiar
        </button>
      </div>

      {/* Tabla de logs */}
      <div className="ap-table-container">
        <table className="ap-table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Usuario (actor)</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((log) => (
                <tr key={log.id}>
                  <td>{fmtFecha(log.fecha_completa || log.fecha)}</td>
                  <td>{log.usuario?.username || "N/A"}</td>
                  <td className={getAccionClass(log.realizado)}>
                    {getAccionDisplay(log.realizado)}
                  </td>
                  <td>{getEntidadDisplay(log.tabla_afectada)}</td>
                  <td>{buildHumanMessage(log)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="ap-no-data">
                  No hay logs disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="ap-pagination">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Anterior
        </button>
        <span>
          Página {page} de {pages} – Total {total}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page === pages}
        >
          Siguiente
        </button>
      </div>

      <button className="ap-btn-back" onClick={() => navigate("/accesos")}>
        Volver a Accesos
      </button>
    </div>
  );
}
