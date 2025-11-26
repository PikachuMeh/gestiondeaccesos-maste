// src/jsx/DetalleVisita.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx"; 

const { API_V1 } = useApi();
const API_BASE = `${API_V1}/visitas`;

export default function DetalleVisitaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  // ✅ CAMBIO: Array para múltiples visitas
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

    // ✅ PARSEAR IDs múltiples: "123" → [123] | "123,124" → [123,124]
    const visitaIds = id.split(",").map(v => parseInt(v.trim())).filter(v => !isNaN(v));

    if (visitaIds.length === 0) {
      setError("ID de visita inválido");
      setLoading(false);
      return;
    }

    // Cargar visitas en paralelo
    Promise.all(
      visitaIds.map(vId => 
        fetch(`${API_BASE}/${vId}`, {
          signal: ctrl.signal,
          headers,
        }).then(r => {
          if (!r.ok) {
            if (r.status === 403) throw new Error(`Acceso denegado visita ${vId}`);
            if (r.status === 401) throw new Error("No autenticado");
            throw new Error(`HTTP ${r.status} visita ${vId}`);
          }
          return r.json();
        })
      )
    )
    .then(visitasData => {
      setVisitas(visitasData);
      
      // Historial de primera persona
      const primeraPersonaId = visitasData[0]?.persona_id;
      if (primeraPersonaId) {
        return fetch(`${API_BASE}/persona/${primeraPersonaId}/historial`, {
          signal: ctrl.signal,
          headers,
        });
      }
    })
    .then(r => {
      if (r && !r.ok) throw new Error(`HTTP ${r.status} en historial`);
      if (!r) return [];
      return r.json();
    })
    .then(setHistorial)
    .catch(err => {
      if (err.name !== "AbortError") {
        setError(err.message || "Error al cargar visitas");
        if (err.message.includes("No autenticado") || err.message.includes("Acceso denegado")) {
          setTimeout(() => navigate("/login"), 2000);
        }
      }
    })
    .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [id, token, isAuthenticated, navigate]);

  const getImageUrl = () => {
    const foto = visitas[0]?.persona?.foto;
    if (!foto) return null;
    if (foto.startsWith("http")) return foto;
    if (foto.startsWith("img/")) return `/src/${foto}`;
    if (foto.startsWith("src/")) return `/${foto}`;
    return foto;
  };

  const handleImageError = () => {
    console.error("Error cargando imagen:", visitas[0]?.persona?.foto);
    setImagenError(true);
  };

  if (loading) return <div>Cargando detalles de visita...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (visitas.length === 0) return <div>Visita no encontrada.</div>;

  // Primera visita para foto/persona
  const primeraVisita = visitas[0];
  const {
    persona,
    centro_datos: centro,
    area,
    actividad,
    descripcion_actividad,
    fecha_programada,
    estado,
  } = primeraVisita;

  const fmtFecha = (f) => new Date(f).toLocaleDateString("es-VE");
  const fmtHora = (f) => new Date(f).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });

  const parseJsonSafe = (jsonStr) => {
  if (!jsonStr || typeof jsonStr !== 'string') return [];
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
};

  const fotoUrl = getImageUrl();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="text-2xl font-semibold text-on-surface p-8 pb-4">
          DETALLE DE VISITA{visitas.length > 1 && ` (${visitas.length} accesos)`}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-8 pb-8">
          {/* Información general - PRIMERA visita */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-on-surface">Información General</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Fecha</label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {fmtFecha(fecha_programada)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Persona</label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {persona?.nombre} {persona?.apellido}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Cédula</label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {persona?.documento_identidad || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Empresa</label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {persona?.empresa || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Actividad</label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {actividad?.nombre_actividad || descripcion_actividad || "—"}
                </div>
              </div>

              {/* ✅ ÁREAS MÚLTIPLES */}
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Áreas</label>
                <div className="flex flex-wrap gap-1">
                  {primeraVisita?.areas_nombres?.length > 0 ? (
                    primeraVisita.areas_nombres.map((nombre, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm">{area?.nombre || "—"}</span>
                  )}
                </div>
              </div>

              {/* ✅ CENTROS MÚLTIPLES */}
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Centros</label>
                <div className="flex flex-wrap gap-1">
                  {primeraVisita?.centros_nombres?.length > 0 ? (
                    primeraVisita.centros_nombres.map((nombre, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm">{centro?.nombre || "—"}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">Descripción</label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {descripcion_actividad || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Foto - SIN cambios */}
          <div className="bg-primary flex items-center justify-center p-8 relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/95 to-primary/90"></div>
            <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
              <div className="w-full h-full bg-linear-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
            </div>
            <div
              className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full transform rotate-45 animate-bounce"
              style={{ animationDuration: "3s" }}
            ></div>
            <div
              className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-full transform -rotate-12 animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
            <div className="text-center relative z-10">
              {fotoUrl && !imagenError ? (
                <div className="w-64 h-64 mx-auto rounded-lg overflow-hidden shadow-2xl transform hover:scale-110 transition-all duration-500 hover:rotate-1">
                  <img
                    src={fotoUrl}
                    alt={`Foto de ${persona?.nombre} ${persona?.apellido}`}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                    onError={handleImageError}
                  />
                </div>
              ) : (
                <div className="w-64 h-64 mx-auto bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-2xl transform hover:scale-110 transition-all duration-500 hover:rotate-1">
                  <svg
                    className="w-32 h-32 text-white transform hover:scale-110 transition-transform duration-300"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* ✅ NUEVA SECCIÓN: Otras visitas */}
          {visitas.length > 1 && (
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-medium text-on-surface">
                Otras Visitas ({visitas.length - 1})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visitas.slice(1).map(v => (
                  <div key={v.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-sm">{v.codigo_visita}</div>
                    <div className="text-xs text-gray-600">
                      {fmtFecha(v.fecha_programada)} {fmtHora(v.fecha_programada)}
                    </div>
                    <div className="text-xs mt-1 text-gray-900">
                      {v.actividad?.nombre_actividad || v.descripcion_actividad?.slice(0, 40)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial - SIN cambios */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-medium text-on-surface">Historial de Visitas</h3>
            <div className="bg-surface-variant rounded-lg p-4">
              {historial.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lugar</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historial.map((v, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{fmtFecha(v.fecha_programada)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{fmtHora(v.fecha_programada)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{v.centro_datos?.nombre || "—"}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                            <div className="flex flex-wrap gap-1">
                              {v.areas_nombres && v.areas_nombres.length > 0 ? (
                                v.areas_nombres.map((nombre, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                    {nombre}
                                  </span>
                                ))
                              ) : (
                                v.area?.nombre || "—"
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{v.actividad?.nombre_actividad || v.descripcion_actividad || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 text-sm">No hay historial de visitas.</p>
              )}
            </div>

            <div className="flex justify-start pt-4">
              <button
                onClick={() => navigate(-1)}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
