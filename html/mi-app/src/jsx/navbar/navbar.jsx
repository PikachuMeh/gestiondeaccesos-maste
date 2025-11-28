// src/jsx/Navbar.jsx - VERSIÓN CON IMAGENES CORRECTA (COMO LOGIN)
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useApi } from "../../context/ApiContext.jsx";
import { useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const { API_BASE_URL } = useApi();
  const {
    user,
    logout,
    isAuthenticated,
    isAdmin,
    isSupervisorOrAbove,
    isOperatorOrAbove,
    isAuditor,
    getCurrentRoleName,
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleCloseDropdown = () => {
    setDropdownOpen(false);
  };

  // Navlinks comunes para evitar repetición
  const navLinks = [
    { to: "/accesos", label: "Accesos", show: true },
    { to: "/personas", label: "Personas", show: true },
    { to: "/usuarios", label: "Operadores", show: isSupervisorOrAbove() },
  ];

  const actionButtons = [
    {
      label: "Registro de Visitante",
      show: isOperatorOrAbove(),
      onClick: () => navigate("/registrar/visitante"),
    },
    {
      label: "Crear Acceso",
      show: isOperatorOrAbove(),
      onClick: () => navigate("/registrar/acceso"),
    },
    {
      label: "Gestión Avanzada",
      show: isAuditor(),
      onClick: () => navigate("/auditoria"),
    },
  ];

  // ✅ Logo desde API_BASE_URL (igual que en LoginPage)
  const logoUrl = `${API_BASE_URL}/src/img/seniat_logo.png`;

  return (
    <header className="bg-surface border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <img
              className="h-10 w-auto"
              src={logoUrl}
              alt="SENIAT Logo"
              onError={(e) => {
                e.target.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect fill='%23e0e0e0' width='40' height='40'/%3E%3Ctext x='50%' y='50%' fill='%23999' text-anchor='middle' dy='.3em' font-size='10'%3ESeniat%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex space-x-8"
            role="tablist"
            aria-label="Secciones principales"
          >
            {navLinks.map(
              (link) =>
                link.show && (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? "text-[#00378B] underline font-semibold"
                          : "text-zinc-400 hover:text-on-surface/80"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                )
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-on-surface hover:text-on-surface/80 hover:bg-surface-variant transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop Actions and User Menu */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated() ? (
              <>
                {/* Action Buttons */}
                {actionButtons.map(
                  (btn) =>
                    btn.show && (
                      <button
                        key={btn.label}
                        onClick={btn.onClick}
                        className="inline-flex items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-colors bg-[#8ADD64] hover:bg-[#7BCF5A] text-white h-9 px-3 sm:px-4 py-2 whitespace-nowrap"
                      >
                        {btn.label}
                      </button>
                    )
                )}

                {/* User Dropdown */}
                <div className="relative ml-2">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    onBlur={() => setTimeout(handleCloseDropdown, 200)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-variant transition-colors"
                    aria-expanded={dropdownOpen}
                    aria-label="User menu"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">{user?.username}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg border border-outline z-50">
                      <div className="py-1">
                        <div className="px-4 py-3 border-b border-outline">
                          <div className="text-sm font-medium text-on-surface">
                            {user?.username}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getCurrentRoleName()}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            handleLogout();
                            handleCloseDropdown();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-variant transition-colors"
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#00378B] hover:bg-[#002A6B] text-white h-9 px-4 py-2"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-3 border-t border-outline">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map(
                (link) =>
                  link.show && (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={handleCloseMobileMenu}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                          isActive
                            ? "text-[#00378B] underline font-semibold bg-surface-variant"
                            : "text-zinc-400 hover:text-on-surface/80 hover:bg-surface-variant"
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  )
              )}
            </nav>

            {/* Mobile Action Buttons */}
            <div className="px-2 pt-4 pb-3 border-t border-outline space-y-2">
              {isAuthenticated() ? (
                <>
                  {actionButtons.map(
                    (btn) =>
                      btn.show && (
                        <button
                          key={btn.label}
                          onClick={() => {
                            btn.onClick();
                            handleCloseMobileMenu();
                          }}
                          className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-[#8ADD64] hover:bg-[#7BCF5A] text-white transition-colors"
                        >
                          {btn.label}
                        </button>
                      )
                  )}

                  {/* Mobile User Section */}
                  <div className="px-3 py-3 border-t border-outline mt-2">
                    <div className="text-base font-medium text-on-surface">
                      {user?.username}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {getCurrentRoleName()}
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        handleCloseMobileMenu();
                      }}
                      className="block w-full text-left mt-3 px-3 py-2 rounded-md text-base font-medium text-on-surface hover:bg-surface-variant transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    navigate("/login");
                    handleCloseMobileMenu();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-on-surface hover:bg-surface-variant transition-colors"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

