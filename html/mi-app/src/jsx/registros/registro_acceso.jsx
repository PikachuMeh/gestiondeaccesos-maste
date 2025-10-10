import { useState } from "react";
import "../../css/registro_acceso.css";

const onlyLetters = (s) => s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "").replace(/\s{2,}/g, " ");
const onlyDigits = (s) => s.replace(/\D/g, "");

export default function RegistroAcceso() {
  const [sala, setSala] = useState("TLCM");
  const [sede, setSede] = useState("MTC");
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    cedula: "",          // solo números visuales, se renderiza como V-xxxxxxxx
    nombre: "",
    correo: "",
    unidad: "",
    seccion: "",
    descripcion: "",
  });
  const [errors, setErrors] = useState({});

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };

  // Handlers por campo con sanitización
  const onCedula = (e) => {
    const value = onlyDigits(e.target.value);
    setForm(f => ({ ...f, cedula: value.slice(0, 10) })); // límite razonable
  };

  const onNombre = (e) => {
    setForm(f => ({ ...f, nombre: onlyLetters(e.target.value).trimStart() }));
  };

  const onUnidad = (e) => {
    setForm(f => ({ ...f, unidad: onlyLetters(e.target.value).trimStart() }));
  };

  const onSeccion = (e) => {
    setForm(f => ({ ...f, seccion: onlyLetters(e.target.value).trimStart() }));
  };

  const onCorreo = (e) => {
    setForm(f => ({ ...f, correo: e.target.value.trimStart() }));
  };

  // Validación al enviar
  const validate = () => {
    const err = {};
    if (!form.cedula) err.cedula = "Requerida";
    // ejemplo: mínimo 6 dígitos
    if (form.cedula && form.cedula.length < 6) err.cedula = "Mínimo 6 dígitos";

    if (!form.nombre) err.nombre = "Requerido";
    if (form.nombre && /[\d]/.test(form.nombre)) err.nombre = "Solo letras";

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.correo);
    if (!form.correo) err.correo = "Requerido";
    else if (!emailOk) err.correo = "Correo inválido";

    if (!form.unidad) err.unidad = "Requerida";
    if (form.unidad && /[\d]/.test(form.unidad)) err.unidad = "Solo letras";

    if (!form.seccion) err.seccion = "Requerida";
    if (form.seccion && /[\d]/.test(form.seccion)) err.seccion = "Solo letras";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      cedula: `V-${form.cedula}`,
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      unidad: form.unidad.trim(),
      seccion: form.seccion.trim(),
      descripcion: form.descripcion.trim(),
      sala,
      sede,
    };
    console.log("ENVIAR", payload);
    // TODO: fetch POST al backend con payload
  };

  return (
    <div className="ra-root">
      <div className="ra-card">
        <button aria-label="Cerrar" className="ra-close">×</button>

        <form className="ra-grid" onSubmit={onSubmit} noValidate>
          <div className="ra-title">REGISTRO ACCESO</div>

          <div className="ra-form">
            <div className="ra-row">
              <Field
                label="CEDULA"
                placeholder="V-00000000"
                value={form.cedula ? `V-${form.cedula}` : ""}
                onChange={onCedula}
                onKeyDown={(e) => {
                  // permitir borrar y mover, bloquear letras
                  const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];
                  if (allowed.includes(e.key)) return;
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                error={errors.cedula}
                // para que el cursor no se meta antes del prefijo
                onClick={(e) => {
                  const input = e.target;
                  const pos = input.selectionStart ?? 0;
                  if (pos < 2) {
                    // mover después del "V-"
                    requestAnimationFrame(() => {
                      input.setSelectionRange(2,2);
                    });
                  }
                }}
                renderInput={(props) => (
                  <input
                    {...props}
                    className={"ra-input " + (errors.cedula ? "has-error" : "")}
                    // Mostrar "V-" visualmente pero quitarlo al editar
                    onFocus={(e) => {
                      // al enfocar, quitar prefijo para editar dígitos
                      if (form.cedula) {
                        e.target.value = form.cedula;
                        // mover cursor al final
                        requestAnimationFrame(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length));
                      }
                    }}
                    onBlur={(e) => {
                      // al salir, volver a poner prefijo visual
                      const clean = onlyDigits(e.target.value);
                      setForm(f => ({ ...f, cedula: clean }));
                      e.target.value = clean ? `V-${clean}` : "";
                    }}
                  />
                )}
              />

              <Field
                label="NOMBRE"
                placeholder="Nombre y Apellido"
                value={form.nombre}
                onChange={onNombre}
                error={errors.nombre}
              />
            </div>

            <div className="ra-row">
              <Field
                label="CORREO"
                type="email"
                placeholder="correo@dominio.com"
                value={form.correo}
                onChange={onCorreo}
                error={errors.correo}
              />
              <Field
                label="UNIDAD"
                placeholder="Nombre de la unidad"
                value={form.unidad}
                onChange={onUnidad}
                error={errors.unidad}
              />
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
              <Field
                label="sección"
                placeholder="Ej. Redes, Soporte..."
                value={form.seccion}
                onChange={onSeccion}
                error={errors.seccion}
              />
              <Field
                label="Descripcion"
                placeholder="Motivo del acceso"
                value={form.descripcion}
                onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div className="ra-actions">
              <button className="ra-btn" type="submit">Enviar</button>
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
        </form>
      </div>
    </div>
  );
}

/* Subcomponentes */
function Field({ label, placeholder, type = "text", value, onChange, error, renderInput, ...rest }) {
  return (
    <div className="ra-field">
      <Label text={label} />
      {renderInput ? (
        renderInput({ type, placeholder, value, onChange, ...rest })
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={"ra-input " + (error ? "has-error" : "")}
          {...rest}
        />
      )}
      {error && <div className="ra-error">{error}</div>}
    </div>
  );
}

function Label({ text }) {
  return <span className="ra-label">{text}</span>;
}

function Pill({ children, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`ra-pill ${selected ? "is-selected" : ""}`}>
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
