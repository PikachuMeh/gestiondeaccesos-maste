// src/jsx/auth/ProtectedRoute.jsx
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children, requiredRoleId = null }) {
  const { isAuthenticated, loading, hasPermission, logout } = useAuth();

  useEffect(() => {
    // CORRECCIÓN: Solo ejecutar logout si NO está cargando y NO está autenticado.
    // Si está cargando (loading === true), todavía estamos esperando el token del localStorage.
    if (!loading && !isAuthenticated()) {
      logout();
    }
  }, [isAuthenticated, logout, loading]); // Agregamos 'loading' a las dependencias

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
    return <Navigate to="/accesos" replace />;
  }

  return children;
}