// src/components/RoleRoutes.jsx
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export function OperatorProtected({ children }) {
  const { isOperatorOrAbove, loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    // CORRECCIÓN: Esperar a que termine de cargar
    if (!loading && !isAuthenticated()) {
      logout();
    }
  }, [isAuthenticated, logout, loading]);

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isOperatorOrAbove()) return <Navigate to="/accesos" replace />;

  return children;
}

export function AdminProtected({ children }) {
  const { isAdmin, loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    // CORRECCIÓN: Esperar a que termine de cargar
    if (!loading && !isAuthenticated()) {
      logout();
    }
  }, [isAuthenticated, logout, loading]);

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/accesos" replace />;

  return children;
}