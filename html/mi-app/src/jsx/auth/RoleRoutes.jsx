// src/components/RoleRoutes.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

// Para operadores y arriba (consulta/registrar personas, visitas; requiredRoleId=2)
export function OperatorProtected({ children }) {
  const { isOperatorOrAbove, loading, isAuthenticated } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isOperatorOrAbove()) return <Navigate to="/accesos" replace />;  // Vista básica

  return children;
}

// Para solo admins (gestión avanzada, borrados; requiredRoleId=1)
export function AdminProtected({ children }) {
  const { isAdmin, loading, isAuthenticated } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/accesos" replace />;

  return children;
}
