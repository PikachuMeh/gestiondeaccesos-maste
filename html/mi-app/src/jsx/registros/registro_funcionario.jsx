// src/components/RegistroPersona.jsx
import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../context/ApiContext.jsx";
import {
  FaIdCard,
  FaUser,
  FaEnvelope,
  FaBuilding,
  FaBriefcase,
  FaSitemap,
  FaMapMarkerAlt,
  FaStickyNote,
  FaCamera,
  FaUpload,
  FaCheck,
  FaExclamationTriangle,
  FaTimes
} from "react-icons/fa";

const onlyLetters = (s) => s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "").replace(/\s{2,}/g, " ");
const onlyDigits = (s) => s.replace(/\D/g, "");

export default function RegistroPersona() {
  const { API_V1 } = useApi();
  const navigate = useNavigate();
  const { token, loading, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    cedula: "",
    nombre: "",
    apellido: "",
    email: "",
    empresa: "",
    cargo: "",
    direccion: "",
    observaciones: "",
    unidad: "",
  });
  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFotoArchivo(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const onObservaciones = (e) => {
    const value = e.target.value;
    setForm(f => ({ ...f, observaciones: value }));
    setErrors(err => {
      const { observaciones, ...rest } = err;
      return rest;
    });
  };

  const onCedula = (e) => {
    // quito el prefijo V- si existe
    const raw = e.target.value.startsWith("V-")
      ? e.target.value.slice(2)
      : e.target.value;

    const value = onlyDigits(raw).slice(0, 10);

    setForm(f => ({ ...f, cedula: value }));
    setErrors(err => {
      const { cedula, ...rest } = err;
      return rest;
    });
  };

  const onNombre = (e) => {
    const value = onlyLetters(e.target.value).trimStart();
    setForm(f => ({ ...f, nombre: value }));
    setErrors(err => {
      const { nombre, ...rest } = err;
      return rest;
    });
  };

  const onApellido = (e) => {
    const value = onlyLetters(e.target.value).trimStart();
    setForm(f => ({ ...f, apellido: value }));
    setErrors(err => {
      const { apellido, ...rest } = err;
      return rest;
    });
  };

  const onCorreo = (e) => {
    const value = e.target.value.trimStart();
    setForm(f => ({ ...f, email: value }));
    setErrors(err => {
      const { email, ...rest } = err;
      return rest;
    });
  };

  const onEmpresa = (e) => {
    const value = onlyLetters(e.target.value).trimStart();
    setForm(f => ({ ...f, empresa: value }));
    setErrors(err => {
      const { empresa, ...rest } = err;
      return rest;
    });
  };

  const onCargo = (e) => {
    const value = onlyLetters(e.target.value).trimStart();
    setForm(f => ({ ...f, cargo: value }));
    setErrors(err => {
      const { cargo, ...rest } = err;
      return rest;
    });
  };

  const onDireccion = (e) => {
    const value = e.target.value.trimStart();
    setForm(f => ({ ...f, direccion: value }));
    setErrors(err => {
      const { direccion, ...rest } = err;
      return rest;
    });
  };

  const onUnidad = (e) => {
    const value = onlyLetters(e.target.value).trimStart();
    setForm(f => ({ ...f, unidad: value }));
    setErrors(err => {
      const { unidad, ...rest } = err;
      return rest;
    });
  };

  const validate = () => {
    const err = {};

    // CÉDULA
    if (!form.cedula) {
      err.cedula = "La cédula es requerida";
    } else if (form.cedula.length < 6) {
      err.cedula = "La cédula debe tener al menos 6 dígitos";
    }

    // NOMBRE
    if (!form.nombre) {
      err.nombre = "El nombre es requerido";
    } else if (form.nombre.trim().length < 3) {
      err.nombre = "El nombre tiene que ser mayor a 3 caracteres";
    }

    // APELLIDO
    if (!form.apellido) {
      err.apellido = "El apellido es requerido";
    } else if (form.apellido.trim().length < 3) {
      err.apellido = "El apellido tiene que ser mayor a 3 caracteres";
    }

    // CORREO
    if (!form.email) {
      err.email = "El correo es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      err.email = "El correo no tiene un formato válido";
    }

    // EMPRESA
    if (!form.empresa) {
      err.empresa = "La empresa es requerida";
    } else if (form.empresa.trim().length < 3) {
      err.empresa = "La empresa debe tener al menos 3 caracteres";
    }

    // CARGO (opcional pero si se llena, debe tener al menos 3 caracteres)
    if (form.cargo && form.cargo.trim().length > 0 && form.cargo.trim().length < 3) {
      err.cargo = "El cargo debe tener al menos 3 caracteres";
    }

    // DIRECCIÓN
    if (!form.direccion) {
      err.direccion = "La dirección es requerida";
    } else if (form.direccion.trim().length < 5) {
      err.direccion = "La dirección debe tener al menos 5 caracteres";
    }

    // UNIDAD (opcional pero si se llena, debe tener al menos 3 caracteres)
    if (form.unidad && form.unidad.trim().length > 0 && form.unidad.trim().length < 3) {
      err.unidad = "La unidad debe tener al menos 3 caracteres";
    }

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
      unidad: "",
    });
    setFotoArchivo(null);
    setPreview(null);
    setErrors({});
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!isAuthenticated()) {
      setModalMsg("No autenticado. Redirigiendo al login.");
      setIsSuccess(false);
      setShowModal(true);
      navigate("/login");
      return;
    }
    if (loading) {
      setModalMsg("Cargando autenticación...");
      setIsSuccess(false);
      setShowModal(true);
      return;
    }

    const formData = new FormData();
    formData.append("nombre", form.nombre.trim());
    formData.append("apellido", form.apellido.trim());
    formData.append("documento_identidad", form.cedula);
    formData.append("email", form.email.trim());
    formData.append("empresa", form.empresa.trim());
    formData.append("cargo", form.cargo.trim() || "");
    formData.append("direccion", form.direccion.trim());
    formData.append("observaciones", form.observaciones.trim() || "");
    formData.append("unidad", form.unidad.trim() || "");

    if (fotoArchivo) {
      formData.append("foto", fotoArchivo);
    }

    try {
      const res = await fetch(`${API_V1}/personas/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (res.ok) {
        setModalMsg("Persona registrada correctamente.");
        setIsSuccess(true);
        setShowModal(true);
        clearForm();
      } else {
        const data = await res.json();
        setIsSuccess(false);

        if (res.status === 409) {
          setModalMsg(data.detail || "Cédula o correo ya registrado");
        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          setModalMsg("Sesión expirada. Redirigiendo al login.");
          setShowModal(true);
          navigate("/login");
        } else {
          setModalMsg("Error: " + (data.detail || "No se pudo registrar"));
        }
        setShowModal(true);
      }
    } catch (err) {
      setModalMsg("Error de conexión: " + err.message);
      setIsSuccess(false);
      setShowModal(true);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
      </div>
    </div>
  );

  if (!isAuthenticated()) return navigate("/login");

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
              {/* Left side - Person Form */}
              <div className="p-8">
                <form className="space-y-6" autoComplete="off" onSubmit={onSubmit}>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                    <FaUser className="text-blue-600 dark:text-blue-400" /> REGISTRO DE VISITANTE
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                        <FaIdCard className="text-gray-500" /> Información Personal
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cédula</label>
                          <input
                            type="text"
                            value={form.cedula ? `V-${form.cedula}` : "V-"}
                            onChange={onCedula}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="V-12345678"
                          />
                          {errors.cedula && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.cedula}</div>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                          <input
                            type="text"
                            value={form.nombre}
                            onChange={onNombre}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Nombre completo"
                          />
                          {errors.nombre && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.nombre}</div>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellido</label>
                          <input
                            type="text"
                            value={form.apellido}
                            onChange={onApellido}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Apellido completo"
                          />
                          {errors.apellido && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.apellido}</div>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <FaEnvelope className="text-gray-400" /> Correo
                          </label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={onCorreo}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="usuario@ejemplo.com"
                          />
                          {errors.email && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.email}</div>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                        <FaBuilding className="text-gray-500" /> Información Laboral
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <FaBuilding className="text-gray-400" /> Empresa
                          </label>
                          <input
                            type="text"
                            value={form.empresa}
                            onChange={onEmpresa}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Nombre de la empresa"
                          />
                          {errors.empresa && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.empresa}</div>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <FaBriefcase className="text-gray-400" /> Cargo
                          </label>
                          <input
                            type="text"
                            value={form.cargo}
                            onChange={onCargo}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Cargo en la empresa"
                          />
                          {errors.cargo && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.cargo}</div>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <FaSitemap className="text-gray-400" /> Unidad
                          </label>
                          <input
                            type="text"
                            value={form.unidad}
                            onChange={onUnidad}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Unidad de trabajo"
                          />
                          {errors.unidad && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.unidad}</div>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                        <FaStickyNote className="text-gray-500" /> Información Adicional
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <FaMapMarkerAlt className="text-gray-400" /> Dirección
                          </label>
                          <input
                            type="text"
                            value={form.direccion}
                            onChange={onDireccion}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Dirección completa"
                          />
                          {errors.direccion && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.direccion}</div>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <FaStickyNote className="text-gray-400" /> Observaciones
                          </label>
                          <textarea
                            value={form.observaciones}
                            onChange={onObservaciones}
                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            rows={3}
                            placeholder="Observaciones adicionales"
                          />
                          {errors.observaciones && <div className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1"><FaExclamationTriangle /> {errors.observaciones}</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start pt-4">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <FaCheck /> Registrar Visitante
                    </button>
                  </div>
                </form>
              </div>

              {/* Right side - Photo Display */}
              <div className="bg-blue-600 dark:bg-blue-800 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 dark:from-blue-800 dark:via-blue-900 dark:to-gray-900 opacity-90"></div>
                <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
                  <div className="w-full h-full bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
                </div>
                <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full transform rotate-45 animate-bounce" style={{ animationDuration: '3s' }}></div>
                <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-full transform -rotate-12 animate-pulse" style={{ animationDelay: '1s' }}></div>

                <div className="text-center relative z-10 w-full max-w-md">
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                      <FaCamera /> Foto del Visitante
                    </h3>

                    <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20">
                      <div className="text-center">
                        <label className="block cursor-pointer group">
                          <div className="w-64 h-64 mx-auto mb-4 rounded-xl overflow-hidden shadow-xl bg-white/20 flex items-center justify-center group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105 border-2 border-dashed border-white/40 group-hover:border-white">
                            {preview ? (
                              <img src={preview} alt="Foto del visitante" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center text-white/80 group-hover:text-white transition-colors">
                                <FaUpload className="text-5xl mx-auto mb-2" />
                                <p className="text-sm font-medium">Haz clic para subir foto</p>
                              </div>
                            )}
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                        </label>
                      </div>

                      <div className="text-center mt-4">
                        <p className="text-sm text-white/80 mb-1">Formatos permitidos: JPG, PNG, GIF</p>
                        <p className="text-xs text-white/60">Tamaño máximo: 5MB</p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm text-left">
                      <h4 className="text-sm font-bold text-white/90 mb-2 flex items-center gap-2">
                        <FaExclamationTriangle className="text-yellow-400" /> Información Importante
                      </h4>
                      <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                        <li>La foto es obligatoria</li>
                        <li>Se recomienda foto de frente y rostro claro</li>
                        <li>La imagen se almacenará de forma segura</li>
                      </ul>
                    </div>
                  </div>

                  {(form.nombre || form.apellido) && (
                    <div className="space-y-2 mt-8 animate-fade-in">
                      <h3 className="text-2xl font-bold text-white drop-shadow-md">{form.nombre} {form.apellido}</h3>
                      {form.cedula && <p className="text-white/90 text-lg flex items-center justify-center gap-2"><FaIdCard /> V-{form.cedula}</p>}
                      {form.empresa && <p className="text-white/80 flex items-center justify-center gap-2"><FaBuilding /> {form.empresa}</p>}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100">
              <div className="text-center">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isSuccess ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {isSuccess ? (
                    <FaCheck className="text-green-600 dark:text-green-400 text-xl" />
                  ) : (
                    <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-xl" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isSuccess ? '¡Éxito!' : 'Atención'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{modalMsg}</p>
                <button
                  className={`w-full px-4 py-2 rounded-lg text-white font-medium transition-colors ${isSuccess
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  onClick={handleCloseModal}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
