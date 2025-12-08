// src/jsx/UsuariosPage.jsx - MEJORADO (Click en toda la fila)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import {
  FaPlus,
  FaCheck,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaToggleOn,
  FaToggleOff
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
  const [togglingId, setTogglingId] = useState(null);

  // ✅ CARGAR USUARIOS
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

  // ✅ BOTÓN ANTERIOR
  const handlePrevious = () => {
    const nextPage = currentPage - 1;
    console.log(`⬅️  Anterior: ${currentPage} → ${nextPage}`);
    
    if (nextPage >= 1) {
      fetchUsuarios(nextPage);
    }
  };

  // ✅ BOTÓN SIGUIENTE
  const handleNext = () => {
    const nextPage = currentPage + 1;
    console.log(`➡️  Siguiente: ${currentPage} → ${nextPage} (totalPages=${totalPages})`);
    
    if (nextPage <= totalPages) {
      fetchUsuarios(nextPage);
    }
  };

  // ✅ CLICK EN FILA - NAVEGA AL PERFIL
  const handleRowClick = (usuarioId, e) => {
    // Si clickeamos en el botón toggle, no navegamos
    if (e.target.closest('button')) {
      return;
    }
    
    console.log(`🔗 Navegando al perfil del usuario ${usuarioId}`);
    navigate(`/usuarios/${usuarioId}`);
  };

  // ✅ TOGGLE ACTIVAR/DESACTIVAR USUARIO
  const handleToggleActivo = async (usuarioId, estadoActual, e) => {
    // Evitar que se navegue cuando clickeamos el toggle
    e.stopPropagation();

    if (!isAdmin()) {
      setToast({ message: "Solo administradores pueden cambiar el estado", type: "error" });
      return;
    }

    setTogglingId(usuarioId);
    const nuevoEstado = !estadoActual;
    const accion = nuevoEstado ? "Activar" : "Desactivar";

    try {
      console.log(`🔄 ${accion} usuario ${usuarioId}...`);
      console.log(`Enviando: { activo: ${nuevoEstado} }`);
      
      const formData = new FormData();
      formData.append("activo", nuevoEstado);

      const response = await fetch(`${API_V1}/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log(`Respuesta status: ${response.status}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Error response:", errData);
        throw new Error(errData.detail || `Error ${accion.toLowerCase()}`);
      }

      const responseData = await response.json();
      console.log(`✅ Usuario ${accion.toLowerCase()}do:`, responseData);

      setToast({ 
        message: `Usuario ${accion.toLowerCase()}do correctamente`, 
        type: "success" 
      });
      
      setTimeout(() => {
        fetchUsuarios(currentPage);
      }, 500);

    } catch (err) {
      console.error("❌ Error en handleToggleActivo:", err);
      setToast({ message: `Error: ${err.message}`, type: "error" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateUser = () => {
    navigate("/crear-usuario");
  };

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
                        onClick={(e) => handleRowClick(u.id, e)}
                        className={`border-b border-slate-700 transition-colors cursor-pointer ${
                          idx % 2 === 0 
                            ? "bg-slate-800 hover:bg-slate-700" 
                            : "bg-slate-750 hover:bg-slate-700"
                        }`}
                      >
                        <td className="px-6 py-4 text-gray-100 font-medium">{u.nombre || "—"}</td>
                        
                        <td className="px-6 py-4">
                          <span className="bg-slate-900 text-blue-400 px-3 py-1 rounded text-sm font-mono">
                            {u.username || "—"}
                          </span>
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
                              onClick={(e) => handleToggleActivo(u.id, u.activo, e)}
                              disabled={togglingId === u.id}
                              title={u.activo ? "Desactivar usuario" : "Activar usuario"}
                              className={`text-2xl transition-all transform hover:scale-110 ${
                                togglingId === u.id
                                  ? "opacity-50 cursor-not-allowed"
                                  : u.activo
                                  ? "text-green-400 hover:text-green-300"
                                  : "text-red-400 hover:text-red-300"
                              }`}
                            >
                              {togglingId === u.id ? (
                                <span className="text-sm">...</span>
                              ) : u.activo ? (
                                <FaToggleOn />
                              ) : (
                                <FaToggleOff />
                              )}
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

              <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-md">
                <p className="text-gray-200 font-semibold">
                  Página <span className="text-blue-400">{currentPage}</span> de{" "}
                  <span className="text-blue-400">{totalPages}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  {usuarios.length} de {total} registros
                </p>
              </div>

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