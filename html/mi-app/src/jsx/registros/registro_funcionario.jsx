import { useState } from "react";
import "../../css/registro_persona.css";

const onlyLetters = (s) => s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "").replace(/\s{2,}/g, " ");
const onlyDigits = (s) => s.replace(/\D/g, "");

export default function RegistroPersona() {
  const [form, setForm] = useState({
    cedula: "",
    nombre: "",
    apellido: "",
    email: "",
    empresa: "",
    cargo: "",
    direccion: "",
    observaciones: "",
    foto: "", // solo para referencia
    unidad: "",
  });
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setForm((f) => ({ ...f, foto: url })); // Guarda la URL, no el archivo
  };

  const onCedula = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm(f => ({ ...f, cedula: value }));
  };

  const onNombre = (e) => setForm(f => ({ ...f, nombre: onlyLetters(e.target.value).trimStart() }));
  const onApellido = (e) => setForm(f => ({ ...f, apellido: onlyLetters(e.target.value).trimStart() }));
  const onCorreo = (e) => setForm(f => ({ ...f, email: e.target.value.trimStart() }));
  const onEmpresa = (e) => setForm(f => ({ ...f, empresa: onlyLetters(e.target.value).trimStart() }));
  const onCargo = (e) => setForm(f => ({ ...f, cargo: onlyLetters(e.target.value).trimStart() }));
  const onDireccion = (e) => setForm(f => ({ ...f, direccion: e.target.value.trimStart() }));
  const onObservaciones = (e) => setForm(f => ({ ...f, observaciones: e.target.value }));
  const onUnidad = (e) => setForm(f => ({ ...f, unidad: onlyLetters(e.target.value).trimStart() }));

  const validate = () => {
    const err = {};
    if (!form.cedula) err.cedula = "Requerida";
    if (!form.nombre) err.nombre = "Requerido";
    if (!form.apellido) err.apellido = "Requerido";
    if (!form.email) err.email = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) err.email = "Correo inválido";
    if (!form.empresa) err.empresa = "Requerida";
    if (!form.direccion) err.direccion = "Requerida";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const clearForm = () => {
    setForm({
      cedula: "",
      nombre: "",
      apellido: "",
      email: "",
      empresa: "",
      cargo: "",
      direccion: "",
      observaciones: "",
      foto: "",
      unidad: "",
    });
    setPreview(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      documento_identidad: form.cedula ? `V-${form.cedula}` : "",
      email: form.email.trim(),
      empresa: form.empresa.trim(),
      cargo: form.cargo.trim(),
      direccion: form.direccion.trim(),
      observaciones: form.observaciones.trim(),
      foto: preview || "", // Usa la URL de preview como string
    };

    try {
      const res = await fetch("http://localhost:8000/api/v1/personas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalMsg("Persona registrada correctamente.");
      } else {
        const data = await res.json();
        setModalMsg("Error: " + (data.detail || "No se pudo registrar"));
      }
      setShowModal(true);
    } catch (err) {
      setModalMsg("Error de conexión: " + err.message);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    clearForm();
  };

  return (
    <>
      <div className="rp-root">
        <div className="rp-card">
          <form className="rp-form" onSubmit={onSubmit} noValidate>
            <h2 className="rp-title">REGISTRO DE PERSONA</h2>
            <div className="rp-fields">
              <Field
                label="Cédula"
                value={form.cedula ? `V-${form.cedula}` : "V-"}
                onChange={e => {
                  const sinPrefijo = e.target.value.startsWith("V-") ? e.target.value.slice(2) : e.target.value;
                  setForm(f => ({ ...f, cedula: onlyDigits(sinPrefijo).slice(0,10) }));
                }}
                error={errors.cedula}
              />
              <Field label="Nombre" value={form.nombre} onChange={onNombre} error={errors.nombre} />
              <Field label="Apellido" value={form.apellido} onChange={onApellido} error={errors.apellido} />
              <Field label="Correo" type="email" value={form.email} onChange={onCorreo} error={errors.email} />
              <Field label="Empresa" value={form.empresa} onChange={onEmpresa} error={errors.empresa} />
              <Field label="Cargo" value={form.cargo} onChange={onCargo} error={errors.cargo} />
              <Field label="Dirección" value={form.direccion} onChange={onDireccion} error={errors.direccion} />
              <Field label="Unidad" value={form.unidad} onChange={onUnidad} error={errors.unidad} />
              <div className="rp-field rp-field-observaciones">
                <label className="rp-label">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={onObservaciones}
                  className="rp-input"
                  rows={3}
                  style={{ width: "100%" }}
                />
                {errors.observaciones && <div className="rp-error">{errors.observaciones}</div>}
              </div>
            </div>
            <div className="rp-photo">
              <label className="rp-photo-drop">
                {preview ? (
                  <img src={preview} alt="Foto" className="rp-photo-preview" />
                ) : (
                  <IconImage />
                )}
                <input type="file" accept="image/*" className="rp-file" onChange={onFileChange} />
              </label>
            </div>
            <div className="rp-actions">
              <button className="rp-btn" type="submit">Registrar Persona</button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal dentro del return */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <span>{modalMsg}</span>
            <button className="modal-btn" onClick={handleCloseModal}>Aceptar</button>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value, onChange, error, type = "text" }) {
  return (
    <div className="rp-field">
      <label className="rp-label">{label}</label>
      <input value={value} onChange={onChange} className="rp-input" type={type} />
      {error && <div className="rp-error">{error}</div>}
    </div>
  );
}

function IconImage() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" className="rp-icon">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 14l3-3 3 3 4-4 2 2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <circle cx="9" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}
