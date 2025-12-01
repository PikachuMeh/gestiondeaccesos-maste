// src/jsx/DetalleVisita.jsx - CON TAILWIND CSS

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import { useImages } from "../context/ImageContext.jsx";

export default function DetalleVisitaPage() {
  const { API_V1 } = useApi();
  const { getImageUrl } = useImages();
  const API_BASE = `${API_V1}/visitas`;
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
      Authorization: `Bearer ${token}`,
    };

    const visitaId = parseInt(id);

    if (isNaN(visitaId)) {
      setError("ID de visita inválido");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/${visitaId}`, {
      signal: ctrl.signal,
      headers,
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error(`Acceso denegado visita ${visitaId}`);
          if (r.status === 401) throw new Error("No autenticado");
          throw new Error(`HTTP ${r.status} visita ${visitaId}`);
        }
        return r.json();
      })
      .then((visitaData) => {
        setVisita(visitaData);
        const personaId = visitaData?.persona_id;
        if (personaId) {
          return fetch(`${API_BASE}/persona/${personaId}/historial`, {
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
          setError(err.message || "Error al cargar visita");
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

  const getFotoPersonaUrl = () => {
    const foto = visita?.persona?.foto;
    if (!foto) return null;
    return getImageUrl("persona", foto);
  };

  const getCapturaUrl = () => {
    const captura = visita?.captura;
    if (!captura) return null;
    return getImageUrl("captura", captura);
  };

  const handleImageError = (type) => {
    console.error(`Error cargando imagen de ${type}:`, visita?.persona?.foto);
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

  const getEstadoText = () => {
    if (!visita?.estado) return "N/A";
    if (typeof visita.estado === "object") {
      return visita.estado?.nombre_estado || "N/A";
    }
    return visita.estado;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="mt-4 text-gray-600">Cargando visita...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg max-w-md w-full">
          <h3 className="font-bold mb-2">Error</h3>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate("/accesos")}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Volver a Accesos
          </button>
        </div>
      </div>
    );
  }

  if (!visita) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-gray-100 border border-gray-300 text-gray-800 px-6 py-4 rounded-lg max-w-md w-full">
          <p className="mb-4">No se encontró la visita</p>
          <button
            onClick={() => navigate("/accesos")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
          >
            Volver a Accesos
          </button>
        </div>
      </div>
    );
  }

  const fotoPersonaUrl = getFotoPersonaUrl();
  const capturaUrl = getCapturaUrl();
  const estadoText = getEstadoText();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header con botón volver */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Detalles de Visita #{visita.id}</h1>
          <button
            onClick={() => navigate("/accesos")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>←</span> Volver a Accesos
          </button>
        </div>

        {/* Información de la persona */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h2 className="text-xl font-bold">Información de la Persona</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Foto de la persona */}
              {fotoPersonaUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={fotoPersonaUrl}
                    alt={visita?.persona?.nombre}
                    className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
                    onError={() => handleImageError("persona")}
                  />
                </div>
              )}

              {/* Detalles de la persona */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Nombre</p>
                  <p className="text-base text-gray-900">
                    {visita?.persona?.nombre} {visita?.persona?.apellido}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Documento</p>
                  <p className="text-base text-gray-900">
                    {visita?.persona?.documento_identidad}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Empresa</p>
                  <p className="text-base text-gray-900">
                    {visita?.persona?.empresa || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Cargo</p>
                  <p className="text-base text-gray-900">
                    {visita?.persona?.cargo || "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm font-semibold text-gray-600">Email</p>
                  <p className="text-base text-gray-900">
                    {visita?.persona?.email || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Captura del acceso */}
        {capturaUrl && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h2 className="text-xl font-bold">Captura del Acceso</h2>
            </div>
            <div className="p-6">
              <img
                src={capturaUrl}
                alt="Captura del acceso"
                className="w-full rounded-lg object-contain max-h-96 border border-gray-200"
                onError={() => handleImageError("captura")}
              />
            </div>
          </div>
        )}

        {/* Detalles de la visita */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h3 className="text-lg font-bold">Información de la Visita</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 bg-gray-50 w-1/3">
                    Fecha
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {fmtFecha(visita.fecha_programada)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 bg-gray-50">
                    Hora
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {fmtHora(visita.fecha_programada)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 bg-gray-50">
                    Lugar
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {visita.centro_datos?.nombre || "—"}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 bg-gray-50">
                    Áreas
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {visita.areas_nombres && visita.areas_nombres.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {visita.areas_nombres.map((nombre, i) => (
                          <span
                            key={i}
                            className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            {nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      visita.area?.nombre || "—"
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 bg-gray-50">
                    Actividad
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {visita.actividad?.nombre_actividad ||
                      visita.descripcion_actividad ||
                      "—"}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 bg-gray-50">
                    Estado
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        estadoText === "completada" ||
                        estadoText === "Completada"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {estadoText}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de visitas */}
        {historial.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h2 className="text-xl font-bold">
                Historial de Visitas - {visita?.persona?.nombre}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Lugar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Área
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actividad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historial.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {fmtFecha(v.fecha_programada)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {fmtHora(v.fecha_programada)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {v.centro_datos?.nombre || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {v.areas_nombres && v.areas_nombres.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {v.areas_nombres.map((nombre, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold"
                              >
                                {nombre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          v.area?.nombre || "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {v.actividad?.nombre_actividad ||
                          v.descripcion_actividad ||
                          "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
