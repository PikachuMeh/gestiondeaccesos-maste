// jsx/Navbar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import "../../css/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="nav">
      <div className="nav__left">
        <img className="nav__logo" src="/src/img/seniat_logo.png" alt="SENIAT" />
        <span className="nav__divider">|</span>
        <nav className="tabs" role="tablist" aria-label="Secciones">
          <NavLink to="/accesos" className={({isActive}) => `tab ${isActive ? "is-active" : ""}`}>Accesos</NavLink>
          <NavLink to="/personas" className={({isActive}) => `tab ${isActive ? "is-active" : ""}`}>Personas</NavLink>
        </nav>
      </div>

      <div className="nav__center">
        <div className="search">
          <span className="search__icon" aria-hidden>🔍</span>
          <input
            className="search__input"
            type="search"
            placeholder="Buscar..."
            aria-label="Buscar"
          />
        </div>
      </div>

      <div className="nav__right">
        <button className="btn btn--success" onClick={() => navigate("/registro/visitante")}>Registro Visitante</button>
        <button className="btn btn--success" onClick={() => navigate("/accesos/nuevo")}>Crear Acceso</button>
        <button className="link link--icon" onClick={() => navigate("/login")}>Iniciar Sesion</button>
        <button className="link link--icon" onClick={() => navigate("/login", { replace:true })}>Desconectar</button>
      </div>
    </header>
  );
}
