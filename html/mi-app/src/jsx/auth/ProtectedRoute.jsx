// src/jsx/auth/ProtectedRoute.jsx - CORREGIDO
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children, requiredRoleId = null }) {
  const { isAuthenticated, loading, hasPermission, logout } = useAuth();

  useEffect(() => {
    console.log("ProtectedRoute: loading=", loading, "isAuth=", isAuthenticated());
    
    // IMPORTANTE: Solo verificar cuando loading === false
    if (!loading && !isAuthenticated()) {
      console.log("❌ No autenticado, haciendo logout");
      logout();
    }
  }, [loading]); // ← SOLO loading en dependencias, no isAuthenticated

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
        ⏳ Cargando...
      </div>
    );
  }

  if (!isAuthenticated()) {
    console.log("ProtectedRoute: redirigiendo a /login");
    return <Navigate to="/login" replace />;
  }

  if (requiredRoleId !== null && !hasPermission(requiredRoleId)) {
    console.log("ProtectedRoute: acceso denegado por rol");
    return <Navigate to="/accesos" replace />;
  }

  return children;
}
