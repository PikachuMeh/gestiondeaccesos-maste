// src/jsx/DetalleVisita.jsx - CON TAILWIND CSS

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import { useImages } from "../context/ImageContext.jsx";
import {
  FaArrowLeft,
  FaUser,
  FaCamera,
  FaInfoCircle,
  FaHistory,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaSitemap,
  FaClipboardList,
  FaExclamationCircle
} from "react-icons/fa";

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando visita...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-lg max-w-md w-full flex items-center gap-3">
          <FaExclamationCircle className="text-2xl" />
          <div>
            <h3 className="font-bold mb-1">Error</h3>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={() => navigate("/accesos")}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
            >
              <FaArrowLeft /> Volver a Accesos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!visita) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-6 py-4 rounded-lg max-w-md w-full text-center">
          <p className="mb-4">No se encontró la visita</p>
          <button
            onClick={() => navigate("/accesos")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2 mx-auto"
          >
            <FaArrowLeft /> Volver a Accesos
          </button>
        </div>
      </div>
    );
  }

  const fotoPersonaUrl = getFotoPersonaUrl();
  const capturaUrl = getCapturaUrl();
  const estadoText = getEstadoText();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header con botón volver */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaInfoCircle className="text-blue-600 dark:text-blue-400" /> Detalles de Visita
          </h1>
          <button
            onClick={() => navigate("/accesos")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <FaArrowLeft /> Volver a Accesos
          </button>
        </div>

        {/* Información de la persona */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6 border border-gray-200 dark:border-gray-700">
          <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-4 flex items-center gap-2">
            <FaUser /> <h2 className="text-xl font-bold">Información de la Persona</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Foto de la persona */}
              {fotoPersonaUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={fotoPersonaUrl}
                    alt={visita?.persona?.nombre}
                    className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                    onError={() => handleImageError("persona")}
                  />
                </div>
              )}

              {/* Detalles de la persona */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nombre</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {visita?.persona?.nombre} {visita?.persona?.apellido}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Documento</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {visita?.persona?.documento_identidad}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Empresa</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {visita?.persona?.empresa || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Cargo</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {visita?.persona?.cargo || "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Email</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {visita?.persona?.email || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Captura del acceso */}
        {capturaUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6 border border-gray-200 dark:border-gray-700">
            <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-4 flex items-center gap-2">
              <FaCamera /> <h2 className="text-xl font-bold">Captura del Acceso</h2>
            </div>
            <div className="p-6">
              <img
                src={capturaUrl}
                alt="Captura del acceso"
                className="w-full rounded-lg object-contain max-h-96 border border-gray-200 dark:border-gray-600"
                onError={() => handleImageError("captura")}
              />
            </div>
          </div>
        )}

        {/* Detalles de la visita */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6 border border-gray-200 dark:border-gray-700">
          <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-4 flex items-center gap-2">
            <FaInfoCircle /> <h3 className="text-lg font-bold">Información de la Visita</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 w-1/3 flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-400" /> Fecha
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {fmtFecha(visita.fecha_programada)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <FaClock className="text-gray-400" /> Hora
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {fmtHora(visita.fecha_programada)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-gray-400" /> Lugar
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {visita.centro_datos?.nombre || "—"}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <FaSitemap className="text-gray-400" /> Áreas
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {visita.areas_nombres && visita.areas_nombres.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {visita.areas_nombres.map((nombre, i) => (
                          <span
                            key={i}
                            className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-semibold"
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
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <FaClipboardList className="text-gray-400" /> Actividad
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {visita.actividad?.nombre_actividad ||
                      visita.descripcion_actividad ||
                      "—"}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <FaInfoCircle className="text-gray-400" /> Estado
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${estadoText === "completada" ||
                          estadoText === "Completada"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-4 flex items-center gap-2">
              <FaHistory /> <h2 className="text-xl font-bold">
                Historial de Visitas - {visita?.persona?.nombre}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Lugar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Área
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actividad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {historial.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {fmtFecha(v.fecha_programada)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {fmtHora(v.fecha_programada)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {v.centro_datos?.nombre || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {v.areas_nombres && v.areas_nombres.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {v.areas_nombres.map((nombre, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs font-semibold"
                              >
                                {nombre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          v.area?.nombre || "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
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
