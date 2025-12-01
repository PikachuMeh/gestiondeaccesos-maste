// src/jsx/UsuariosPage.jsx - COMPLETO CON BOTÓN "REGISTRO DE USUARIOS"

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";

const PAGE_SIZE = 10;

// TOAST NOTIFICATIONS
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "#4CAF50" : "#f44";
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: bgColor,
        color: "white",
        padding: "16px",
        borderRadius: "4px",
        zIndex: 1000,
      }}
    >
      {message}
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
        <div className="text-center text-gray-600">Cargando...</div>
      </div>
    );
  }

  // Contenido principal
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
          ❌ {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
        <button
          onClick={() => navigate("/usuarios/nuevo")}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>➕</span> Registro de Usuarios
        </button>
      </div>

      {pageLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Cargando usuarios...
        </div>
      ) : usuarios.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No hay usuarios registrados
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Activo
                  </th>
                  {isAdmin() && (
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => handleRowClick(u.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {u.nombre || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {u.username || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {u.rol?.nombre_rol || u.rol || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {u.cedula || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.activo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {u.activo ? "✓ Sí" : "✗ No"}
                      </span>
                    </td>
                    {isAdmin() && (
                      <td
                        className="px-6 py-4 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          🗑️ Eliminar
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
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              ← Anterior
            </button>
            <span className="px-4 py-2 font-medium">Página {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={usuarios.length < PAGE_SIZE}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Siguiente →
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
