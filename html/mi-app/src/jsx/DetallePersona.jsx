// src/jsx/DetallePersona.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // AGREGADO: Para token e isAuthenticated (ajusta path si necesario)
import "../css/detalle_persona.css";

const API_BASE = "http://localhost:8000/api/v1/personas";

export default function DetallePersonaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();  // AGREGADO: Obtiene token y check auth

  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // AGREGADO: Verifica auth antes de fetch
    if (!isAuthenticated()) {
      setError("Sesión expirada. Redirigiendo a login...");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    const ctrl = new AbortController();  // AGREGADO: Para abortar si desmonta
    setLoading(true);
    setError(null);

    // AGREGADO: Headers con token para auth
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };

    fetch(`${API_BASE}/${id}`, {
      signal: ctrl.signal,  // AGREGADO: Abort controller
      headers,  // AGREGADO: Incluye token
    })
      .then((r) => {
        if (!r.ok) {
          // AGREGADO: Manejo específico de auth errors
          if (r.status === 403) throw new Error("Acceso denegado: Verifica tu sesión.");
          if (r.status === 401) throw new Error("No autenticado: Redirigiendo...");
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setPersona)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar la persona");
          // AGREGADO: Redirect si auth falla
          if (err.message.includes("No autenticado") || err.message.includes("Acceso denegado")) {
            setTimeout(() => navigate("/login"), 2000);
          }
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();  // AGREGADO: Cleanup
  }, [id, token, isAuthenticated, navigate]);  // AGREGADO: Deps para re-fetch si cambia token/auth

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
            <InfoField label="Fecha de creacion" value={persona.fecha_creacion} />
            <InfoField label="Fecha Registrada de su ultima visita" value={persona.fecha_actualizacion} />
            {/* AGREGADO: Ejemplo para nuevas cosas (e.g., historial visitas o docs). Remueve/comenta si no usas.
             * Para historial: Agrega fetch separado en useEffect y mapea en <ul> o nueva sección.
             */}
            {persona.historial_visitas && (
              <div className="dp-section--historial">
                <h3>Historial de Visitas</h3>
                <ul>
                  {persona.historial_visitas.map((visita, i) => (
                    <li key={i}>{visita.fecha} - {visita.area}</li>
                  ))}
                </ul>
              </div>
            )}
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
            {/* AGREGADO: Si agregas más imágenes/docs, usa <img> similar o galería */}
          </div>
        </div>

        <div className="dp-actions">
          <button
            className="dp-btn dp-btn--edit"
            onClick={() => navigate(`/personas/${id}/editar`)}
          >
            ✏️ Editar
          </button>
          {/* AGREGADO: Botón ejemplo para nuevas acciones (e.g., ver visitas). Remueve si no */}
          {isAuthenticated() && (
            <button className="dp-btn dp-btn--view-visits" onClick={() => navigate(`/visitas?persona=${id}`)}>
              📋 Ver Visitas
            </button>
          )}
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
