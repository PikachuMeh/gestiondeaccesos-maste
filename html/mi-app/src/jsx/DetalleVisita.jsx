// src/jsx/DetalleVisita.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";

const API_BASE = "http://localhost:8000/api/v1/visitas";

export default function DetalleVisitaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const [visita, setVisita] = useState(null);
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

    fetch(`${API_BASE}/${id}`, {
      signal: ctrl.signal,
      headers,
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
        if (data.persona_id) {
          return fetch(`${API_BASE}/persona/${data.persona_id}/historial`, {
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
  }, [id, token, isAuthenticated, navigate]);

  const getImageUrl = () => {
  const foto = persona?.foto;
  
  if (!foto) return null;

  if (foto.startsWith("http")) return foto;              // ya viene completa

  if (foto.startsWith("img/")) return `/src/${foto}`;    // BD: img/personas/0001.jpg
  if (foto.startsWith("src/")) return `/${foto}`;        // BD: src/img/personas/0001.jpg
  return foto                // solo nombre de archivo
};


  const handleImageError = () => {
    console.error("Error cargando imagen de visita:", visita?.persona?.foto);
    setImagenError(true);
  };

  if (loading) return <div>Cargando detalles de visita...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!visita) return <div>Visita no encontrada.</div>;

  const {
    persona,
    centro_datos: centro,
    area,
    actividad,
    descripcion_actividad,
    fecha_programada,
    estado,
  } = visita;

  const fmtFecha = (f) => new Date(f).toLocaleDateString("es-VE");
  const fmtHora = (f) =>
    new Date(f).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });

  const fotoUrl = getImageUrl();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="text-2xl font-semibold text-on-surface p-8 pb-4">
          DETALLE DE VISITA
        </div>
        <div className="grid grid-cols-2 gap-6 px-8 pb-8">
          {/* Información general */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-on-surface">Información General</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Fecha
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {fmtFecha(fecha_programada)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Persona
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {persona?.nombre} {persona?.apellido}
                </div>
              </div>

              
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Cédula
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {persona?.documento_identidad || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Empresa
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {persona?.empresa || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Actividad
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {actividad?.nombre_actividad || descripcion_actividad || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Área
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {area?.nombre || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Centro
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {centro?.nombre || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Descripción
                </label>
                <div className="block w-full px-0 py-1 border-b border-gray-200 bg-transparent text-on-surface text-sm">
                  {descripcion_actividad || "—"}
                </div>
              </div>

            </div>
          </div>

          {/* Foto */}
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
              {fotoUrl ? (
                <div className="w-64 h-64 mx-auto rounded-lg overflow-hidden shadow-2xl transform hover:scale-110 transition-all duration-500 hover:rotate-1">
                  <img
                    src={fotoUrl}
                    alt={`Foto de ${persona?.nombre} ${persona?.apellido}`}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                    onError={() => setImagenError(true)}
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

          {/* Historial */}
          <div className="col-span-2 space-y-4">
            <h3 className="text-lg font-medium text-on-surface">Historial de Visitas</h3>

            <div className="bg-surface-variant rounded-lg p-4">
              {historial.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hora
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lugar
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Área
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actividad
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historial.map((v, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                            {fmtFecha(v.fecha_programada)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                            {fmtHora(v.fecha_programada)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                            {v.centro_datos?.nombre || "—"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                            {v.area?.nombre || "—"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                            {v.actividad?.nombre_actividad || v.descripcion_actividad || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 text-sm">
                  No hay historial de visitas.
                </p>
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
