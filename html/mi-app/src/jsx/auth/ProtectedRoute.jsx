// src/jsx/auth/ProtectedRoute.jsx (actualizado)
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children, requiredRoleId = null }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh" 
      }}>
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoleId !== null && !hasPermission(requiredRoleId)) {
    return <Navigate to="/accesos" replace />;  // Ruta base para operadores
  }

  return children;
}
