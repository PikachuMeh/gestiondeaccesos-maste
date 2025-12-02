// src/jsx/UsuariosPage.jsx - COMPLETO CON BOTÓN "REGISTRO DE USUARIOS"

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

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  const icon = type === "success" ? <FaCheckCircle /> : <FaTimesCircle />;

  return (
    <div className={`fixed bottom-5 right-5 px-6 py-4 ${bgColor} text-white rounded-lg shadow-lg z-50 flex items-center gap-3 animate-fade-in-up`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}

export default function UsuariosPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/usuarios`;
  const navigate = useNavigate();
  const { token, user, isSupervisorOrAbove, isAdmin, getCurrentRoleName, loading: authLoading } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);

  // Cargar usuarios
  useEffect(() => {
    if (authLoading) {
      return;
    }
    fetchUsuarios();
  }, [currentPage, authLoading]);

  const fetchUsuarios = async () => {
    try {
      setPageLoading(true);
      setError(null);

      console.log("📡 Fetching usuarios desde:", `${API_BASE}?skip=${(currentPage - 1) * PAGE_SIZE}&limit=${PAGE_SIZE}`);

      const response = await fetch(
        `${API_BASE}?skip=${(currentPage - 1) * PAGE_SIZE}&limit=${PAGE_SIZE}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📊 Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al cargar usuarios`);
      }

      const data = await response.json();
      console.log("✅ Datos recibidos:", data);

      // Manejo flexible de respuesta
      if (Array.isArray(data)) {
        setUsuarios(data);
      } else if (data.items && Array.isArray(data.items)) {
        setUsuarios(data.items);
      } else if (data.usuarios && Array.isArray(data.usuarios)) {
        setUsuarios(data.usuarios);
      } else if (data.data && Array.isArray(data.data)) {
        setUsuarios(data.data);
      } else {
        console.warn("⚠️ Formato de respuesta no reconocido:", data);
        setUsuarios([]);
      }
    } catch (err) {
      console.error("❌ Error fetching usuarios:", err);
      setError(err.message || "Error al cargar usuarios");
      setUsuarios([]);
    } finally {
      setPageLoading(false);
    }
  };

  const handleDelete = async (usuarioId) => {
    const currentUserId = user?.id;

    if (!isSupervisorOrAbove()) {
      setToast({ message: "No tienes permiso para eliminar usuarios", type: "error" });
      return;
    }

    if (usuarioId === currentUserId) {
      setToast({ message: "No puedes eliminarte a ti mismo", type: "error" });
      return;
    }

    if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${usuarioId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Error al eliminar");

      setToast({ message: "Usuario eliminado", type: "success" });
      fetchUsuarios();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const handleRowClick = (usuarioId) => {
    navigate(`/usuarios/${usuarioId}`);
  };

  // Mientras se autentica, no mostrar nada
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  // Contenido principal
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-800 min-h-screen">
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-lg flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FaUsers className="text-blue-600 dark:text-blue-400" /> Usuarios
        </h1>
        <button
          onClick={() => navigate("/usuarios/nuevo")}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <FaPlus /> Registro de Usuarios
        </button>
      </div>

      {pageLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          Cargando usuarios...
        </div>
      ) : usuarios.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          No hay usuarios registrados
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto border border-gray-200 dark:border-gray-700">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Activo
                  </th>
                  {isAdmin() && (
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => handleRowClick(u.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {u.nombre || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {u.username || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {u.rol?.nombre_rol || u.rol || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {u.cedula || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${u.activo
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                      >
                        {u.activo ? <><FaCheck size={10} /> Sí</> : <><FaTimes size={10} /> No</>}
                      </span>
                    </td>
                    {isAdmin() && (
                      <td
                        className="px-6 py-4 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          <FaTrash /> Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              <FaChevronLeft /> Anterior
            </button>
            <span className="px-4 py-2 font-medium text-gray-900 dark:text-white">Página {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={usuarios.length < PAGE_SIZE}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              Siguiente <FaChevronRight />
            </button>
          </div>
        </>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
