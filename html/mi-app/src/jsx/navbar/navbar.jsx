import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";  // Asegúrate de la ruta
import { useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin, isSupervisorOrAbove, isOperatorOrAbove, isAuditor, getCurrentRoleName } = useAuth();  // AGREGADO: isAuditor
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

    return (
    <header className="bg-surface border-b border-outline shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <img className="h-8 w-auto" src="/src/img/seniat_logo.png" alt="SENIAT" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8" role="tablist" aria-label="Secciones">
            <NavLink
              to="/accesos"
              className={({isActive}) => `text-sm font-medium text-on-surface hover:text-on-surface/80 transition-colors ${isActive ? "text-primary font-semibold" : ""}`}
            >
              Accesos
            </NavLink>
            <NavLink
              to="/personas"
              className={({isActive}) => `text-sm font-medium text-on-surface hover:text-on-surface/80 transition-colors ${isActive ? "text-primary font-semibold" : ""}`}
            >
              Personas
            </NavLink>
            {/* CORREGIDO: Oculta "Operadores" si no es ADMIN/SUPERVISOR (excluye OPERADOR=3 y AUDITOR=4) */}
            {isSupervisorOrAbove() && (
              <NavLink
                to="/usuarios"
                className={({isActive}) => `text-sm font-medium text-on-surface hover:text-on-surface/80 transition-colors ${isActive ? "text-primary font-semibold" : ""}`}
              >
                Operadores
              </NavLink>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-on-surface hover:text-on-surface/80 p-2 rounded-md"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:block">
            {isAuthenticated() ? (
              <div className="relative">
                <button
                  onClick={toggleDropdown}
                  className="flex items-center gap-2 text-sm text-on-surface hover:text-on-surface/80 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {user?.username}
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-on-surface">
                        <div className="font-medium">{user?.username}</div>
                        <div className="text-gray-500">{getCurrentRoleName()}</div>
                      </div>
                      <div className="border-t border-gray-400"></div>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-variant transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2"
                onClick={() => navigate("/login")}
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-surface border-t border-outline">
              <NavLink
                to="/accesos"
                className={({isActive}) => `block px-3 py-2 text-base font-medium text-on-surface hover:text-on-surface/80 transition-colors ${isActive ? "text-primary font-semibold" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Accesos
              </NavLink>
              <NavLink
                to="/personas"
                className={({isActive}) => `block px-3 py-2 text-base font-medium text-on-surface hover:text-on-surface/80 transition-colors ${isActive ? "text-primary font-semibold" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Personas
              </NavLink>
              {isSupervisorOrAbove() && (
                <NavLink
                  to="/usuarios"
                  className={({isActive}) => `block px-3 py-2 text-base font-medium text-on-surface hover:text-on-surface/80 transition-colors ${isActive ? "text-primary font-semibold" : ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Operadores
                </NavLink>
              )}

              {/* Mobile Action Buttons */}
              <div className="pt-4 pb-3 border-t border-outline">
                {isAuthenticated() ? (
                  <>
                    {isOperatorOrAbove() && (
                      <button
                        className="block w-full text-left px-3 py-2 text-base font-medium text-on-surface hover:bg-surface-variant transition-colors"
                        onClick={() => { navigate("/registro/visitante"); setMobileMenuOpen(false); }}
                      >
                        Registro Visitante
                      </button>
                    )}
                    {isOperatorOrAbove() && (
                      <button
                        className="block w-full text-left px-3 py-2 text-base font-medium text-on-surface hover:bg-surface-variant transition-colors"
                        onClick={() => { navigate("/accesos/nuevo"); setMobileMenuOpen(false); }}
                      >
                        Crear Acceso
                      </button>
                    )}
                    {isAuditor() && (
                      <button
                        className="block w-full text-left px-3 py-2 text-base font-medium text-on-surface hover:bg-surface-variant transition-colors"
                        onClick={() => { navigate("/admin/gestion"); setMobileMenuOpen(false); }}
                      >
                        Gestión Avanzada
                      </button>
                    )}
                    <div className="pt-4 pb-3 border-t border-gray-400">
                      <div className="px-3 py-2">
                        <div className="text-base font-medium text-on-surface">{user?.username}</div>
                        <div className="text-sm text-gray-500">{getCurrentRoleName()}</div>
                      </div>
                      <button
                        onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                        className="block w-full text-left px-3 py-2 text-base font-medium text-on-surface hover:bg-surface-variant transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="block w-full text-left px-3 py-2 text-base font-medium text-on-surface hover:bg-surface-variant transition-colors"
                    onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
                  >
                    Iniciar Sesión
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}