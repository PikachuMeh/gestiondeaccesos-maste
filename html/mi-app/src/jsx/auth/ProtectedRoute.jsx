// src/jsx/auth/ProtectedRoute.jsx (actualizado)
import { useEffect } from "react";  // Nuevo: Para efecto de validación
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children, requiredRoleId = null }) {
  const { isAuthenticated, loading, hasPermission, logout } = useAuth();

  // Nuevo: Efecto para forzar logout si isAuthenticated cambia a false (token inválido)
  useEffect(() => {
    if (!isAuthenticated()) {
      logout();  // Limpia y redirige
    }
  }, [isAuthenticated, logout]);

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
