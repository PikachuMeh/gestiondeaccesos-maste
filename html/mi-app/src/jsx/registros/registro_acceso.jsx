// src/components/RegistroAcceso.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";  // OK: Ya usado
import "../../css/registro_acceso.css";

// CORREGIDO: Helper para fetch con token (centraliza auth)
function apiFetch(url, options = {}) {
  const token = localStorage.getItem('access_token');  // Obtén token
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,  // Merge con custom headers si needed
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;  // AGREGADO: Token siempre si existe
  }

  return fetch(url, {
    ...options,
    headers,
  }).then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text();  // Detalle error
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token');  // Limpia token inválido
        window.location.href = '/login';  // Redirige login (o usa navigate si en router)
        throw new Error('Sesión expirada. Redirigiendo al login.');
      }
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    return response;
  });
}

export default function RegistroAcceso() {
  const navigate = useNavigate();

  // Cache de detalles por id para evitar refetch
  const [detalleCache, setDetalleCache] = useState(new Map());

  // Sugerencias y búsqueda
  const [sugerencias, setSugerencias] = useState([]); // [{id, documento_identidad, nombre, apellido}]
  const [q, setQ] = useState("");

  // Persona seleccionada y datos de solo lectura
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

  // Centros de datos
  const [centros, setCentros] = useState([]);
  const [cdSel, setCdSel] = useState("");
  const [cdDetalle, setCdDetalle] = useState(null);
  
  // Tipo de Actividad
  const [tiposActividad, setTiposActividad] = useState([]); // NUEVO: array de tipos
  const [idTipo_act, setidTipo_act] = useState(""); // ID seleccionado

  // Áreas
  // NUEVO: Estados para áreas
  const [areas, setAreas] = useState([]);
  const [areaSel, setAreaSel] = useState("");

  // Formulario de visita
  const [formVisita, setFormVisita] = useState({
    descripcion_actividad: "",
    fecha_programada: "",
    autorizado_por: "",
    equipos_ingresados: "",
    observaciones: "",
    id_estado: "1",
  });

  // NUEVO: Estado para el perfil del usuario autenticado
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const debounceRef = useRef();

  const API_PERSONAS = "http://localhost:8000/api/v1/personas";
  const API_VISITAS = "http://localhost:8000/api/v1/visitas";
  const API_CENTROS = "http://localhost:8000/api/v1/centros-datos";
  // NUEVO: API base para auth
  const API_AUTH = "http://localhost:8000/api/v1/auth";

  // CORREGIDO: Usa helper apiFetch (ya incluye token)
  async function fetchCurrentUser() {
    try {
      const response = await apiFetch(`${API_AUTH}/me`);
      const userData = await response.json();
      setCurrentUser(userData);
      
      // NUEVO: Actualiza formVisita con el nombre del usuario autenticado
      setFormVisita(prev => ({
        ...prev,
        autorizado_por: `${userData.nombre} ${userData.apellidos}`.trim(),  // Nombre completo
      }));
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Opcional: mostrar alerta o redirigir
    } finally {
      setUserLoading(false);
    }
  }

  // CORREGIDO: Usa apiFetch (agrega token)
  async function fetchCedulas() {
    const r = await apiFetch(`${API_PERSONAS}/cedulas`);
    const items = await r.json();
    return Array.isArray(items) ? items : (items.items ?? items.data ?? []);
  }
  async function searchCedulas(prefix) {
    const r = await apiFetch(`${API_PERSONAS}/search?q=${encodeURIComponent(prefix)}`);
    const items = await r.json();
    return Array.isArray(items) ? items : (items.items ?? items.data ?? []);
  }
  async function fetchPersonaById(id) {
    if (detalleCache.has(id)) return detalleCache.get(id);
    const r = await apiFetch(`${API_PERSONAS}/${id}`);
    const p = await r.json();
    setDetalleCache(prev => new Map(prev).set(id, p));
    return p;
  }

  // CORREGIDO: Usa apiFetch para centros
  async function loadCentros() {
    setLoading(true);
    try {
      const r = await apiFetch(`${API_CENTROS}?size=1000`);
      const json = await r.json();
      const list = Array.isArray(json) ? json : (json.items ?? []);
      setCentros(list);
    } catch (error) {
      console.error("Error cargando centros:", error);
      setCentros([]);
    } finally {
      setLoading(false);
    }
  }
  async function loadCentroDetalle(id) {
    if (!id) return setCdDetalle(null);
    try {
      const r = await apiFetch(`${API_CENTROS}/${id}`);
      const obj = await r.json();
      setCdDetalle(obj);
    } catch (error) {
      console.error("Error cargando detalle centro:", error);
      setCdDetalle(null);
    }
  }
  // CORREGIDO: Usa apiFetch para tipos actividad
  async function loadTipoActividad() {
    setLoading(true); // true en minúsculas
    try {
      const r = await apiFetch(`${API_VISITAS}/tipo_actividad`);
      const json = await r.json();
      setTiposActividad(json); // Guarda el resultado en el estado
    } catch (error) {
      console.error("Error cargando tipos de actividad:", error);
      setTiposActividad([]);
    } finally {
      setLoading(false); // false en minúsculas
    }
  }

  // CORREGIDO: Usa apiFetch para áreas
  async function loadAreasPorCentro(centro_id) {
    if (!centro_id) {
      setAreas([]);
      setAreaSel("");
      return;
    }
    
    setLoading(true);
    try {
      const r = await apiFetch(`${API_VISITAS}/areas/${centro_id}`);
      const json = await r.json();
      setAreas(json);
    } catch (error) {
      console.error("Error cargando áreas:", error);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  } 

  // Carga inicial (modificada)
  useEffect(() => {
    loadCentros();
    loadTipoActividad();
    fetchCedulas().then(setSugerencias).catch(console.error);
    fetchCurrentUser();  // NUEVO: Carga el usuario autenticado
  }, []);

  // Búsqueda con debounce
  const onCedulaChange = (e) => {
    const raw = e.target.value;
    const s = raw.replace(/\D/g, "");
    setQ(s);
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

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSugerencias(s ? await searchCedulas(s) : await fetchCedulas());  // CORREGIDO: Ahora con token
      } catch (err) {
        console.error(err);
        setSugerencias([]);  // Fallback vacío
      }
    }, 200);
  };

  // Selección persona
  const onSelectById = async (id) => {
    try {
      const p = await fetchPersonaById(id);  // CORREGIDO: Con token
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
        fecha_creacion: p.fecha_creacion || new Date().toISOString(),
      });
      setQ(String(p.documento_identidad || ""));
      setNewFoto(null);
    } catch (err) {
      console.error(err);
      alert("Error cargando persona seleccionada");
    }
  };

  // Imagen
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFoto(URL.createObjectURL(file));
    setForm(f => ({ ...f, foto: file }));
  };

  // Centro select
  const onCentroChange = async (e) => {
    const id = e.target.value;
    setCdSel(id);
    setAreaSel(""); // Resetear área seleccionada
    await loadCentroDetalle(id);  // CORREGIDO: Con token
    await loadAreasPorCentro(id); // Cargar áreas del centro seleccionado
  };

  const onAreaChange = (e) => {
    const id = e.target.value;
    console.log("Área seleccionada:", id); // DEBUG
    setAreaSel(id);
  };
  // Selección de tipo de actividad
  const onActividadChange = (e) => {
    const id = e.target.value;
    console.log("Tipo actividad seleccionado:", id); // DEBUG
    setidTipo_act(id);
  };
  // Form visita (modificado para prevenir edición de autorizado_por)
  function onChangeVisita(e) {
    const { name, value, type, checked } = e.target;
    // NUEVO: Prevenir cambios en autorizado_por si ya está poblado
    if (name === 'autorizado_por' && currentUser) {
      return;  // No permite editar
    }
    setFormVisita(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  // Validadores de cliente
  function validarDescripcion(desc) {
    return typeof desc === "string" && desc.trim().length >= 3;
  }

  // CORREGIDO: Usa apiFetch en POST (agrega token)
  async function onRegistrarAcceso() {
    if (!selected?.id) return alert("Seleccione un visitante");
    if (!cdSel) return alert("Seleccione un centro de datos");
    if (!idTipo_act || idTipo_act === "") {
      console.error("idTipo_act está vacío:", idTipo_act);
      return alert("Tiene que seleccionar una actividad");
    }
  
    // Validación de cliente para evitar 422
    if (!validarDescripcion(formVisita.descripcion_actividad)) {
      return alert("Ingrese una descripción de al menos 3 caracteres");
    }

    setPosting(true);
    try {
      const localDate = new Date();
      const tipoActividadId = parseInt(idTipo_act, 10);
      
      if (isNaN(tipoActividadId)) {
        throw new Error("ID de tipo de actividad inválido");
      }
      
      const body = {
        persona_id: selected.id,
        centro_datos_id: Number(cdSel),
        tipo_actividad_id: tipoActividadId,
        area_id: areaSel ? Number(areaSel) : null, // NUEVO: incluir area_id
        descripcion_actividad: formVisita.descripcion_actividad.trim(),
        fecha_programada: new Date().toISOString(),
        autorizado_por: formVisita.autorizado_por?.trim() || null,  // Ya poblado con el usuario
        equipos_ingresados: formVisita.equipos_ingresados?.trim() || null,
        observaciones: formVisita.observaciones?.trim() || null,
        estado_id: Number(formVisita.id_estado ?? 1),
      };

      console.log("Body enviado:", body);
      console.log("tipo_actividad_id:", body.tipo_actividad_id, typeof body.tipo_activividad_id);
      console.log("area_id:", body.area_id, typeof body.area_id);

      const res = await apiFetch(API_VISITAS, {  // CORREGIDO: Usa helper (POST con token)
        method: "POST",
        body: JSON.stringify(body),
      });
      
      const created = await res.json();
      navigate(`/accesos/${created.id}`);
    } catch (e) {
      console.error(e);
      alert(`Error al registrar visita: ${e.message}`);
    } finally {
      setPosting(false);
    }
  }

  const goRegistrarVisitante = () => navigate(`/registro/visitante?cedula=${encodeURIComponent(q || "")}`);
  const showNoResults = q && !selected && sugerencias.length === 0;

  // NUEVO: Manejo de loading para usuario
  if (userLoading) {
    return <div className="ra-loading">Cargando usuario...</div>;  // O un spinner personalizado
  }

  return (
    <div className="ra-root">
      <div className="ra-card">
        <form className="ra-grid" autoComplete="off" onSubmit={(e)=>e.preventDefault()}>
          <div className="ra-title">REGISTRO ACCESO</div>

          {/* Buscador de cédula SIEMPRE visible */}
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

                {!selected && sugerencias.length > 0 && (
                  <ul className="ra-suggestions">
                    {sugerencias.slice(0, 100).map(p => (
                      <li key={p.id} onMouseDown={() => onSelectById(p.id)}>
                        V-{p.documento_identidad} - {p.nombre} {p.apellido}
                      </li>
                    ))}
                  </ul>
                )}

                {showNoResults && (
                  <div className="ra-empty">
                    <div className="ra-error" style={{ marginBottom: 8 }}>
                      No se encontró la cédula. Puede registrar al visitante.
                    </div>
                    <button
                      type="button"
                      className="ra-button-primary"
                      onMouseDown={goRegistrarVisitante}
                    >
                      Registrar visitante
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resto del formulario solo si hay persona seleccionada */}
          {selected && (
            <>
              {/* Datos Persona */}
              <div className="ra-form">
                <div className="ra-row">
                  <Field label="Nombre" value={form.nombre} disabled />
                  <Field label="Apellido" value={form.apellido} disabled />
                </div>

                <div className="ra-row">
                  <Field label="Correo" value={form.email} disabled />
                  <Field label="Empresa" value={form.empresa} disabled />
                  <Field label="Cargo" value={form.cargo} disabled />
                </div>

                <div className="ra-row">
                  <Field label="Dirección" value={form.direccion} disabled />
                  <Field label="Unidad" value={form.unidad} disabled />
                </div>

                <div className="ra-row">
                  <Field label="Observaciones" value={form.observaciones} disabled />
                  <Field
                    label="Fecha de Registro"
                    value={form.fecha_creacion ? new Date(form.fecha_creacion).toLocaleDateString() : new Date().toLocaleDateString()}
                    disabled
                  />
                </div>
              </div>

              {/* Media */}
              <div className="ra-media">
                {selected?.foto && (
                  <img src={selected.foto} alt="foto" className="ra-image-preview" />
                )}
              </div>

              {/* Datos de visita */}
              <div className="ra-subtitle">Datos de visita</div>

              <div className="ra-row">
                <div className="ra-field">
                  <label className="ra-label">Centro de datos</label>
                  <select className="ra-input" value={cdSel} onChange={onCentroChange} required>
                    <option value="">Seleccione...</option>
                    {centros.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* NUEVO: Select de Área */}
                <div className="ra-field">
                  <label className="ra-label">Área</label>
                  <select 
                    className="ra-input" 
                    value={areaSel} 
                    onChange={onAreaChange}
                    disabled={!cdSel || areas.length === 0}
                  >
                    <option value="">Seleccione...</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="ra-field">
                  <label className="ra-label">Tipo de actividad</label>
                  <select 
                    className="ra-input" 
                    value={idTipo_act} 
                    onChange={onActividadChange}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {tiposActividad.map(t => (
                      <option key={t.id_tipo_actividad} value={t.id_tipo_actividad}>
                        {t.nombre_actividad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {cdDetalle && (
                <div className="ra-panel">
                  <div className="ra-panel-title">Centro seleccionado</div>
                  <div className="ra-panel-grid">
                    <Info label="Código" value={cdDetalle.codigo} />
                    <Info label="Ciudad" value={cdDetalle.ciudad} />
                    <Info label="País" value={cdDetalle.pais} />
                    <Info label="Unidad" value={cdDetalle.unidad} />
                    <Info label="Teléfono" value={cdDetalle.telefono_contacto || "—"} />
                    <Info label="Correo" value={cdDetalle.email_contacto || "—"} />
                    <Info label="Dirección" value={cdDetalle.direccion} full />
                    {cdDetalle.observaciones && <Info label="Observaciones" value={cdDetalle.observaciones} full />}
                  </div>
                </div>
              )}

              <div className="ra-row">
                <FieldEditable
                  label="Descripción"
                  name="descripcion_actividad"
                  value={formVisita.descripcion_actividad}
                  onChange={onChangeVisita}
                />
              </div>

              <div className="ra-row">
                {/* NUEVO: Campo deshabilitado para Autorizado por */}
                <FieldEditable
                  label="Autorizado por"
                  name="autorizado_por"
                  value={formVisita.autorizado_por || (currentUser ? `${currentUser.nombre} ${currentUser.apellidos}` : '')}
                  onChange={onChangeVisita}
                  disabled={!!currentUser}  // Deshabilita si hay usuario logueado
                />
              </div>

              <div className="ra-row">
                <FieldEditable
                  label="Equipos"
                  name="equipos_ingresados"
                  value={formVisita.equipos_ingresados}
                  onChange={onChangeVisita}
                />
                <FieldEditable
                  label="Observaciones"
                  name="observaciones"
                  value={formVisita.observaciones}
                  onChange={onChangeVisita}
                />
              </div>

              <div className="ra-actions">
                <button
                  type="button"
                  className="ra-button-primary"
                  onClick={onRegistrarAcceso}
                  disabled={posting || loading || !selected}
                >
                  {posting ? "Registrando..." : "Registrar acceso"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// Subcomponentes (modificado FieldEditable para soportar disabled)
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

function FieldEditable({ label, name, value, onChange, disabled = false }) {
  return (
    <div className="ra-field">
      <label className="ra-label">{label}</label>
      <input
        name={name}
        value={value || ""}
        onChange={onChange}
        className="ra-input"
        disabled={disabled}  // NUEVO: Soporte para disabled
      />
    </div>
  );
}

function Info({ label, value, full=false }) {
  return (
    <div className={`ra-info${full ? " ra-info-full" : ""}`}>
      <div className="ra-info-label">{label}</div>
      <div className="ra-info-value">{value ?? "—"}</div>
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
