// src/components/RegistroAcceso.jsx - COMPLETO CON ENVÍO DE FOTO ✅

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useApi } from "../../context/ApiContext.jsx";
import { useImages } from "../../context/ImageContext.jsx";
import {
  FaSearch,
  FaUserPlus,
  FaCheck,
  FaCamera,
  FaIdCard,
  FaBuilding,
  FaSitemap,
  FaClipboardList,
  FaUserCheck,
  FaLaptop,
  FaStickyNote,
  FaSave,
  FaExclamationCircle
} from "react-icons/fa";

// ✅ Helper sin hook - recibe token como parámetro
function apiFetch(url, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    ...options.headers,
  };

  // Si es FormData, NO setear Content-Type (el navegador lo hará automáticamente)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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
  const { getImageUrl } = useImages();  // ✅ Para construir URLs de imagen

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
  const [fotoFile, setFotoFile] = useState(null);  // ✅ Para guardar el archivo
  const [imagenError, setImagenError] = useState(false);  // ✅ Para manejar errores de imagen

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
    setFotoFile(null);  // ✅ Reset foto file
    setImagenError(false);  // ✅ Reset error de imagen

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
    if (newFoto) {
      // Si hay una foto nueva cargada localmente, usa su URL blob
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
        foto: fotoUrl,  // ✅ Aquí guardas la URL completa
        unidad: p.empresa === "SENIAT" ? (p.unidad || "") : "",
        fecha_creacion: p.fecha_creacion || new Date().toISOString(),
      });
      setQ(String(p.documento_identidad || ""));
      setNewFoto(null);
      setFotoFile(null);  // ✅ Reset foto file
      setImagenError(false);  // ✅ Reset error de imagen
    } catch (err) {
      console.error(err);
      alert("Error cargando persona seleccionada");
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFoto(URL.createObjectURL(file));
    setFotoFile(file);  // ✅ Guardar el archivo original
    setForm(f => ({ ...f, foto: file }));
    setImagenError(false);  // ✅ Reset error de imagen
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

  // ✅ Manejar error al cargar imagen
  const handleImageError = (type) => {
    console.error(`Error cargando imagen de ${type}`);
    setImagenError(true);
  };

  // ✅ POST: 1 CENTRO + MÚLTIPLES ÁREAS + FOTO
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

      // ✅ USAR FORMDATA PARA ENVIAR FOTO
      const formData = new FormData();
      formData.append('persona_id', selected.id);
      formData.append('centro_datos_id', Number(cdSel));
      formData.append('centro_datos_ids', JSON.stringify([Number(cdSel)]));
      formData.append('tipo_actividad_id', tipoActividadId);
      formData.append('area_ids', JSON.stringify(areasSel.map(Number)));
      formData.append('descripcion_actividad', formVisita.descripcion_actividad.trim());
      formData.append('fecha_programada', new Date().toISOString());
      formData.append('autorizado_por', formVisita.autorizado_por?.trim() || null);
      formData.append('equipos_ingresados', formVisita.equipos_ingresados?.trim() || null);
      formData.append('observaciones', formVisita.observaciones?.trim() || null);
      formData.append('estado_id', 1);

      // ✅ AGREGAR FOTO SI EXISTE
      if (fotoFile) {
        formData.append('foto', fotoFile);
        console.log("✅ Foto adjuntada al FormData:", fotoFile.name);
      }

      const res = await apiFetch(API_VISITAS, {
        method: "POST",
        body: formData,  // ✅ Usar FormData en lugar de JSON
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
      setImagenError(false);  // ✅ Reset error de imagen
      setFotoFile(null);  // ✅ Reset foto file

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

  // ✅ Obtener URL de foto actual
  const fotoUrl = getFotoPersonaUrl();

  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Cargando usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
            {/* Left side - FORMULARIO */}
            <div className="p-8">
              <form className="space-y-6" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                  <FaClipboardList className="text-blue-600 dark:text-blue-400" /> REGISTRO ACCESO
                </div>

                {/* CÉDULA */}
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <FaSearch className="text-gray-400" /> CÉDULA
                    </label>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={q}
                      onChange={onCedulaChange}
                      className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      autoFocus
                    />
                    {!selected && sugerencias.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {sugerencias.slice(0, 100).map(p => (
                          <li
                            key={p.id}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white flex items-center gap-2"
                            onMouseDown={() => onSelectById(p.id)}
                          >
                            <FaUserCheck className="text-gray-400" /> V-{p.documento_identidad} - {p.nombre} {p.apellido}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {showNoResults && (
                    <div className="mt-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                        <FaExclamationCircle /> No se encontró la cédula. Puede registrar al visitante.
                      </div>
                      <button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        onMouseDown={goRegistrarVisitante}
                      >
                        <FaUserPlus /> Registrar visitante
                      </button>
                    </div>
                  )}
                </div>

                {/* DATOS VISITA */}
                {selected && (
                  <>
                    <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <FaBuilding className="text-gray-500" /> Datos de visita
                      </h3>

                      {/* CENTRO DE DATOS - SOLO 1 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Centro de datos {cdSel && `(1 seleccionado)`}
                        </label>
                        <div className="flex w-full gap-4 flex-wrap">
                          {centros.map((c) => (
                            <label key={c.id} className="cursor-pointer flex-1 min-w-[120px]">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={cdSel === c.id}
                                onChange={() => onCentroCheckboxChange(c.id)}
                              />
                              <span
                                className={`
                                  flex justify-center items-center px-4 py-3
                                  rounded-lg border transition-all shadow-sm
                                  text-sm font-semibold h-14 w-full
                                  ${cdSel === c.id
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }
                                `}
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <FaSitemap className="text-gray-400" /> Áreas ({areasSel.length} seleccionada{areasSel.length !== 1 ? 's' : ''})
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
                                    rounded-lg border transition-all shadow-sm
                                    text-xs font-medium h-12 w-full
                                    ${areasSel.includes(a.id)
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }
                                  `}
                                >
                                  {a.nombre}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      {!cdSel && areas.length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          Seleccione un centro para ver sus áreas disponibles
                        </div>
                      )}

                      {/* TIPO ACTIVIDAD */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <FaClipboardList className="text-gray-400" /> Tipo de actividad
                        </label>
                        <select
                          className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción *</label>
                        <input
                          name="descripcion_actividad"
                          value={formVisita.descripcion_actividad}
                          onChange={onChangeVisita}
                          className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Describa el motivo de la visita..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <FaUserCheck className="text-gray-400" /> Autorizado por
                        </label>
                        <input
                          name="autorizado_por"
                          value={formVisita.autorizado_por || (currentUser ? `${currentUser.nombre} ${currentUser.apellidos}` : '')}
                          onChange={onChangeVisita}
                          className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          disabled={!!currentUser}
                        />
                      </div>
                    </div>

                    {requiereEquiposYObs && (
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <FaLaptop className="text-gray-400" /> Equipos ingresados
                          </label>
                          <input
                            name="equipos_ingresados"
                            value={formVisita.equipos_ingresados}
                            onChange={onChangeVisita}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Laptop, celular, documentos..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <FaStickyNote className="text-gray-400" /> Observaciones
                          </label>
                          <input
                            name="observaciones"
                            value={formVisita.observaciones}
                            onChange={onChangeVisita}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Información adicional..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-start pt-6">
                      <button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                        onClick={onRegistrarAcceso}
                        disabled={posting || loading || !selected || !cdSel || !idTipo_act}
                      >
                        {posting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Registrando...
                          </>
                        ) : (
                          <>
                            <FaSave /> Registrar acceso <span className="ml-1 bg-blue-700 px-2 py-0.5 rounded-full text-xs">({cdSel ? 1 : 0} centro)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Right side - FOTO */}
            <div className="bg-blue-600 dark:bg-blue-800 flex items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 dark:from-blue-800 dark:via-blue-900 dark:to-gray-900 opacity-90"></div>
              <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
                <div className="w-full h-full bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
              </div>
              <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full transform rotate-45 animate-bounce" style={{ animationDuration: '3s' }}></div>
              <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/20 rounded-full transform -rotate-12 animate-pulse" style={{ animationDelay: '1s' }}></div>

              <div className="text-center relative z-10 w-full max-w-md">
                {/* ✅ VALIDACIÓN Y MOSTRADO DE FOTO CORREGIDO */}
                {fotoUrl && !imagenError ? (
                  <div className="w-64 h-64 mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/30 transform hover:scale-105 transition-all duration-500 hover:rotate-1 bg-white">
                    <img
                      src={fotoUrl}
                      alt={`Foto de ${selected?.nombre} ${selected?.apellido}`}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError("persona")}
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl ring-4 ring-white/30 transform hover:scale-105 transition-all duration-500 hover:rotate-1">
                    <FaCamera className="text-6xl text-white/80" />
                  </div>
                )}

                {selected && (
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-white drop-shadow-lg">{selected.nombre} {selected.apellido}</h3>
                    <p className="text-white/90 text-xl drop-shadow-md flex items-center justify-center gap-2">
                      <FaBuilding /> {selected.empresa}
                    </p>
                    {form.empresa === "SENIAT" && selected.unidad && (
                      <p className="text-white/80 text-sm drop-shadow-md flex items-center justify-center gap-2">
                        <FaSitemap /> {selected.unidad}
                      </p>
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
    </div>
  );
}
