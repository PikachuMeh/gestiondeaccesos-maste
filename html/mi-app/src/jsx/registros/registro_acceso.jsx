// src/components/RegistroAcceso.jsx - COMPLETO CON MENSAJES DE ERROR + TEMA DINÁMICO (LIGHT/DARK)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useApi } from "../../context/ApiContext.jsx";
import { useImages } from "../../context/ImageContext.jsx";


// ✅ Helper sin hook - recibe token como parámetro
function apiFetch(url, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { ...options.headers, };
  // Si es FormData, NO setear Content-Type (el navegador lo hará automáticamente)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers, }).then(async (response) => {
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
  const { API_V1 } = useApi(); // ✅ Hook top-level componente
  const { getImageUrl } = useImages(); // ✅ Para construir URLs de imagen


  // Estados varios
  const [detalleCache, setDetalleCache] = useState(new Map());
  const [sugerencias, setSugerencias] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    cedula: "", nombre: "", apellido: "", email: "", empresa: "", cargo: "",
    direccion: "", observaciones: "", foto: "", unidad: "", fecha_creacion: "",
  });
  const [newFoto, setNewFoto] = useState(null);
  const [fotoFile, setFotoFile] = useState(null); // ✅ Para guardar el archivo
  const [imagenError, setImagenError] = useState(false); // ✅ Para manejar errores de imagen


  // ✅ 1 CENTRO ÚNICO + MÚLTIPLES ÁREAS
  const [centros, setCentros] = useState([]);
  const [cdSel, setCdSel] = useState(null);
  const [areas, setAreas] = useState([]);
  const [areasSel, setAreasSel] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);
  const [idTipo_act, setidTipo_act] = useState("");
  const [formVisita, setFormVisita] = useState({
    descripcion_actividad: "", autorizado_por: "", equipos_ingresados: "", observaciones: "",
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);


  // ✅ ESTADOS PARA MENSAJES DE ERROR EN CAMPOS
  const [errors, setErrors] = useState({
    visitante: false,
    centro: false,
    actividad: false,
    descripcion: false,
    general: ""
  });


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
        ...prev, autorizado_por: `${userData.nombre} ${userData.apellidos}`.trim(),
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
    // Limpiar error del centro
    setErrors(prev => ({ ...prev, centro: false }));
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
      cedula: "", nombre: "", apellido: "", email: "", empresa: "", cargo: "",
      direccion: "", observaciones: "", foto: "", unidad: "", fecha_creacion: new Date().toISOString(),
    });
    setNewFoto(null);
    setFotoFile(null); // ✅ Reset foto file
    setImagenError(false); // ✅ Reset error de imagen
    // Limpiar error de visitante
    setErrors(prev => ({ ...prev, visitante: false }));
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


  // ✅ OBTENER URL DE FOTO CONSTRUIDA CORRECTAMENTE
  const getFotoPersonaUrl = () => {
    if (newFoto) { // Si hay una foto nueva cargada localmente, usa su URL blob
      return newFoto;
    }
    const fotoDelForm = form.foto;
    if (!fotoDelForm) return null;
    // Si ya es una URL completa (contiene http), úsala directamente
    if (typeof fotoDelForm === 'string' && fotoDelForm.startsWith('http')) {
      return fotoDelForm;
    }
    // Si es un nombre de archivo, construye la URL con getImageUrl
    if (typeof fotoDelForm === 'string') {
      return getImageUrl("persona", fotoDelForm);
    }
    return null;
  };


  const onSelectById = async (id) => {
    try {
      const p = await fetchPersonaById(id);
      setSelected(p);
      // ✅ Construir la URL de foto completa con getImageUrl
      const fotoUrl = p.foto ? getImageUrl("persona", p.foto) : "";
      setForm({
        cedula: p.documento_identidad || "",
        nombre: p.nombre || "",
        apellido: p.apellido || "",
        email: p.email || "",
        empresa: p.empresa || "",
        cargo: p.cargo || "",
        direccion: p.direccion || "",
        observaciones: p.observaciones || "",
        foto: fotoUrl, // ✅ Aquí guardas la URL completa
        unidad: p.empresa === "SENIAT" ? (p.unidad || "") : "",
        fecha_creacion: p.fecha_creacion || new Date().toISOString(),
      });
      setQ(String(p.documento_identidad || ""));
      setNewFoto(null);
      setFotoFile(null); // ✅ Reset foto file
      setImagenError(false); // ✅ Reset error de imagen
    } catch (err) {
      console.error(err);
    }
  };


  const onFileChange = (e) => {
    console.log(e)
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFoto(URL.createObjectURL(file));
    setFotoFile(file); // ✅ Guardar el archivo original
    setForm(f => ({ ...f, foto: file }));
    setImagenError(false); // ✅ Reset error de imagen
  };


  const onActividadChange = (e) => {
    const id = e.target.value;
    setidTipo_act(id);
    // Limpiar error de actividad
    setErrors(prev => ({ ...prev, actividad: false }));
  };


  function onChangeVisita(e) {
    const { name, value, type, checked } = e.target;
    if (name === 'autorizado_por' && currentUser) {
      return;
    }
    setFormVisita(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    // Limpiar error de descripción
    if (name === 'descripcion_actividad') {
      setErrors(prev => ({ ...prev, descripcion: false }));
    }
  }


  function validarDescripcion(desc) {
    return typeof desc === "string" && desc.trim().length >= 3;
  }


  // ✅ Manejar error al cargar imagen
  const handleImageError = (type) => {
    console.error(`Error cargando imagen de ${type}`);
    setImagenError(true);
  };


  // ✅ VALIDACIONES VISUALES ANTES DE POST
  const validateForm = () => {
    const newErrors = {
      visitante: false,
      centro: false,
      actividad: false,
      descripcion: false,
      general: ""
    };


    if (!selected?.id) {
      newErrors.visitante = true;
    }
    if (!cdSel) {
      newErrors.centro = true;
    }
    if (!idTipo_act || idTipo_act === "") {
      newErrors.actividad = true;
    }
    if (!validarDescripcion(formVisita.descripcion_actividad)) {
      newErrors.descripcion = true;
    }


    setErrors(newErrors);
    return Object.values(newErrors).every(v => !v);
  };


  // ✅ POST: 1 CENTRO + MÚLTIPLES ÁREAS + FOTO
  async function onRegistrarAcceso() {
    // ✅ Validar visualmente primero
    if (!validateForm()) {
      return;
    }


    setPosting(true);
    try {
      const tipoActividadId = parseInt(idTipo_act, 10);
      if (isNaN(tipoActividadId)) {
        throw new Error("ID de tipo de actividad inválido");
      }


      // ✅ USAR FORMDATA PARA ENVIAR FOTO
      const formData = new FormData();
      formData.append('persona_id', selected.id);
      formData.append('centro_datos_id', Number(cdSel));
      formData.append('centro_datos_ids', JSON.stringify([Number(cdSel)]));
      formData.append('tipo_actividad_id', tipoActividadId);
      formData.append('area_ids', JSON.stringify(areasSel.map(Number)));
      formData.append('descripcion_actividad', formVisita.descripcion_actividad.trim());
      formData.append('fecha_programada', new Date().toISOString());
      formData.append('autorizado_por', formVisita.autorizado_por?.trim() || '');
      formData.append('equipos_ingresados', formVisita.equipos_ingresados?.trim() || '');
      formData.append('observaciones', formVisita.observaciones?.trim() || '');
      formData.append('estado_id', 1);


      // ✅ AGREGAR FOTO SI EXISTE
      if (fotoFile) {
        formData.append('foto', fotoFile);
        console.log("✅ Foto adjuntada al FormData:", fotoFile.name);
      }


      const res = await apiFetch(API_VISITAS, {
        method: "POST",
        body: formData, // ✅ Usar FormData en lugar de JSON
      });


      const created = await res.json();


      // ✅ Reset form y navegar
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
      setErrors({}); // Limpiar errores
      setImagenError(false); // ✅ Reset error de imagen
      setFotoFile(null); // ✅ Reset foto file
      navigate(`/accesos/${created.id}`);
    } catch (e) {
      console.error("❌ Error:", e);
      setErrors(prev => ({ ...prev, general: `Error al registrar visita: ${e.message}` }));
    } finally {
      setPosting(false);
    }
  }


  const goRegistrarVisitante = () => navigate(`/registro/visitante?cedula=${encodeURIComponent(q || "")}`);


  const showNoResults = q && !selected && sugerencias.length === 0;


  // ✅ Obtener URL de foto actual
  const fotoUrl = getFotoPersonaUrl();


  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando usuario...</div>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px] gap-6">
          {/* Left side - FORMULARIO */}
          <div className="p-8 bg-white dark:bg-gray-900">
            <form className="space-y-5" autoComplete="off" onSubmit={e => e.preventDefault()}>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">REGISTRO ACCESO</div>


              {/* CÉDULA - CON MENSAJE DE ERROR */}
              <div className="space-y-2">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    CÉDULA
                  </label>


                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={q}
                    onChange={onCedulaChange}
                    className={`block w-full px-0 py-2 border-b bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary focus:bg-primary/5 dark:focus:bg-primary/10 focus:outline-none transition-all ${
                      errors.visitante ? "border-red-500 dark:border-red-500 focus:border-red-500" : "border-gray-200 dark:border-gray-700"
                    }`}
                    autoFocus={selected || sugerencias.length === 0}
                  />


                  {/* SUGERENCIAS */}
                  {sugerencias.length > 0 && (
                    <ul
                      className="
                        absolute left-0 right-0 mt-1 
                        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg 
                        max-h-60 overflow-auto z-30
                      "
                    >
                      {sugerencias.slice(0, 100).map((p) => (
                        <li
                          key={p.id}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-white text-sm"
                          onMouseDown={() => {
                            onSelectById(p.id);     // selecciona persona
                            setSugerencias([]);     // <- oculta lista
                          }}
                        >
                          {p.documento_identidad} - {p.nombre} {p.apellido}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>


                {errors.visitante && (
                  <p className="text-sm text-red-600 dark:text-red-400">Seleccione un visitante</p>
                )}
              </div>


              {/* DATOS VISITA */}
              {selected && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Datos de visita</h3>


                  {/* CENTRO DE DATOS - CON MENSAJE DE ERROR */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Centro de datos {cdSel ? "(1 seleccionado)" : ""}
                    </label>
                    {errors.centro && (
                      <p className="mb-2 text-sm text-red-600 dark:text-red-400">Seleccione un centro de datos</p>
                    )}
                    <div className="flex w-full gap-4 flex-wrap">
                      {centros.map(c => (
                        <label key={c.id} className="cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={cdSel === c.id}
                            onChange={() => onCentroCheckboxChange(c.id)}
                          />
                          <span
                            className={`flex justify-center items-center flex-1 px-4 py-3 rounded-full border-2 transition-all shadow-sm text-sm font-semibold h-14 ${
                              cdSel === c.id
                                ? "bg-[#8ADD64] text-white border-green-400 shadow-md scale-105"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-105"
                            }`}
                            style={{ width: "100%" }}
                          >
                            {c.nombre}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>


                  {/* ÁREAS - MÚLTIPLES */}
                  {cdSel && areas.length === 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      Seleccione un centro para ver sus áreas disponibles
                    </div>
                  )}
                  {cdSel && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Áreas ({areasSel.length} {areasSel.length !== 1 ? 'seleccionadas' : 'seleccionada'})
                      </label>
                      <div className="flex w-full gap-3 flex-wrap">
                        {areas.map(a => (
                          <label key={a.id} className="cursor-pointer flex-1 min-w-[140px]">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={areasSel.includes(a.id)}
                              onChange={() => onAreaCheckboxChange(a.id)}
                            />
                            <span
                              className={`flex justify-center items-center px-3 py-2 rounded-full border-2 transition-all shadow-sm text-xs font-medium h-12 ${
                                areasSel.includes(a.id)
                                  ? "bg-[#8ADD64] text-white border-green-400 shadow-md"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                              }`}
                              style={{ width: "100%" }}
                            >
                              {a.nombre}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* TIPO ACTIVIDAD - CON MENSAJE DE ERROR */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Tipo de actividad
                    </label>
                    {errors.actividad && (
                      <p className="mb-2 text-sm text-red-600 dark:text-red-400">Tiene que seleccionar una actividad</p>
                    )}
                    <select
                      className={`block w-full px-0 py-2 border-b bg-transparent text-gray-900 dark:text-white focus:outline-none transition-all ${
                        errors.actividad ? 'border-red-500 dark:border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'
                      } focus:bg-primary/5 dark:focus:bg-primary/10`}
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


                  {/* CAMPOS TEXTO - CON MENSAJE DE ERROR EN DESCRIPCIÓN */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Descripción</label>
                      <input
                        name="descripcion_actividad"
                        value={formVisita.descripcion_actividad}
                        onChange={onChangeVisita}
                        className={`block w-full px-0 py-2 border-b bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all ${
                          errors.descripcion ? 'border-red-500 dark:border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'
                        } focus:bg-primary/5 dark:focus:bg-primary/10`}
                        placeholder="Describa el motivo de la visita..."
                      />
                      {errors.descripcion && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">La descripción debe tener al menos 3 caracteres</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Autorizado por</label>
                      <input
                        name="autorizado_por"
                        value={formVisita.autorizado_por || (currentUser ? `${currentUser.nombre} ${currentUser.apellidos}` : "")}
                        onChange={onChangeVisita}
                        className="block w-full px-0 py-2 border-b border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:border-primary dark:focus:border-primary focus:bg-primary/5 dark:focus:bg-primary/10 focus:outline-none transition-all"
                        disabled={!currentUser}
                      />
                    </div>
                    {requiereEquiposYObs && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Equipos ingresados</label>
                          <input
                            name="equipos_ingresados"
                            value={formVisita.equipos_ingresados}
                            onChange={onChangeVisita}
                            className="block w-full px-0 py-2 border-b border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary dark:focus:border-primary focus:bg-primary/5 dark:focus:bg-primary/10 focus:outline-none transition-all"
                            placeholder="Laptop, celular, documentos..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Observaciones</label>
                          <input
                            name="observaciones"
                            value={formVisita.observaciones}
                            onChange={onChangeVisita}
                            className="block w-full px-0 py-2 border-b border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary dark:focus:border-primary focus:bg-primary/5 dark:focus:bg-primary/10 focus:outline-none transition-all"
                            placeholder="Información adicional..."
                          />
                        </div>
                      </>
                    )}
                  </div>


                  {/* ERROR GENERAL */}
                  {errors.general && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-red-800 dark:text-red-200">{errors.general}</p>
                    </div>
                  )}


                  <div className="flex justify-start pt-6">
                    <button
                      type="button"
                      className="bg-primary hover:bg-primary/90 text-white px-10 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      onClick={onRegistrarAcceso}
                      disabled={posting || loading}
                    >
                      {posting ? (
                        <span>Registrando...</span>
                      ) : (
                        <>
                          <span>Registrar acceso</span>
                          <span className="ml-1">{cdSel ? "(1 centro)" : "(0 centros)"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>


          {/* Right side - FOTO */}
          <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/80 flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80"></div>
            <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
              <div className="w-full h-full bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
            </div>
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full transform rotate-45 animate-bounce" style={{ animationDuration: '3s' }}></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/20 rounded-full transform -rotate-12 animate-pulse" style={{ animationDelay: '1s' }}></div>


            <div className="text-center relative z-10">
              {/* VALIDACIÓN Y MOSTRADO DE FOTO CORREGIDO */}
              {fotoUrl && !imagenError ? (
                <div className="w-72 h-72 mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/30 transform hover:scale-105 transition-all duration-500 hover:rotate-1">
                  <img
                    src={fotoUrl}
                    alt={`Foto de ${selected?.nombre} ${selected?.apellido}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError('persona')}
                  />
                </div>
              ) : (
                <div className="w-72 h-72 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl ring-4 ring-white/30 transform hover:scale-105 transition-all duration-500 hover:rotate-1">
                  <svg className="w-32 h-32 text-white/80 fill-current" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}


              {selected ? (
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                    {selected.nombre} {selected.apellido}
                  </h3>
                  <p className="text-white/90 text-lg drop-shadow-md">{selected.empresa}</p>
                  {form.empresa === "SENIAT" && selected.unidad && (
                    <p className="text-white/80 text-sm drop-shadow-md">{selected.unidad}</p>
                  )}
                </div>
              ) : (
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