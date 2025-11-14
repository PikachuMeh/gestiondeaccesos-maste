// src/components/RoleRoutes.jsx (o src/jsx/auth/RoleRoute.jsx)
import { useEffect } from "react";  // Nuevo: Para efectos de validación
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";  // Ajusta ruta si está en jsx/auth

// Para operadores y arriba (consulta/registrar personas, visitas; requiredRoleId=3)
export function OperatorProtected({ children }) {
  const { isOperatorOrAbove, loading, isAuthenticated, logout } = useAuth();

  // Nuevo: Efecto para forzar logout si no autenticado
  useEffect(() => {
    if (!isAuthenticated()) {
      logout();
    }
  }, [isAuthenticated, logout]);

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isOperatorOrAbove()) return <Navigate to="/accesos" replace />;  // Vista básica

  return children;
}

// Para solo admins (gestión avanzada, borrados; requiredRoleId=1)
export function AdminProtected({ children }) {
  const { isAdmin, loading, isAuthenticated, logout } = useAuth();

  // Nuevo: Efecto para forzar logout si no autenticado
  useEffect(() => {
    if (!isAuthenticated()) {
      logout();
    }
  }, [isAuthenticated, logout]);

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/accesos" replace />;

  return children;
}
