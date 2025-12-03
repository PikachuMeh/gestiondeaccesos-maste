// src/jsx/components/Navbar.jsx - COMPLETO CON TAILWIND Y ROLES

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  FaUsers,
  FaDoorOpen,
  FaClipboardList,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaKey,
  FaMoon,
  FaSun
} from "react-icons/fa";

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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    return location.pathname === path
      ? "bg-blue-700 dark:bg-blue-700 text-white"
      : "text-white hover:bg-blue-500 dark:text-gray-200 dark:hover:bg-gray-700";
  };

  return (
    <nav className="bg-blue-600 dark:bg-gray-800 shadow-lg border-b border-blue-700 dark:border-gray-700 transition-colors duration-200">
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
              className="flex items-center gap-2 text-xl font-bold text-white hover:text-blue-100 transition-colors"
            >
              <FaKey />
              <span>Gestión de Acceso</span>
            </Link>
          </div>

          {/* ✅ MENÚ DINÁMICO SEGÚN ROL */}
          <div className="hidden md:flex items-center gap-4">
            {/* ADMIN (rol_id = 1) - Todo */}
            {isAdmin() && (
              <>
                <Link
                  to="/usuarios"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/usuarios"
                  )}`}
                >
                  <FaUsers /> Usuarios
                </Link>
                <Link
                  to="/accesos"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/accesos"
                  )}`}
                >
                  <FaDoorOpen /> Accesos
                </Link>
                <Link
                  to="/personas"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/personas"
                  )}`}
                >
                  <FaClipboardList /> Personas
                </Link>
                <Link
                  to="/auditoria"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/auditoria"
                  )}`}
                >
                  <FaChartBar /> Auditoría
                </Link>
              </>
            )}

            {/* SUPERVISOR (rol_id = 2) - Usuarios, Accesos, Personas */}
            {isSupervisorOrAbove() && !isAdmin() && (
              <>
                <Link
                  to="/usuarios"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/usuarios"
                  )}`}
                >
                  <FaUsers /> Usuarios
                </Link>
                <Link
                  to="/accesos"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/accesos"
                  )}`}
                >
                  <FaDoorOpen /> Accesos
                </Link>
                <Link
                  to="/personas"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/personas"
                  )}`}
                >
                  <FaClipboardList /> Personas
                </Link>
              </>
            )}

            {/* OPERADOR (rol_id = 3) - Accesos, Personas */}
            {isOperatorOrAbove() && !isSupervisorOrAbove() && (
              <>
                <Link
                  to="/accesos"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/accesos"
                  )}`}
                >
                  <FaDoorOpen /> Accesos
                </Link>
                <Link
                  to="/personas"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/personas"
                  )}`}
                >
                  <FaClipboardList /> Personas
                </Link>
              </>
            )}

            {/* AUDITOR (rol_id = 4) - Solo Auditoría */}
            {isAuditor() && (
              <>
                <Link
                  to="/auditoria"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                    "/auditoria"
                  )}`}
                >
                  <FaChartBar /> Auditoría
                </Link>
              </>
            )}

            {/* Theme Toggle */}
            <div className="border-l border-blue-500 dark:border-gray-600 h-6"></div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-white dark:text-gray-200 hover:bg-blue-500 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </button>

            {/* Perfil (Para todos) */}
            <Link
              to={`/usuarios/${user?.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                `/usuarios/${user?.id}`
              )}`}
            >
              <FaCog /> Perfil
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>

          {/* Usuario Info */}
          <div className="hidden md:flex items-center gap-3 ml-4">
            <div className="text-right text-sm">
              <p className="text-white dark:text-white font-medium">{user?.username || "Usuario"}</p>
              <p className="text-blue-100 dark:text-gray-400 text-xs">{getCurrentRoleName()}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-white dark:text-gray-200 hover:bg-blue-500 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </button>
            <button className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-500">
              <FaBars className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
