import { useState, useEffect } from "react";
import "../../css/registro_acceso.css";

export default function RegistroAcceso() {
  const [personas, setPersonas] = useState([]);
  const [q, setQ] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
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
    fecha_creacion: "",
  });
  const [newFoto, setNewFoto] = useState(null);

  // Traer datos de personas
  useEffect(() => {
    fetch("http://localhost:8000/api/v1/personas")
      .then(res => res.json())
      .then(json => {
        const items = Array.isArray(json) ? json : (json.items ?? json.data ?? []);
        setPersonas(items);
      });
  }, []);

  // Filtro en vivo
  useEffect(() => {
    const t = q.trim().toLowerCase();
    if (!t) setFiltered(personas);
    else {
      setFiltered(
        personas.filter(p =>
          String(p.documento_identidad || "").toLowerCase().includes(t)
        )
      );
    }
  }, [q, personas]);

  // Selección de persona conocida
  const onSelect = (p) => {
    setSelected(p);
    setForm({
      cedula: p.documento_identidad || "",
      nombre: p.nombre || "",
      apellido: p.apellido || "",
      email: p.email || "",
      empresa: p.empresa || "",
      cargo: p.cargo || "",
      direccion: p.direccion || "",
      observaciones: p.observaciones || "",
      foto: p.foto || "",
      unidad: p.empresa === "SENIAT" ? (p.unidad || "") : "",
      fecha_creacion: p.fecha_creacion || new Date().toISOString()
    });
    setQ(p.documento_identidad || "");
    setNewFoto(null);
  };

  // El mensaje de registrar
  const showNoResults = q && filtered.length === 0;

  // Al escribir cédula, limpiar todo para registro nuevo
  const onCedulaChange = (e) => {
    setQ(e.target.value.replace(/\D/g, ""));
    setSelected(null);
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
      fecha_creacion: new Date().toISOString(),
    });
    setNewFoto(null);
  };

  // Cuando sube imagen nueva
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFoto(URL.createObjectURL(file));
    // Aquí puedes guardar el file real para hacer POST luego si es necesario
    setForm(f => ({ ...f, foto: file }));
  };

  return (
    <div className="ra-root">
      <div className="ra-card">
        <form className="ra-grid" autoComplete="off">
          <div className="ra-title">REGISTRO ACCESO</div>
          <div className="ra-form">
            <div className="ra-row">
              <div className="ra-field" style={{ position: "relative" }}>
                <label className="ra-label">CÉDULA</label>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={q}
                  onChange={onCedulaChange}
                  className="ra-input"
                  autoFocus
                />
                {filtered.length > 0 && !selected && (
                  <ul className="ra-suggestions">
                    {filtered.map(p => (
                      <li key={p.id} onMouseDown={() => onSelect(p)}>
                        V-{p.documento_identidad} - {p.nombre} {p.apellido}
                      </li>
                    ))}
                  </ul>
                )}
                {showNoResults && (
                  <div className="ra-error">Debe registrarse</div>
                )}
              </div>
              <Field label="Nombre" value={form.nombre} disabled={!!selected} />
              <Field label="Apellido" value={form.apellido} disabled={!!selected} />
            </div>
            <div className="ra-row">
              <Field label="Correo" value={form.email} disabled={!!selected} />
              <Field label="Empresa" value={form.empresa} disabled={!!selected} />
              <Field label="Cargo" value={form.cargo} disabled={!!selected} />
            </div>
            <div className="ra-row">
              <Field label="Dirección" value={form.direccion} disabled={!!selected} />
              <Field label="Unidad" value={form.unidad} disabled={form.empresa !== "SENIAT" || !!selected} />
            </div>
            <div className="ra-row">
              <Field label="Observaciones" value={form.observaciones} disabled={!!selected} />
              <Field
                label="Fecha creación"
                value={form.fecha_creacion ? new Date(form.fecha_creacion).toLocaleDateString() : new Date().toLocaleDateString()}
                disabled
              />
            </div>
          </div>

          <div className="ra-media">
            {/* Foto */}
            {selected && selected.foto && (
              <img src={selected.foto} alt="foto" className="ra-image-preview" />
            )}
            {/* Si es registro nuevo, permite cargar */}
            {!selected && (
              <label className="ra-image-drop">
                {newFoto ? (
                  <img src={newFoto} alt="preview" className="ra-image-preview" />
                ) : (
                  <IconImage />
                )}
                <input type="file" accept="image/*" className="ra-file" onChange={onFileChange} />
              </label>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, disabled = false }) {
  return (
    <div className="ra-field">
      <label className="ra-label">{label}</label>
      <input
        value={value || ""}
        disabled={disabled}
        className="ra-input"
        readOnly={disabled}
      />
    </div>
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
  