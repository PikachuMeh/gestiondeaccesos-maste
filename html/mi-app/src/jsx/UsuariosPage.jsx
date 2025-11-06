// src/jsx/UsuariosPage.jsx (actualizado: previene auto-eliminación en frontend)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";  // Asume que exporta 'user' con {id, ...}
import "../css/usuarios.css";

const API_BASE = "http://localhost:8000/api/v1/usuarios";

export default function UsuariosPage() {
  const navigate = useNavigate();
  const { token, user, isSupervisorOrAbove, isAdmin, getCurrentRoleName } = useAuth();  // AGREGADO: 'user' para current_id
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

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
      <div className="usuarios-screen">
        <h1>Gestión de Operadores</h1>
        <div className="loading">Cargando usuarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usuarios-screen">
        <h1>Gestión de Operadores</h1>
        <div className="error">Error: {error}</div>
        <button onClick={() => window.location.reload()}>Recargar</button>
      </div>
    );
  }

  const currentRole = getCurrentRoleName();
  const canDelete = isSupervisorOrAbove();

  return (
    <div className="usuarios-screen">
      <h1>Gestión de Operadores</h1>
      <div className="info-rol">
        Rol actual: {currentRole} (ID: {user?.id}) | Visibles: {usuarios.length} usuarios
      </div>
      <table className="usuarios-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Nombre de usuario</th>
            <th>Rol</th>
            <th>Cédula</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan="6" className="no-data">No hay usuarios para mostrar (según tu rol).</td>
            </tr>
          ) : (
            usuarios.map((usuario) => {
              const isCurrentUser = usuario.id === user?.id;  // AGREGADO: Check si es el usuario actual
              const rolId = usuario.rol?.id_rol || 0;
              const canDeleteThis = canDelete && 
                                    !isCurrentUser &&  // No self-delete
                                    (isAdmin() || rolId === 3);  // ADMIN puede todo (excepto self); SUPERVISOR solo OPERADORES(3)
              
              return (
                <tr key={usuario.id}>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.username}</td>
                  <td>{usuario.rol?.nombre_rol || "N/A"}</td>
                  <td>{usuario.cedula || "N/A"}</td>
                  <td>{usuario.activo ? "Sí" : "No"}</td>
                  <td className="acciones">
                    <button 
                      className="btn btn--primary" 
                      onClick={() => navigate(`/usuarios/${usuario.id}`)}
                    >
                      Ver
                    </button>
                    {canDeleteThis ? (
                      <button 
                        className="btn btn--danger" 
                        onClick={() => handleDelete(usuario.id, rolId)}
                      >
                        Borrar
                      </button>
                    ) : (
                      canDelete && isCurrentUser ? (
                        <button 
                          className="btn btn--danger" 
                          disabled
                          title="No puedes eliminarte a ti mismo"
                        >
                          Borrar (Prohibido)
                        </button>
                      ) : (
                        <span className="no-permission" title="Sin permiso para este rol/usuario">
                          Sin acciones
                        </span>
                      )
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Paginación (sin cambios) */}
      {usuarios.length > 0 && (
        <div className="paginacion">
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
            Anterior
          </button>
          <span>Página {page}</span>
          <button onClick={() => handlePageChange(page + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  );
}
