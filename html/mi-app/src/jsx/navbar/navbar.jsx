import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../../css/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login"); // Navegamos después del logout
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
          <NavLink to="/personas" className={({isActive}) => `tab ${isActive ? "is-active" : ""}`}>
            Personas
          </NavLink>
        </nav>
      </div>

      <div className="nav__center">

      </div>

      <div className="nav__right">
        {isAuthenticated() ? (
          <>
            <span className="user-info">
              <button>
                <NavLink to="/perfil" className={({isActive}) => `tab ${isActive ? "is-active" : ""}`}>
                  Perfil
                </NavLink>
                👤 {user?.username}
              </button>
            </span>
              
            <button 
              className="btn btn--success" 
              onClick={() => navigate("/registro/visitante")}
            >
              Registro Visitante
            </button>
            <button 
              className="btn btn--success" 
              onClick={() => navigate("/accesos/nuevo")}
            >
              Crear Acceso
            </button>
            <button 
              className="btn btn--danger" 
              onClick={handleLogout}
            >
              Cerrar Sesión
            </button>
          </>
        ) : (
          <button 
            className="btn btn--primary" 
            onClick={() => navigate("/login")}
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    </header>
  );
}
