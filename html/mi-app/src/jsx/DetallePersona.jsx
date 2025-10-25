import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/detalle_persona.css";

const API_BASE = "http://localhost:8000/api/v1/personas";

export default function DetallePersonaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setPersona)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="dp-loading">Cargando...</div>;
  if (error) return <div className="dp-error">Error: {error}</div>;
  if (!persona) return <div className="dp-error">Persona no encontrada</div>;

  return (
    <div className="dp-container">
      <div className="dp-card">
        <div className="dp-header">
          <h1 className="dp-title">
            {persona.nombre} {persona.apellido}
          </h1>
          <button className="dp-btn-back" onClick={() => navigate("/personas")}>
            ← Volver
          </button>
        </div>
        <div className="dp-content">
          <div className="dp-section">
            <InfoField label="Cédula" value={`V-${persona.documento_identidad}`} />
            <InfoField label="Correo" value={persona.email} />
            <InfoField label="Empresa" value={persona.empresa} />
            <InfoField label="Cargo" value={persona.cargo} />
            <InfoField label="Dirección" value={persona.direccion} />
            <InfoField label="Unidad" value={persona.unidad} />
            <InfoField label="Observaciones" value={persona.observaciones} full />
            <InfoField label="Fecha de creacion" value={persona.fecha_creacion}/>
            <InfoField label="Fecha Registrada de su ultima visita" value={persona.fecha_actualizacion}/>
          </div>

          <div className="dp-photo">
            {persona.foto ? (
              <img src={persona.foto} alt={`${persona.nombre}`} className="dp-photo-img" />
            ) : (
              <div className="dp-photo-placeholder">
                <span className="dp-photo-icon">🖼️</span>
                <span>Sin foto</span>
              </div>
            )}
          </div>
        </div>

        <div className="dp-actions">
          <button
            className="dp-btn dp-btn--edit"
            onClick={() => navigate(`/personas/${id}/editar`)}
          >
            ✏️ Editar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, full = false }) {
  return (
    <div className={`dp-field${full ? " dp-field--full" : ""}`}>
      <label className="dp-label">{label}</label>
      <div className="dp-value">{value || "—"}</div>
    </div>
  );
}
