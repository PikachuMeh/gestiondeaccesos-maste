import { useState } from 'react'
import "../css/navbar.css";  
import "../img/seniat_logo.png"

export default function Navbar() {
  const [active, setActive] = useState("accesos");

  return (
    <header className="nav">
      <div className="nav__left">
        <img className="nav__logo" src="src/img/seniat_logo.png" alt="SENIAT" />
        |
        <nav className="tabs" role="tablist" aria-label="Secciones">
          <button
            className={`tab ${active === "accesos" ? "is-active" : ""}`}
            onClick={() => setActive("accesos")}
            role="tab"
            aria-selected={active === "accesos"}
          >
            Accesos
          </button>
          <button
            className={`tab ${active === "personas" ? "is-active" : ""}`}
            onClick={() => setActive("personas")}
            role="tab"
            aria-selected={active === "personas"}
          >
            Personas
          </button>
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
        <button className="btn btn--success">Crear Acceso</button>
        <button className="link link--icon">
          <span className='link__icon'></span>
          Iniciar Sesion
        </button>
        <button className="link link--icon">
          <span className="link__icon" aria-hidden>👤</span>
          Desconectar
        </button>
        
      </div>
    </header>
  );
}
