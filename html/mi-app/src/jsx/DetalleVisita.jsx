// src/jsx/DetalleVisita.jsx - ACTUALIZADO CON IMAGENES DESDE CONTEXT
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import { useImages } from "../context/ImageContext.jsx"; // ✅ NUEVO

export default function DetalleVisitaPage() {
  const { API_V1 } = useApi();
  const { getImageUrl } = useImages(); // ✅ NUEVO
  const API_BASE = `${API_V1}/visitas`;
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const [visitas, setVisitas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagenError, setImagenError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setError("Sesión expirada. Redirigiendo a login...");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };

    const visitaIds = id
      .split(",")
      .map((v) => parseInt(v.trim()))
      .filter((v) => !isNaN(v));

    if (visitaIds.length === 0) {
      setError("ID de visita inválido");
      setLoading(false);
      return;
    }

    Promise.all(
      visitaIds.map((vId) =>
        fetch(`${API_BASE}/${vId}`, {
          signal: ctrl.signal,
          headers,
        }).then((r) => {
          if (!r.ok) {
            if (r.status === 403) throw new Error(`Acceso denegado visita ${vId}`);
            if (r.status === 401) throw new Error("No autenticado");
            throw new Error(`HTTP ${r.status} visita ${vId}`);
          }
          return r.json();
        })
      )
    )
      .then((visitasData) => {
        setVisitas(visitasData);
        const primeraPersonaId = visitasData[0]?.persona_id;
        if (primeraPersonaId) {
          return fetch(`${API_BASE}/persona/${primeraPersonaId}/historial`, {
            signal: ctrl.signal,
            headers,
          });
        }
      })
      .then((r) => {
        if (r && !r.ok) throw new Error(`HTTP ${r.status} en historial`);
        if (!r) return [];
        return r.json();
      })
      .then(setHistorial)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar visitas");
          if (
            err.message.includes("No autenticado") ||
            err.message.includes("Acceso denegado")
          ) {
            setTimeout(() => navigate("/login"), 2000);
          }
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [id, token, isAuthenticated, navigate]);

  // ✅ NUEVAS FUNCIONES PARA OBTENER URLs DE IMAGENES
  const getFotoPersonaUrl = () => {
    const foto = visitas[0]?.persona?.foto;
    if (!foto) return null;
    return getImageUrl('persona', foto);
  };

  const getCapturaUrl = () => {
    const captura = visitas[0]?.captura;
    if (!captura) return null;
    return getImageUrl('captura', captura);
  };

  const handleImageError = (type) => {
    console.error(`Error cargando imagen de ${type}:`, visitas[0]?.persona?.foto);
    setImagenError(true);
  };

  const fmtFecha = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const fmtHora = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="detalle-visita">
        <div className="loading">Cargando visitas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detalle-visita">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (visitas.length === 0) {
    return (
      <div className="detalle-visita">
        <div className="error">No se encontraron visitas</div>
      </div>
    );
  }

  const fotoPersonaUrl = getFotoPersonaUrl();
  const capturaUrl = getCapturaUrl();

  return (
    <div className="detalle-visita">
      <button onClick={() => navigate("/accesos")} className="btn btn-secondary mb-3">
        ← Volver a Accesos
      </button>

      {/* Información de la persona */}
      <div className="card mb-4">
        <div className="card__header">
          <h2>Información de la Persona</h2>
        </div>
        <div className="card__body">
          <div className="persona-info">
            {/* Foto de la persona */}
            {fotoPersonaUrl && (
              <div className="foto-persona-section">
                <img
                  src={fotoPersonaUrl}
                  alt={visitas[0]?.persona?.nombre}
                  className="foto-persona"
                  onError={() => handleImageError('persona')}
                />
              </div>
            )}

            <div className="persona-details">
              <p>
                <strong>Nombre:</strong> {visitas[0]?.persona?.nombre}{" "}
                {visitas[0]?.persona?.apellido}
              </p>
              <p>
                <strong>Documento:</strong> {visitas[0]?.persona?.documento_identidad}
              </p>
              <p>
                <strong>Empresa:</strong> {visitas[0]?.persona?.empresa || "—"}
              </p>
              <p>
                <strong>Cargo:</strong> {visitas[0]?.persona?.cargo || "—"}
              </p>
              <p>
                <strong>Email:</strong> {visitas[0]?.persona?.email || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Captura/Foto de acceso */}
      {capturaUrl && (
        <div className="card mb-4">
          <div className="card__header">
            <h2>Captura del Acceso</h2>
          </div>
          <div className="card__body">
            <img
              src={capturaUrl}
              alt="Captura del acceso"
              className="captura-acceso"
              onError={() => handleImageError('captura')}
            />
          </div>
        </div>
      )}

      {/* Detalles de visitas */}
      {visitas.map((visita, idx) => (
        <div className="card mb-3" key={visita.id || idx}>
          <div className="card__header">
            <h3>Visita #{idx + 1}</h3>
          </div>
          <div className="card__body">
            <table className="table">
              <tbody>
                <tr>
                  <td><strong>Fecha</strong></td>
                  <td>{fmtFecha(visita.fecha_programada)}</td>
                </tr>
                <tr>
                  <td><strong>Hora</strong></td>
                  <td>{fmtHora(visita.fecha_programada)}</td>
                </tr>
                <tr>
                  <td><strong>Lugar</strong></td>
                  <td>{visita.centro_datos?.nombre || "—"}</td>
                </tr>
                <tr>
                  <td><strong>Áreas</strong></td>
                  <td>
                    {visita.areas_nombres && visita.areas_nombres.length > 0
                      ? visita.areas_nombres.map((nombre, i) => (
                          <span key={i} className="badge">
                            {nombre}
                          </span>
                        ))
                      : visita.area?.nombre || "—"}
                  </td>
                </tr>
                <tr>
                  <td><strong>Actividad</strong></td>
                  <td>
                    {visita.actividad?.nombre_actividad ||
                      visita.descripcion_actividad ||
                      "—"}
                  </td>
                </tr>
                <tr>
                  <td><strong>Estado</strong></td>
                  <td>
                    <span
                      className={`status status--${
                        visita.estado === "completada" ? "success" : "info"
                      }`}
                    >
                      {visita.estado}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Historial de visitas */}
      {historial.length > 0 && (
        <div className="card">
          <div className="card__header">
            <h2>Historial de Visitas - {visitas[0]?.persona?.nombre}</h2>
          </div>
          <div className="card__body">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Lugar</th>
                  <th>Área</th>
                  <th>Actividad</th>
                </tr>
              </thead>
              <tbody>
                {historial.length > 0 ? (
                  historial.map((v) => (
                    <tr key={v.id}>
                      <td>{fmtFecha(v.fecha_programada)}</td>
                      <td>{fmtHora(v.fecha_programada)}</td>
                      <td>{v.centro_datos?.nombre || "—"}</td>
                      <td>
                        {v.areas_nombres && v.areas_nombres.length > 0
                          ? v.areas_nombres.map((nombre, idx) => (
                              <span key={idx} className="badge">
                                {nombre}
                              </span>
                            ))
                          : v.area?.nombre || "—"}
                      </td>
                      <td>
                        {v.actividad?.nombre_actividad ||
                          v.descripcion_actividad ||
                          "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No hay historial de visitas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

