// src/jsx/UsuariosPage.jsx - CORREGIDO CON TEMA OSCURO

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import {
  FaPlus,
  FaTrash,
  FaCheck,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";

const PAGE_SIZE = 10;

// TOAST NOTIFICATIONS
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";
  const icon = type === "success" ?
    <FaCheckCircle className="text-2xl" /> :
    <FaTimesCircle className="text-2xl" />;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg flex items-center gap-3 shadow-lg animate-pulse z-50`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}

export default function UsuariosPage() {
  const { API_V1 } = useApi();
  const { token, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ✅ CARGAR USUARIOS - Recibe el número de página como parámetro
  const fetchUsuarios = async (pageNumber = 1) => {
    if (!token) {
      setError("No autenticado");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📥 Buscando usuarios: page=${pageNumber}, size=${PAGE_SIZE}`);
      
      const response = await fetch(
        `${API_V1}/usuarios/?page=${pageNumber}&size=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("✅ Datos recibidos:", {
        items: data.items?.length || 0,
        total: data.total,
        page: data.page,
        pages: data.pages,
      });

      // ✅ IMPORTANTE: Actualizar state desde la respuesta del API
      setUsuarios(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
      setCurrentPage(data.page || 1);
      
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  // ✅ CARGAR AL MONTAR
  useEffect(() => {
    fetchUsuarios(1);
  }, [token]);

  // ✅ BOTÓN ANTERIOR - Calcula la página ANTES de llamar
  const handlePrevious = () => {
    const nextPage = currentPage - 1;
    console.log(`⬅️  Anterior: ${currentPage} → ${nextPage}`);
    
    if (nextPage >= 1) {
      fetchUsuarios(nextPage);
    }
  };

  // ✅ BOTÓN SIGUIENTE - Calcula la página ANTES de llamar
  const handleNext = () => {
    const nextPage = currentPage + 1;
    console.log(`➡️  Siguiente: ${currentPage} → ${nextPage} (totalPages=${totalPages})`);
    
    if (nextPage <= totalPages) {
      fetchUsuarios(nextPage);
    }
  };

  // Manejador de eliminación
  const handleDelete = async (usuarioId) => {
    if (!isAdmin()) {
      setToast({ message: "Solo administradores pueden eliminar usuarios", type: "error" });
      return;
    }

    setDeletingId(usuarioId);

    try {
      const response = await fetch(`${API_V1}/usuarios/${usuarioId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Error eliminando usuario");
      }

      setToast({ message: "Usuario eliminado correctamente", type: "success" });
      
      setTimeout(() => {
        fetchUsuarios(currentPage);
      }, 500);
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: `Error: ${err.message}`, type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateUser = () => {
    navigate("/usuarios/nuevo");
  };

  const handleViewUser = (id) => {
    navigate(`/usuarios/${id}`);
  };

  // ============================================================================
  // RENDER - TEMA OSCURO
  // ============================================================================

  return (
    <div className="w-full min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FaUsers className="text-3xl text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Usuarios</h1>
          </div>

          {isAdmin() && (
            <button
              onClick={handleCreateUser}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold shadow-lg"
            >
              <FaPlus /> Registro de Usuarios
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg flex items-center gap-3">
            <FaExclamationCircle className="text-red-500 text-lg" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* TABLA */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No hay usuarios</div>
        ) : (
          <>
            <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden border border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700 border-b border-slate-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Nombre</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Usuario</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Rol</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Cédula</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200">Activo</th>
                      {isAdmin() && (
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u, idx) => (
                      <tr 
                        key={u.id} 
                        className={`border-b border-slate-700 transition-colors ${
                          idx % 2 === 0 
                            ? "bg-slate-800 hover:bg-slate-700" 
                            : "bg-slate-750 hover:bg-slate-700"
                        }`}
                      >
                        <td className="px-6 py-4 text-gray-100 font-medium">{u.nombre || "—"}</td>
                        <td className="px-6 py-4">
                          <code className="bg-slate-900 text-blue-400 px-3 py-1 rounded text-sm font-mono">
                            {u.username || "—"}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{u.rol?.nombre_rol || u.rol || "—"}</td>
                        <td className="px-6 py-4 text-gray-400">{u.cedula || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          {u.activo ? (
                            <span className="inline-block px-3 py-1 bg-green-900/40 text-green-400 border border-green-500/30 rounded-full text-xs font-semibold">
                              <FaCheck className="inline mr-1" /> Sí
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 bg-red-900/40 text-red-400 border border-red-500/30 rounded-full text-xs font-semibold">
                              <FaTimes className="inline mr-1" /> No
                            </span>
                          )}
                        </td>
                        {isAdmin() && (
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleViewUser(u.id)}
                              className="mr-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm font-semibold"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={deletingId === u.id}
                              className={`px-4 py-2 rounded text-white text-sm font-semibold transition-colors ${
                                deletingId === u.id
                                  ? "bg-gray-600 cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700"
                              }`}
                            >
                              <FaTrash className="inline mr-1" /> {deletingId === u.id ? "..." : "Eliminar"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGINACIÓN */}
            <div className="mt-8 flex items-center justify-center gap-6">
              {/* ✅ BOTÓN ANTERIOR - Deshabilitado en página 1 */}
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  currentPage === 1
                    ? "bg-slate-700 text-gray-500 cursor-not-allowed opacity-50"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                }`}
              >
                <FaChevronLeft /> Anterior
              </button>

              {/* INFO DE PÁGINA */}
              <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-md">
                <p className="text-gray-200 font-semibold">
                  Página <span className="text-blue-400">{currentPage}</span> de{" "}
                  <span className="text-blue-400">{totalPages}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  {usuarios.length} de {total} registros
                </p>
              </div>

              {/* ✅ BOTÓN SIGUIENTE - Deshabilitado en última página */}
              <button
                onClick={handleNext}
                disabled={currentPage >= totalPages}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  currentPage >= totalPages
                    ? "bg-slate-700 text-gray-500 cursor-not-allowed opacity-50"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                }`}
              >
                Siguiente <FaChevronRight />
              </button>
            </div>
          </>
        )}

        {/* TOAST */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}
