import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";  // Asegúrate de la ruta
import "../../css/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin, isSupervisorOrAbove, isOperatorOrAbove, isAuditor, getCurrentRoleName } = useAuth();  // AGREGADO: isAuditor

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

    return (
    <header className="nav">
      <div className="nav__left">
        <img className="nav__logo" src="/src/img/seniat_logo.png" alt="SENIAT" />
        <span className="nav__divider">|</span>
        <nav className="tabs" role="tablist" aria-label="Secciones">
          <NavLink to="/accesos" className={({isActive}) => `tab ${isActive ? "is-active" : ""}`}>
            Accesos
          </NavLink>
          <NavLink to="/personas" className={({isActive}) => `tab ${isActive ? "isActive" : ""}`}>
            Personas
          </NavLink>
          {/* CORREGIDO: Oculta "Operadores" si no es ADMIN/SUPERVISOR (excluye OPERADOR=3 y AUDITOR=4) */}
          {isSupervisorOrAbove() && (
            <NavLink to="/usuarios" className={({isActive}) => `tab ${isActive ? "is-active" : ""}`}>
              Operadores
            </NavLink>
          )}
        </nav>
      </div>

      <div className="nav__center"></div>

      <div className="nav__right">
        {isAuthenticated() ? (
          <>
            <span className="user-info">
              <button>
                <NavLink to="/perfil" className={({isActive}) => `tab ${isActive ? "is-active" : ""}`}>
                  Perfil
                </NavLink>
                👤 {user?.username} ({getCurrentRoleName()})
              </button>
            </span>
              
            {/* SIN CAMBIOS: Botones para OPERADOR+ (1,2,3): crear visitas/accesos/personas */}
            {isOperatorOrAbove() && (
              <button className="btn btn--success" onClick={() => navigate("/registro/visitante")}>
                Registro Visitante
              </button>
            )}
            {isOperatorOrAbove() && (
              <button className="btn btn--success" onClick={() => navigate("/accesos/nuevo")}>
                Crear Acceso
              </button>
            )}
            {isAuditor() && (  // Solo AUDITOR: gestión avanzada */}
              <button className="btn btn--warning" onClick={() => navigate("/admin/gestion")}>
                Gestión Avanzada (Borrados)
              </button>
            )}
            <button className="btn btn--danger" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </>
        ) : (
          <button className="btn btn--primary" onClick={() => navigate("/login")}>
            Iniciar Sesión
          </button>
        )}
      </div>
    </header>
  );
}