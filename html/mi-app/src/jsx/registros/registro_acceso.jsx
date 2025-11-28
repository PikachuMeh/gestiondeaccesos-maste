// src/components/RegistroAcceso.jsx - COMPLETO CORREGIDO ✅
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useApi } from "../../context/ApiContext.jsx";

// ✅ Helper sin hook - recibe token como parámetro
function apiFetch(url, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, {
    ...options,
    headers,
  }).then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        throw new Error('Sesión expirada. Redirigiendo al login.');
      }
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    return response;
  });
}

export default function RegistroAcceso() {
  const navigate = useNavigate();
  const { API_V1 } = useApi();  // ✅ Hook top-level componente

  // Estados varios
  const [detalleCache, setDetalleCache] = useState(new Map());
  const [sugerencias, setSugerencias] = useState([]);
  const [q, setQ] = useState("");
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

  // ✅ 1 CENTRO ÚNICO + MÚLTIPLES ÁREAS
  const [centros, setCentros] = useState([]);
  const [cdSel, setCdSel] = useState(null);
  const [areas, setAreas] = useState([]);
  const [areasSel, setAreasSel] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);
  const [idTipo_act, setidTipo_act] = useState("");

  const [formVisita, setFormVisita] = useState({
    descripcion_actividad: "",
    autorizado_por: "",
    equipos_ingresados: "",
    observaciones: "",
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const debounceRef = useRef();

  const API_PERSONAS = `${API_V1}/personas`;
  const API_VISITAS = `${API_V1}/visitas`;
  const API_CENTROS = `${API_V1}/visitas/centros-datos`;
  const API_AUTH = `${API_V1}/auth`;

  async function fetchCurrentUser() {
    try {
      const response = await apiFetch(`${API_AUTH}/me`);
      const userData = await response.json();
      setCurrentUser(userData);
      setFormVisita(prev => ({
        ...prev,
        autorizado_por: `${userData.nombre} ${userData.apellidos}`.trim(),
      }));
    } catch (error) {
      console.error('Error fetching current user:', error);
    } finally {
      setUserLoading(false);
    }
  }

  // ✅ SELECCIÓN CENTRO ÚNICO
  const onCentroCheckboxChange = (id) => {
    setCdSel(id);
    setAreasSel([]);
    if (id) {
      loadAreasPorCentro(id);
    } else {
      setAreas([]);
    }
  };

  // ✅ SELECCIÓN MÚLTIPLES ÁREAS
  const onAreaCheckboxChange = (id) => {
    setAreasSel(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

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

  async function loadCentros() {
    setLoading(true);
    try {
      const r = await apiFetch(API_CENTROS);
      const json = await r.json();
      setCentros(json);
    } catch (error) {
      console.error("❌ Error cargando centros:", error);
      setCentros([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAreasPorCentro(centro_id) {
    if (!centro_id) {
      setAreas([]);
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

  async function loadTipoActividad() {
    setLoading(true);
    try {
      const r = await apiFetch(`${API_VISITAS}/tipo_actividad`);
      const json = await r.json();
      setTiposActividad(json);
    } catch (error) {
      console.error("Error cargando tipos de actividad:", error);
      setTiposActividad([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCentros();
    loadTipoActividad();
    fetchCedulas().then(setSugerencias).catch(console.error);
    fetchCurrentUser();
  }, []);

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
        setSugerencias(s ? await searchCedulas(s) : await fetchCedulas());
      } catch (err) {
        console.error(err);
        setSugerencias([]);
      }
    }, 200);
  };

  const getSelectedActividadName = () => {
    const selectedTipo = tiposActividad.find(
      t => String(t.id_tipo_actividad) === String(idTipo_act)
    );
    return selectedTipo ? selectedTipo.nombre_actividad : null;
  };
  const requiereEquiposYObs = ["1", "2", "3", "6", "7"].includes(String(idTipo_act));

  const onSelectById = async (id) => {
    try {
      const p = await fetchPersonaById(id);
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

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFoto(URL.createObjectURL(file));
    setForm(f => ({ ...f, foto: file }));
  };

  const onActividadChange = (e) => {
    const id = e.target.value;
    setidTipo_act(id);
  };

  function onChangeVisita(e) {
    const { name, value, type, checked } = e.target;
    if (name === 'autorizado_por' && currentUser) {
      return;
    }
    setFormVisita(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function validarDescripcion(desc) {
    return typeof desc === "string" && desc.trim().length >= 3;
  }

  // ✅ POST: 1 CENTRO + MÚLTIPLES ÁREAS
  async function onRegistrarAcceso() {
    if (!selected?.id) return alert("Seleccione un visitante");
    if (!cdSel) return alert("Seleccione un centro de datos");
    if (!idTipo_act || idTipo_act === "") {
      console.error("idTipo_act está vacío:", idTipo_act);
      return alert("Tiene que seleccionar una actividad");
    }
    if (!validarDescripcion(formVisita.descripcion_actividad)) {
      return alert("Ingrese una descripción de al menos 3 caracteres");
    }

    setPosting(true);
    try {
      const tipoActividadId = parseInt(idTipo_act, 10);
      if (isNaN(tipoActividadId)) {
        throw new Error("ID de tipo de actividad inválido");
      }

      const body = {
        persona_id: selected.id,
        centro_datos_id: Number(cdSel),
        centro_datos_ids: [Number(cdSel)],
        tipo_actividad_id: tipoActividadId,
        area_ids: areasSel.map(Number),
        descripcion_actividad: formVisita.descripcion_actividad.trim(),
        fecha_programada: new Date().toISOString(),
        autorizado_por: formVisita.autorizado_por?.trim() || null,
        equipos_ingresados: formVisita.equipos_ingresados?.trim() || null,
        observaciones: formVisita.observaciones?.trim() || null,
        estado_id: 1,
      };

      const res = await apiFetch(API_VISITAS, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const created = await res.json();
      alert(`✅ Visita creada exitosamente (Centro: ${centros.find(c => c.id === cdSel)?.nombre}, Áreas: ${areasSel.length})`);

      // Reset form
      setCdSel(null);
      setAreasSel([]);
      setAreas([]);
      setidTipo_act("");
      setFormVisita({
        descripcion_actividad: "",
        autorizado_por: formVisita.autorizado_por,
        equipos_ingresados: "",
        observaciones: ""
      });

      navigate(`/accesos/${created.id}`);

    } catch (e) {
      console.error("❌ Error:", e);
      alert(`Error al registrar visita: ${e.message}`);
    } finally {
      setPosting(false);
    }
  }

  const goRegistrarVisitante = () => navigate(`/registro/visitante?cedula=${encodeURIComponent(q || "")}`);
  const showNoResults = q && !selected && sugerencias.length === 0;

  // ✅ CONSTRUIR URL DE FOTO DESDE API (como en DetallePersonaPage)
  const fotoUrl = selected?.foto ? `${API_V1}/personas/foto/${selected.foto}` : null;

  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-500">Cargando usuario...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px] gap-6">
          {/* Left side - FORMULARIO */}
          <div className="p-8">
            <form className="space-y-5" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="text-2xl font-semibold text-on-surface mb-8">REGISTRO ACCESO</div>

              {/* CÉDULA */}
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-on-surface mb-2">CÉDULA</label>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={q}
                    onChange={onCedulaChange}
                    className="block w-full px-0 py-2 border-b border-gray-200 bg-transparent text-on-surface placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                    autoFocus
                  />
                  {!selected && sugerencias.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full bg-surface border border-outline rounded-lg shadow-lg max-h-60 overflow-auto">
                      {sugerencias.slice(0, 100).map(p => (
                        <li key={p.id} className="px-3 py-2 hover:bg-surface-variant cursor-pointer text-on-surface" onMouseDown={() => onSelectById(p.id)}>
                          V-{p.documento_identidad} - {p.nombre} {p.apellido}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {showNoResults && (
                  <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-800 mb-2">
                      No se encontró la cédula. Puede registrar al visitante.
                    </div>
                    <button
                      type="button"
                      className="bg-[#00378B] text-white px-4 py-2 rounded-lg hover:bg-[#002A6B] transition-colors"
                      onMouseDown={goRegistrarVisitante}
                    >
                      Registrar visitante
                    </button>
                  </div>
                )}
              </div>

              {/* DATOS VISITA */}
              {selected && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-on-surface">Datos de visita</h3>

                    {/* CENTRO DE DATOS - SOLO 1 */}
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Centro de datos {cdSel && `(1 seleccionado)`}
                      </label>
                      <div className="flex w-full gap-4 flex-wrap">
                        {centros.map((c) => (
                          <label key={c.id} className="cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={cdSel === c.id}
                              onChange={() => onCentroCheckboxChange(c.id)}
                            />
                            <span
                              className={`
                                flex justify-center items-center flex-1 px-4 py-3
                                rounded-full border-2 border-gray-200 transition-all shadow-sm
                                text-sm font-semibold h-14
                                ${cdSel === c.id
                                  ? 'bg-[#8ADD64] text-white border-green-400 shadow-md scale-105'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:border-gray-400 hover:scale-105'
                                }
                              `}
                              style={{ width: '100%' }}
                            >
                              {c.nombre}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ÁREAS - MÚLTIPLES */}
                    {cdSel && areas.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                          Áreas ({areasSel.length} seleccionada{areasSel.length !== 1 ? 's' : ''})
                        </label>
                        <div className="flex w-full gap-3 flex-wrap">
                          {areas.map((a) => (
                            <label key={a.id} className="cursor-pointer flex-1 min-w-[140px]">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={areasSel.includes(a.id)}
                                onChange={() => onAreaCheckboxChange(a.id)}
                              />
                              <span
                                className={`
                                  flex justify-center items-center px-3 py-2
                                  rounded-full border-2 border-gray-200 transition-all shadow-sm
                                  text-xs font-medium h-12
                                  ${areasSel.includes(a.id)
                                    ? 'bg-[#8ADD64] text-white border-green-400 shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:border-gray-400'
                                  }
                                `}
                                style={{ width: '100%' }}
                              >
                                {a.nombre}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {!cdSel && areas.length === 0 && (
                      <div className="text-sm text-on-surface-variant p-4 bg-surface-variant/50 rounded-lg">
                        Seleccione un centro para ver sus áreas disponibles
                      </div>
                    )}

                    {/* TIPO ACTIVIDAD */}
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Tipo de actividad
                      </label>
                      <select
                        className="block w-full px-0 py-2 border-b border-gray-200 bg-transparent text-on-surface focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        value={idTipo_act}
                        onChange={onActividadChange}
                        required
                      >
                        <option value="">Seleccione...</option>
                        {tiposActividad.map((t) => (
                          <option key={t.id_tipo_actividad} value={t.id_tipo_actividad}>
                            {t.nombre_actividad}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CAMPOS TEXTO */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">Descripción *</label>
                      <input
                        name="descripcion_actividad"
                        value={formVisita.descripcion_actividad}
                        onChange={onChangeVisita}
                        className="block w-full px-0 py-2 border-b border-gray-200 bg-transparent text-on-surface focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="Describa el motivo de la visita..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">Autorizado por</label>
                      <input
                        name="autorizado_por"
                        value={formVisita.autorizado_por || (currentUser ? `${currentUser.nombre} ${currentUser.apellidos}` : '')}
                        onChange={onChangeVisita}
                        className="block w-full px-0 py-2 border-b border-gray-200 bg-transparent text-on-surface focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        disabled={!!currentUser}
                      />
                    </div>
                  </div>

                  {requiereEquiposYObs && (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Equipos ingresados</label>
                        <input
                          name="equipos_ingresados"
                          value={formVisita.equipos_ingresados}
                          onChange={onChangeVisita}
                          className="block w-full px-0 py-2 border-b border-gray-200 bg-transparent text-on-surface focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                          placeholder="Laptop, celular, documentos..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Observaciones</label>
                        <input
                          name="observaciones"
                          value={formVisita.observaciones}
                          onChange={onChangeVisita}
                          className="block w-full px-0 py-2 border-b border-gray-200 bg-transparent text-on-surface focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                          placeholder="Información adicional..."
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-start pt-6">
                    <button
                      type="button"
                      className="bg-primary text-primary-foreground px-10 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      onClick={onRegistrarAcceso}
                      disabled={posting || loading || !selected || !cdSel || !idTipo_act}
                    >
                      {posting
                        ? <span>🔄 Registrando...</span>
                        : <span>✅ Registrar acceso <span className="ml-1">({cdSel ? 1 : 0} centro)</span></span>
                      }
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Right side - FOTO */}
          <div className="bg-primary flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/95 to-primary/80"></div>
            <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
              <div className="w-full h-full bg-linear-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
            </div>
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full transform rotate-45 animate-bounce" style={{ animationDuration: '3s' }}></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/20 rounded-full transform -rotate-12 animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="text-center relative z-10">
              {fotoUrl ? (
                <div className="w-72 h-72 mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/30 transform hover:scale-105 transition-all duration-500 hover:rotate-1">
                  <img
                    src={fotoUrl}
                    alt={`Foto de ${selected.nombre} ${selected.apellido}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='288' height='288' viewBox='0 0 288 288'%3E%3Crect fill='%23e0e0e0' width='288' height='288'/%3E%3Ctext x='50%' y='50%' fill='%23999' text-anchor='middle' dy='.3em' font-size='32'%3ESin Foto%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              ) : (
                <div className="w-72 h-72 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl ring-4 ring-white/30 transform hover:scale-105 transition-all duration-500 hover:rotate-1">
                  <svg className="w-32 h-32 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}

              {selected && (
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">{selected.nombre} {selected.apellido}</h3>
                  <p className="text-white/90 text-lg drop-shadow-md">{selected.empresa}</p>
                  {form.empresa === "SENIAT" && selected.unidad && (
                    <p className="text-white/80 text-sm drop-shadow-md">{selected.unidad}</p>
                  )}
                </div>
              )}
              {!selected && (
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">Registro de Acceso</h3>
                  <p className="text-white/90 text-lg drop-shadow-md">Complete el formulario izquierdo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

