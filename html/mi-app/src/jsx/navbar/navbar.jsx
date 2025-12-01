// src/jsx/components/Navbar.jsx - COMPLETO CON TAILWIND Y ROLES

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const {
    user,
    logout,
    isAdmin,
    isSupervisorOrAbove,
    isOperatorOrAbove,
    isAuditor,
    getCurrentRoleName,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    return location.pathname === path
      ? "bg-blue-600 text-white"
      : "text-gray-700 hover:bg-gray-100";
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              to={
                isAuditor()
                  ? "/auditoria"
                  : isSupervisorOrAbove()
                  ? "/usuarios"
                  : "/accesos"
              }
              className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              🔐 Gestión de Acceso
            </Link>
          </div>

          {/* ✅ MENÚ DINÁMICO SEGÚN ROL */}
          <div className="hidden md:flex items-center gap-6">
            {/* ADMIN (rol_id = 1) - Todo */}
            {isAdmin() && (
              <>
                <Link
                  to="/usuarios"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/usuarios"
                  )}`}
                >
                  👥 Usuarios
                </Link>
                <Link
                  to="/accesos"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/accesos"
                  )}`}
                >
                  🚪 Accesos
                </Link>
                <Link
                  to="/personas"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/personas"
                  )}`}
                >
                  📋 Personas
                </Link>
                <Link
                  to="/auditoria"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/auditoria"
                  )}`}
                >
                  📊 Auditoría
                </Link>
              </>
            )}

            {/* SUPERVISOR (rol_id = 2) - Usuarios, Accesos, Personas */}
            {isSupervisorOrAbove() && !isAdmin() && (
              <>
                <Link
                  to="/usuarios"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/usuarios"
                  )}`}
                >
                  👥 Usuarios
                </Link>
                <Link
                  to="/accesos"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/accesos"
                  )}`}
                >
                  🚪 Accesos
                </Link>
                <Link
                  to="/personas"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/personas"
                  )}`}
                >
                  📋 Personas
                </Link>
              </>
            )}

            {/* OPERADOR (rol_id = 3) - Accesos, Personas */}
            {isOperatorOrAbove() && !isSupervisorOrAbove() && (
              <>
                <Link
                  to="/accesos"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/accesos"
                  )}`}
                >
                  🚪 Accesos
                </Link>
                <Link
                  to="/personas"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/personas"
                  )}`}
                >
                  📋 Personas
                </Link>
              </>
            )}

            {/* AUDITOR (rol_id = 4) - Solo Auditoría */}
            {isAuditor() && (
              <>
                <Link
                  to="/auditoria"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/auditoria"
                  )}`}
                >
                  📊 Auditoría
                </Link>
              </>
            )}

            {/* Separador */}
            <div className="border-l border-gray-300 h-6"></div>

            {/* Perfil (Para todos) */}
            <Link
              to="/perfil"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                "/perfil"
              )}`}
            >
              ⚙️ Perfil
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>

          {/* Usuario Info */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="text-gray-900 font-medium">{user?.username || "Usuario"}</p>
              <p className="text-gray-500 text-xs">{getCurrentRoleName()}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100">
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
