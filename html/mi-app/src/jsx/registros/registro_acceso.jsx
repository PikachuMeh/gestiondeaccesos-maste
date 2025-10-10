import { useState } from "react";
import "../../css/registro_acceso.css";

export default function RegistroAcceso() {
  const [sala, setSala] = useState("TLCM");
  const [sede, setSede] = useState("MTC");
  const [preview, setPreview] = useState(null);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  return (
    <div className="ra-root">
      <div className="ra-card">
        <button aria-label="Cerrar" className="ra-close">×</button>

        <div className="ra-grid">
          <div className="ra-title">REGISTRO ACCESO</div>

          <div className="ra-form">
            <div className="ra-row">
              <Field label="CEDULA" placeholder="V-00000000" />
              <Field label="NOMBRE" placeholder="Nombre y Apellido" />
            </div>

            <div className="ra-row">
              <Field label="CORREO" type="email" placeholder="correo@dominio.com" />
              <Field label="UNIDAD" placeholder="Nombre de la unidad" />
            </div>

            <div className="ra-row">
              <div className="ra-block">
                <Label text="Sala" />
                <div className="ra-pills">
                  <Pill selected={sala === "TLCM"} onClick={() => setSala("TLCM")}>TLCM</Pill>
                  <Pill selected={sala === "CPD"} onClick={() => setSala("CPD")}>CPD</Pill>
                </div>
              </div>

              <div className="ra-block">
                <Label text="Sede" />
                <div className="ra-pills">
                  <Pill selected={sede === "MTC"} onClick={() => setSede("MTC")}>MTC</Pill>
                  <Pill selected={sede === "PLZ"} onClick={() => setSede("PLZ")}>PLZ</Pill>
                </div>
              </div>
            </div>

            <div className="ra-row">
              <Field label="sección" placeholder="Ej. Redes, Soporte..." />
              <Field label="Descripcion" placeholder="Motivo del acceso" />
            </div>

            <div className="ra-actions">
              <button className="ra-btn">Enviar</button>
            </div>
          </div>

          <div className="ra-media">
            <label className="ra-image-drop">
              {preview ? (
                <img src={preview} alt="preview" className="ra-image-preview" />
              ) : (
                <IconImage />
              )}
              <input type="file" accept="image/*" className="ra-file" onChange={onFileChange} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Subcomponentes */
function Field({ label, placeholder, type = "text" }) {
  return (
    <div className="ra-field">
      <Label text={label} />
      <input type={type} placeholder={placeholder} className="ra-input" />
    </div>
  );
}

function Label({ text }) {
  return <span className="ra-label">{text}</span>;
}

function Pill({ children, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ra-pill ${selected ? "is-selected" : ""}`}
    >
      {children}
    </button>
  );
}

function IconImage() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" className="ra-icon">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 14l3-3 3 3 4-4 2 2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <circle cx="9" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  );
}
