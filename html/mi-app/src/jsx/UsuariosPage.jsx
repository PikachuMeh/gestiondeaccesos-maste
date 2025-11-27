// src/jsx/UsuariosPage.jsx (actualizado: previene auto-eliminación en frontend)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // Asume que exporta 'user' con {id, ...}
import { useApi } from "../context/ApiContext.jsx"; 



export default function UsuariosPage() {

  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/usuarios`;
  const navigate = useNavigate();
  const { token, user, isSupervisorOrAbove, isAdmin, getCurrentRoleName } = useAuth();  // AGREGADO: 'user' para current_id
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  // Dentro de UsuariosPage
  const handleView = (usuarioId) => {
    navigate(`/usuarios/${usuarioId}`);
  };

  // Fetch (sin cambios)
  useEffect(() => {
    if (!token) {
      setError("No autenticado");
      setLoading(false);
      return;
    }
    const fetchUsuarios = async () => {
      try {
        const params = new URLSearchParams({ page, size });
        const response = await fetch(`${API_BASE}?${params.toString()}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setUsuarios(data.items || data);
        setError(null);
      } catch (err) {
        setError(`Error cargando usuarios: ${err.message}`);
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsuarios();
  }, [token, page, size]);

  // Handler para borrar (AGREGADO: check frontend para self-delete)
  const handleDelete = async (usuarioId, rolId) => {
    const currentUserId = user?.id;  // ID del usuario logueado
    if (!isSupervisorOrAbove()) {
      setError("No tienes permiso para eliminar usuarios");
      return;
    }
    // AGREGADO: Prevenir auto-eliminación en frontend
    if (usuarioId === currentUserId) {
      setError("No puedes eliminarte a ti mismo. Usa gestión de perfil para desactivar cuenta si es necesario.");
      return;
    }
    // Check para supervisores (no borrar otros supervisores)
    if (!isAdmin() && rolId === 2) {
      setError("Solo ADMIN puede eliminar supervisores");
      return;
    }
    if (!window.confirm(`¿Eliminar usuario con ID ${usuarioId} (${rolId === 1 ? 'ADMIN' : 'Operador/Supervisor'})? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/${usuarioId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }
      setUsuarios(prev => prev.filter(u => u.id !== usuarioId));
      setError(null);
      alert("Usuario eliminado correctamente");
    } catch (err) {
      setError(`Error eliminando usuario: ${err.message}`);
      console.error("Delete error:", err);
    }
  };

  // ... resto del useEffect y paginación sin cambios (loading, error, handlePageChange) ...

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Gestión de Operadores</h1>
        <div className="text-center py-12 text-gray-500">Cargando usuarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Gestión de Operadores</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
          Error: {error}
        </div>
        <button className="bg-[#00378B] text-white px-4 py-2 rounded-lg hover:bg-[#002A6B] transition-colors" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    );
  }

  const currentRole = getCurrentRoleName();
  const canDelete = isSupervisorOrAbove();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-surface rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Operadores</h1>
          {isAdmin() && (  // Solo ADMIN ve botón crear
            <button
              className="bg-[#00378B] text-white px-4 py-2 rounded-lg hover:bg-[#002A6B] transition-colors"
              onClick={() => navigate("/usuarios/nuevo")}
            >
              Crear Nuevo Usuario
            </button>
          )}
        </div>
        <div className="text-gray-600 mb-4">
          Rol actual: {currentRole} (ID: {user?.id}) | Visibles: {usuarios.length} usuarios
        </div>
      </div>
      <div className="bg-surface rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-variant">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
        <tbody className="bg-surface divide-y  divide-gray-200">
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No hay usuarios para mostrar (según tu rol).</td>
            </tr>
          ) : (
            usuarios.map((usuario) => {
              const isCurrentUser = usuario.id === user?.id;  // AGREGADO: Check si es el usuario actual
              const rolId = usuario.rol?.id_rol || 0;
              const canDeleteThis = canDelete &&
                                    !isCurrentUser &&  // No self-delete
                                    (isAdmin() || rolId === 3);  // ADMIN puede todo (excepto self); SUPERVISOR solo OPERADORES(3)

              return (
                <tr key={usuario.id} className="hover:bg-surface-variant cursor-pointer" onClick={() => handleView(usuario.id)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">{usuario.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">{usuario.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">{usuario.rol?.nombre_rol || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center truncate max-w-xs">{usuario.cedula || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface text-center">{usuario.activo ? "Sí" : "No"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {canDeleteThis ? (
                        <button
                          className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                          onClick={() => handleDelete(usuario.id, rolId)}
                          title="Eliminar usuario"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      ) : (
                        canDelete && isCurrentUser ? (
                          <button
                            className="text-gray-400 p-2 rounded-md cursor-not-allowed"
                            disabled
                            title="No puedes eliminarte a ti mismo"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin acciones</span>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>

      {/* Paginación */}
      {usuarios.length > 0 && (
        <div className="bg-surface px-4 py-3 flex items-center justify-between border-t border-outline sm:px-6 rounded-b-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => handlePageChange(page + 1)}
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Página <span className="font-medium">{page}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <span className="sr-only">Anterior</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {page}
                </span>
                <button
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  onClick={() => handlePageChange(page + 1)}
                >
                  <span className="sr-only">Siguiente</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
