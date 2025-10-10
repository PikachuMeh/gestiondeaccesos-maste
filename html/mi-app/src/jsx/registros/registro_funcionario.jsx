import { useState } from "react";
import "../../css/registro_funcionario.css";

export default function RegistroFuncionario() {
  const [tipo, setTipo] = useState("Funcionario");
  const [sede, setSede] = useState("MTC");
  const [preview, setPreview] = useState(null);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  };

  return (
    <div className="rf-root">
      <div className="rf-card">
        <button aria-label="Cerrar" className="rf-close">×</button>

        <div className="rf-grid">
          <div className="rf-title">REGISTRO PERSONA FUNCIONARIO</div>

          <div className="rf-left">
            <Field label="CEDULA" placeholder="V-00000000" />
            <Field label="NOMBRE" placeholder="Nombre y Apellido" />

            <div className="rf-group">
              <Label text=" " />
              <div className="rf-pill-row">
                <Pill
                  selected={tipo === "Funcionario"}
                  onClick={() => setTipo("Funcionario")}
                >
                  Funcionario
                </Pill>
                <Pill
                  selected={tipo === "Externo"}
                  onClick={() => setTipo("Externo")}
                  variant="gray"
                >
                  Externo
                </Pill>
              </div>
            </div>

            <Field label="UNIDAD" placeholder="Nombre de la unidad" />
            <Field label="CORREO" type="email" placeholder="correo@dominio.com" />

            <div className="rf-group">
              <Label text="Sede" />
              <div className="rf-pill-row">
                <Pill
                  selected={sede === "MTC"}
                  onClick={() => setSede("MTC")}
                >
                  MTC
                </Pill>
                <Pill
                  selected={sede === "PLZ"}
                  onClick={() => setSede("PLZ")}
                  variant="gray"
                >
                  PLZ
                </Pill>
              </div>
            </div>

            <div className="rf-actions">
              <button className="rf-btn-success">Enviar</button>
            </div>
          </div>

          <div className="rf-right">
            <label className="rf-image-box">
              {preview ? (
                <img src={preview} alt="preview" className="rf-image" />
              ) : (
                <IconImage />
              )}
              <input type="file" accept="image/*" className="rf-file" onChange={onFileChange} />
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
    <div className="rf-field">
      <Label text={label} />
      <input type={type} placeholder={placeholder} className="rf-input" />
    </div>
  );
}

function Label({ text }) {
  return <span className="rf-label">{text}</span>;
}

function Pill({ children, selected, onClick, variant = "blue" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rf-pill",
        variant === "gray" ? "is-gray" : "is-blue",
        selected ? "is-selected" : ""
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function IconImage() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" className="rf-icon">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 14l3-3 3 3 4-4 2 2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <circle cx="9" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  );
}
