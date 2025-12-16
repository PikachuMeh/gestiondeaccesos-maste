// src/jsx/auth/ProtectedRoute.jsx
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function ProtectedRoute({ children, requiredRoleId = null }) {
  const { isAuthenticated, loading, hasPermission, logout } = useAuth();

  useEffect(() => {
    console.log('ProtectedRoute: loading=', loading, 'isAuth=', isAuthenticated());
    
    // IMPORTANTE: Solo verificar cuando loading === false
    if (!loading && !isAuthenticated()) {
      console.log('❌ No autenticado, haciendo logout');
      logout();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // No está autenticado → ir a login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere un rol específico y NO lo tiene → REDIRIGIR A PÁGINA SIN PERMISO
  if (requiredRoleId !== null && !hasPermission(requiredRoleId)) {
    console.warn(`❌ Usuario sin permiso. Requiere rol: ${requiredRoleId}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Si pasa todas las validaciones → renderizar componente
  return children;
}