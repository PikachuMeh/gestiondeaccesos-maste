import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/detalle_visita.css";

const API_BASE = "http://localhost:8000/api/v1/visitas";

export default function DetalleVisitaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visita, setVisita] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    // Cargar la visita específica
    fetch(`${API_BASE}/${id}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setVisita(data);
        
        // Una vez cargada la visita, cargar todo el historial de la persona
        return fetch(`${API_BASE}/persona/${data.persona_id}/historial`, { signal: ctrl.signal });
      })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((historialData) => {
        setHistorial(historialData);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar la visita");
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [id]);

  if (loading) return <div className="dv-loading">Cargando...</div>;
  if (error) return <div className="dv-error">Error: {error}</div>;
  if (!visita) return <div className="dv-error">Visita no encontrada</div>;

  const persona = visita.persona || {};
  const cd = visita.centro_datos || {};

  return (
    <div className="dv-container">
      <div className="dv-card">
        <div className="dv-header">
          <h1 className="dv-title">
            Nombre y Apellido: {persona.nombre} {persona.apellido}
          </h1>
          <button className="dv-btn-back" onClick={() => navigate("/accesos")}>
            ← Volver
          </button>
        </div>

        <div className="dv-content">
          <div className="dv-section">
            <div className="dv-field">
              <label className="dv-label">Cedula</label>
              <div className="dv-value">{persona.documento_identidad || "—"}</div>
            </div>

            <div className="dv-field">
              <label className="dv-label">Correo</label>
              <div className="dv-value">{persona.email || "—"}</div>
            </div>

            <div className="dv-field">
              <label className="dv-label">Unidad</label>
              <div className="dv-value">{persona.unidad || "—"}</div>
            </div>

            <div className="dv-field">
              <label className="dv-label">Centro de Datos</label>
              <div className="dv-value">{cd.nombre || "—"}</div>
            </div>
          </div>

          <div className="dv-photo">
            <div className="dv-photo-placeholder">
              <span className="dv-photo-icon">🖼️</span>
            </div>
            <div className="dv-photo-actions">
              <button className="dv-icon-btn">✏️</button>
            </div>
          </div>
        </div>

        <div className="dv-table-section">
          <h2 className="dv-subtitle">Historial de Accesos ({historial.length} visitas)</h2>
          <table className="dv-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Lugar</th>
                <th>Área</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {historial.length > 0 ? (
                historial.map((v, idx) => {
                  const centro = v.centro_datos || {};
                  const actividad = v.actividad || {};
                  const area = v.area || {};
                  
                  return (
                    <tr key={v.id || idx}>
                      <td>{fmtFecha(v.fecha_programada)}</td>
                      <td>{fmtHora(v.fecha_programada)}</td>
                      <td>{centro.nombre || "—"}</td>
                      <td>{area.nombre || "—"}</td>
                      <td>{actividad.nombre_actividad || v.descripcion_actividad || "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    No hay historial de visitas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  return `${day}/${m}/${y}`;
}

function fmtHora(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
