// src/jsx/DetalleVisita.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // AGREGADO: Importa AuthContext (ajusta path si es ./auth/)
import "../css/detalle_visita.css";

const API_BASE = "http://localhost:8000/api/v1/visitas";

export default function DetalleVisitaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();  // AGREGADO: Obtiene token y check auth

  const [visita, setVisita] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // AGREGADO: Verifica auth antes de fetch; si no, redirige
    if (!isAuthenticated()) {
      setError("Sesión expirada. Redirigiendo a login...");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    // Headers comunes con token
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,  // AGREGADO: Incluye token
    };

    // Cargar la visita específica
    fetch(`${API_BASE}/${id}`, {
      signal: ctrl.signal,
      headers,  // AGREGADO: Usa headers con token
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error("Acceso denegado: Verifica tu sesión.");
          if (r.status === 401) throw new Error("No autenticado: Redirigiendo...");
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setVisita(data);
        // Una vez cargada la visita, cargar historial de la persona (con token)
        if (data.persona_id) {
          return fetch(`${API_BASE}/persona/${data.persona_id}/historial`, {
            signal: ctrl.signal,
            headers,  // AGREGADO: Token aquí también
          });
        }
      })
      .then((r) => {
        if (r && !r.ok) throw new Error(`HTTP ${r.status} en historial`);
        if (!r) return [];  // No hay persona_id, salta historial
        return r.json();
      })
      .then((historialData) => {
        setHistorial(historialData || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar la visita");
          if (err.message.includes("No autenticado") || err.message.includes("Acceso denegado")) {
            setTimeout(() => navigate("/login"), 2000);
          }
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [id, token, isAuthenticated, navigate]);  // AGREGADO: Deps con token/auth

  if (loading) return <div>Cargando detalles de visita...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  if (!visita) return <div>Visita no encontrada.</div>;

  const { persona, centro_datos: centro, area, actividad, descripcion, fecha_programada, estado } = visita;
  const fmtFecha = (f) => new Date(f).toLocaleDateString("es-VE");
  const fmtHora = (f) => new Date(f).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="detalle-visita">
      <h1>Detalle de Visita</h1>
      <div className="info-visita">
        <h2>Información General</h2>
        <table>
          <tbody>
            <tr><td>Fecha:</td><td>{fmtFecha(fecha_programada)}</td></tr>
            <tr><td>Persona:</td><td>{persona?.nombre} {persona?.apellido}</td></tr>
            <tr><td>Cédula:</td><td>{persona?.documento_identidad || "—"}</td></tr>
            <tr><td>Empresa:</td><td>{persona?.empresa || "—"}</td></tr>
            <tr><td>Actividad:</td><td>{actividad?.nombre_actividad || descripcion || "—"}</td></tr>
            <tr><td>Área:</td><td>{area?.nombre || "—"}</td></tr>
            <tr><td>Centro:</td><td>{centro?.nombre || "—"}</td></tr>
            <tr><td>Estado:</td><td>{estado?.nombre || "—"}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="historial">
        <h2>Historial de Visitas</h2>
        {historial.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Lugar</th>
                <th>Área</th>
                <th>Actividad</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((v, i) => (
                <tr key={i}>
                  <td>{fmtFecha(v.fecha_programada)}</td>
                  <td>{fmtHora(v.fecha_programada)}</td>
                  <td>{v.centro_datos?.nombre || "—"}</td>
                  <td>{v.area?.nombre || "—"}</td>
                  <td>{v.actividad?.nombre_actividad || v.descripcion_actividad || "—"}</td>
                  <td>{v.descripcion || v.descripcion_actividad || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay historial de visitas.</p>
        )}
      </div>

      <button onClick={() => navigate(-1)}>Volver</button>
    </div>
  );
}
