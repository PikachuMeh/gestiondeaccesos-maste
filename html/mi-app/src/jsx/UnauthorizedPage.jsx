// src/jsx/UnauthorizedPage.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, getCurrentRoleName } = useAuth();

  useEffect(() => {
    console.log('📵 Usuario sin permisos:', {
      username: user?.username,
      rol: getCurrentRoleName(),
    });
  }, [user, getCurrentRoleName]);

  const handleNavigateToAccesos = () => {
    navigate('/accesos', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
      {/* Navbar se renderiza aquí gracias a que estamos dentro del Layout/App */}
      
      {/* Contenido principal - Página en blanco */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          {/* Ícono de prohibido */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
                <svg
                  className="w-12 h-12 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M13.477 14.89A6 6 0 0 1 5.11 6.524a6 6 0 0 1 8.367 8.366zM18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-11-4a1 1 0 1 0-2 0 1 1 0 0 0 2 0zM6.3 6.3a1 1 0 0 1 1.414 0L10 8.586l2.293-2.293a1 1 0 1 1 1.414 1.414L11.414 10l2.293 2.293a1 1 0 0 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 0-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Títulos y mensaje */}
          <h1 className="text-3xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-gray-400 mb-2">
            No tienes permiso para acceder a esta sección.
          </p>

          {/* Info del usuario */}
          <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Tu usuario:</p>
            <p className="text-white font-semibold">{user?.username}</p>
            <p className="text-sm text-gray-500 mt-2 mb-1">Rol asignado:</p>
            <p className="text-primary font-semibold">{getCurrentRoleName()}</p>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-300">
              Selecciona una opción del menú superior para navegar a las secciones disponibles para tu rol.
            </p>
          </div>

          {/* Botón de acción */}
          <button
            onClick={handleNavigateToAccesos}
            className="w-full px-6 py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Ir a Accesos
          </button>
        </div>
      </main>

      {/* Footer opcional */}
      <footer className="border-t border-dark-700 py-4 px-6 text-center text-sm text-gray-500">
        <p>Gestión de Acceso • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
