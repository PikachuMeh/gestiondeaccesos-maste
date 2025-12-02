// src/jsx/DetalleAccesoPage.jsx - Ver historial de accesos de una persona

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { useApi } from "../context/ApiContext";
import {
  FaArrowLeft,
  FaHistory,
  FaCalendarAlt,
  FaClipboardList,
  FaBuilding,
  FaSitemap,
  FaInfoCircle,
  FaEye,
  FaExclamationCircle
} from "react-icons/fa";

export default function DetalleAccesoPage() {
  const { persona_id } = useParams(); // ID de la persona
  const { API_V1 } = useApi();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [accesos, setAccesos] = useState([]);
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  // Cargar información de la persona
  useEffect(() => {
    if (!token || !persona_id) {
      setError("No autenticado o ID inválido");
      setLoading(false);
      return;
    }

    const fetchPersona = async () => {
      try {
        const resp = await fetch(`${API_V1}/personas/${persona_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!resp.ok) {
          throw new Error(`Error: ${resp.status}`);
        }

        const data = await resp.json();
        setPersona(data);
      } catch (err) {
        console.error("Error cargando persona:", err);
        setError(err.message);
      }
    };

    fetchPersona();
  }, [persona_id, token, API_V1]);

  // Cargar historial de accesos
  useEffect(() => {
    if (!token || !persona_id) return;

    const fetchAccesos = async () => {
      try {
        setLoading(true);
        const skip = (page - 1) * PAGE_SIZE;

        // ✅ Endpoint para obtener visitas de una persona
        const resp = await fetch(
          `${API_V1}/visitas?persona_id=${persona_id}&skip=${skip}&limit=${PAGE_SIZE}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!resp.ok) {
          throw new Error(`Error: ${resp.status}`);
        }

        const data = await resp.json();
        setAccesos(data.items || data); // Adaptarse a la estructura de tu API

        // Calcular páginas totales
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / PAGE_SIZE));

        setError(null);
      } catch (err) {
        console.error("Error cargando accesos:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccesos();
  }, [persona_id, token, page, API_V1]);

  const handleBack = () => {
    navigate("/accesos");
  };

  const handleVerDetalles = (visitaId) => {
    navigate(`/accesos/${visitaId}`);
  };

  if (loading && !persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error && !persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4 flex justify-center">
            <FaExclamationCircle />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error al cargar</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <FaArrowLeft /> Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaHistory className="text-blue-600 dark:text-blue-400" /> Historial de Accesos
            </h1>
            {persona && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                <span className="font-semibold text-gray-900 dark:text-white">{persona.nombre} {persona.apellido}</span> - Cédula: {persona.documento_identidad}
              </p>
            )}
          </div>
          <button
            onClick={handleBack}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <FaArrowLeft /> Volver
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <FaExclamationCircle /> {error}
          </div>
        )}

        {/* Tabla de accesos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-gray-500 dark:text-gray-400">Cargando accesos...</p>
            </div>
          ) : accesos.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <FaClipboardList className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No hay registros de acceso para esta persona</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-2"><FaCalendarAlt /> Fecha Programada</div>
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-2"><FaClipboardList /> Actividad</div>
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-2"><FaBuilding /> Centro de Datos</div>
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-2"><FaSitemap /> Área(s)</div>
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-2"><FaInfoCircle /> Estado</div>
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {accesos.map((acceso, idx) => (
                    <tr
                      key={acceso.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors bg-white dark:bg-gray-800"
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {acceso.fecha_programada
                          ? new Date(acceso.fecha_programada).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {acceso.actividad?.nombre_actividad || "—"}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {acceso.centro_datos?.nombre || "—"}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {acceso.area?.nombre || "—"}
                      </td>
                      <td className="p-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${acceso.estado?.nombre_estado === "Completado"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                              : acceso.estado?.nombre_estado === "Pendiente"
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            }`}
                        >
                          {acceso.estado?.nombre_estado || "—"}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleVerDetalles(acceso.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <FaEye /> Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg border transition-colors ${page === p
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Info */}
        <div className="text-center mt-6 text-gray-500 dark:text-gray-400 text-sm">
          <p>
            Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong>
            {accesos.length > 0 && ` • Total de registros: ${accesos.length * totalPages}`}
          </p>
        </div>
      </div>
    </div>
  );
}
