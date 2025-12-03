// src/jsx/AccesosPage.jsx - CON FILTRO POR PARÁMETRO URL

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { useApi } from "../context/ApiContext";
import {
  FaClipboardList,
  FaPlus,
  FaTrash,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch
} from "react-icons/fa";

const PAGE_SIZE = 10;

// TOAST NOTIFICATIONS
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  const icon = type === "success" ? <FaCheckCircle /> : <FaTimesCircle />;

  return (
    <div className={`fixed top-5 right-5 px-6 py-4 ${bgColor} text-white rounded-lg shadow-lg z-50 flex items-center gap-3 animate-fade-in-down`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}

export default function AccesosPage() {
  const navigate = useNavigate();
  const { API_V1, api } = useApi();
  const { token, isAuthenticated } = useAuth();
  
  // ✅ NUEVO: Obtener parámetros de la URL
  const [searchParams] = useSearchParams();
  
  const [accesos, setAccesos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  
  // ✅ MODIFICADO: Inicializar searchTerm con valor de URL o vacío
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const toastRef = useRef(null);

  // Función para descargar PDF
  const downloadPdf = async (visitaId) => {
    try {
      setLoading(true);
      console.log(`📥 Iniciando descarga de PDF para visita ${visitaId}...`);

      const response = await fetch(
        `${API_V1}/visitas/${visitaId}/download-pdf`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("Respuesta error PDF:", errText);
        throw new Error(
          `Error al descargar PDF: ${response.status} ${response.statusText}`
        );
      }

      // Obtener blob del PDF
      const blob = await response.blob();

      // Nombre de archivo desde Content-Disposition (si existe)
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `constancia_visita_${visitaId}.pdf`;

      if (contentDisposition) {
        const match = contentDisposition.match(
          /filename[^;=\n]*=(?:(['\"]).*?\1|[^;\n]*)/
        );
        if (match && match[0]) {
          filename = match[0].replace(/filename=/, "").replace(/['"]/g, "");
        }
      }

      // Crear URL temporal y lanzar descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      setToast({ message: `PDF descargado: ${filename}`, type: "success" });
      console.log("✅ Descarga completada");
    } catch (error) {
      console.error("❌ Error descargando PDF:", error);
      setToast({
        message: `${error.message || "Error al descargar PDF"}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ MODIFICADO: Cargar accesos con filtro por cédula
  const loadAccesos = async () => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const skip = (page - 1) * PAGE_SIZE;
      
      // Construir URL con parámetros de búsqueda
      let url = `${API_V1}/visitas?skip=${skip}&limit=${PAGE_SIZE}`;
      
      // Si hay un término de búsqueda, añadirlo como parámetro
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setAccesos(data.items || data);
      const total = data.total || 0;
      setTotalPages(Math.ceil(total / PAGE_SIZE));
    } catch (err) {
      setError(err.message);
      console.error("Error cargando accesos:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ MODIFICADO: Ejecutar loadAccesos cuando cambie searchTerm o page
  useEffect(() => {
    setPage(1); // Resetear a página 1 cuando cambia la búsqueda
  }, [searchTerm]);

  useEffect(() => {
    loadAccesos();
  }, [page, searchTerm, token]);

  // Función para eliminar acceso
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este acceso?")) {
      return;
    }

    try {
      const response = await fetch(`${API_V1}/visitas/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error al eliminar");
      }

      setToast({ message: "Acceso eliminado", type: "success" });
      loadAccesos();
    } catch (err) {
      setToast({ message: `${err.message}`, type: "error" });
    }
  };

  // Función para verificar si es admin
  const isAdmin = () => {
    return true;
  };

  // Renderizado
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-800 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FaClipboardList className="text-blue-600 dark:text-blue-400" /> Accesos
        </h1>
        <button
          onClick={() => navigate("/registro/acceso")}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm"
        >
          <FaPlus /> Nuevo Acceso
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ✅ NUEVO: Barra de búsqueda */}
      <div className="mb-6 flex gap-2">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cédula"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {/* Tabla */}
                {console.log(accesos)}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            Cargando accesos...
          </div>
        ) : accesos.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            {searchTerm ? `No hay accesos que coincidan con "${searchTerm}"` : "No hay accesos registrados"}
          </div>

        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Centro
                  </th>
                  {isAdmin() && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {accesos.map((v, idx) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/accesos/${v.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {v.fecha_programada
                        ? v.fecha_programada.slice(0, 10)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {v.persona?.nombre || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {v.persona?.documento_identidad || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {v.persona?.empresa || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {v.actividad?.nombre_actividad || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {v.centro_datos?.nombre || "—"}
                    </td>
                    {isAdmin() && (
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <FaTrash size={14} /> Eliminar
                        </button>
                        <button
                          onClick={() => downloadPdf(v.id)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                        >
                          <FaDownload size={14} /> PDF
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronLeft /> Anterior
          </button>

          <div className="hidden sm:flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${page === p
                  ? "bg-blue-600 text-white border border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}