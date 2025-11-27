// src/components/RegistroPersona.jsx
import { useState } from "react";
import "../../css/registro_persona.css";
import { useAuth } from "../auth/AuthContext.jsx"; 
import { useNavigate } from "react-router-dom";
import { useApi } from "../../context/ApiContext.jsx"; 



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
      setShowModal(true);
      navigate("/login");
      return;
    }
    if (loading) { 
      setModalMsg("Cargando autenticación...");
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
        setShowModal(true);
        clearForm();
      } else {
        const data = await res.json();
        
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
      setShowModal(true);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated()) return navigate("/login");

  const handleCloseModal = () => {
    setShowModal(false);
  };

  

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px] gap-6">
            {/* Left side - Person Form */}
            <div className="p-8">
              <form className="space-y-6" autoComplete="off" onSubmit={onSubmit}>
                <div className="text-2xl font-semibold text-on-surface mb-8">REGISTRO DE VISITANTE</div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-on-surface">Información Personal</h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Cédula</label>
                      <input
                        type="text"
                        value={form.cedula ? `V-${form.cedula}` : "V-"}
                        onChange={onCedula}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="V-12345678"
                      />

                      {errors.cedula && <div className="text-red-600 text-sm mt-1">{errors.cedula}</div>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Nombre</label>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={onNombre}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="Nombre completo"
                      />
                      {errors.nombre && <div className="text-red-600 text-sm mt-1">{errors.nombre}</div>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Apellido</label>
                      <input
                        type="text"
                        value={form.apellido}
                        onChange={onApellido}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="Apellido completo"
                      />
                      {errors.apellido && <div className="text-red-600 text-sm mt-1">{errors.apellido}</div>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Correo</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={onCorreo}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="usuario@ejemplo.com"
                      />
                      {errors.email && <div className="text-red-600 text-sm mt-1">{errors.email}</div>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-on-surface">Información Laboral</h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Empresa</label>
                      <input
                        type="text"
                        value={form.empresa}
                        onChange={onEmpresa}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="Nombre de la empresa"
                      />
                      {errors.empresa && <div className="text-red-600 text-sm mt-1">{errors.empresa}</div>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Cargo</label>
                      <input
                        type="text"
                        value={form.cargo}
                        onChange={onCargo}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="Cargo en la empresa"
                      />
                      {errors.cargo && <div className="text-red-600 text-sm mt-1">{errors.cargo}</div>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Unidad</label>
                      <input
                        type="text"
                        value={form.unidad}
                        onChange={onUnidad}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="Unidad de trabajo"
                      />
                      {errors.unidad && <div className="text-red-600 text-sm mt-1">{errors.unidad}</div>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-on-surface">Información Adicional</h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Dirección</label>
                      <input
                        type="text"
                        value={form.direccion}
                        onChange={onDireccion}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
                        placeholder="Dirección completa"
                      />
                      {errors.direccion && <div className="text-red-600 text-sm mt-1">{errors.direccion}</div>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Observaciones</label>
                      <textarea
                        value={form.observaciones}
                        onChange={onObservaciones}
                        className="block w-full px-0 py-1 border-b border-gray-400 bg-transparent text-on-surface text-sm placeholder-gray-400 focus:border-primary focus:bg-primary/5 focus:outline-none transition-all resize-none"
                        rows={3}
                        placeholder="Observaciones adicionales"
                      />
                      {errors.observaciones && <div className="text-red-600 text-sm mt-1">{errors.observaciones}</div>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-start pt-4">
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Registrar Visitante
                  </button>
                </div>
              </form>
            </div>

            {/* Right side - Photo Display */}
            <div className="bg-primary flex items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/95 to-primary/90"></div>
              <div className="absolute inset-0 opacity-20 transform scale-110 animate-pulse">
                <div className="w-full h-full bg-linear-to-br from-white/20 via-transparent to-white/10 rounded-full"></div>
              </div>
              <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full transform rotate-45 animate-bounce" style={{animationDuration: '3s'}}></div>
              <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-full transform -rotate-12 animate-pulse" style={{animationDelay: '1s'}}></div>

              <div className="text-center relative z-10">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Foto del Visitante</h3>

                  <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
                    <div className="text-center">
                      <label className="block cursor-pointer">
                        <div className="w-48 h-48 mx-auto mb-4 rounded-lg overflow-hidden shadow-lg bg-white/20 flex items-center justify-center hover:shadow-xl transition-shadow">
                          {preview ? (
                            <img src={preview} alt="Foto del visitante" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <svg className="w-16 h-16 text-gray-700 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                              <p className="text-sm text-gray-800">Haz clic para subir foto</p>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                      </label>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Formatos permitidos: JPG, PNG, GIF</p>
                      <p className="text-xs text-gray-600">Tamaño máximo: 5MB</p>
                    </div>
                  </div>

                  <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Información Importante</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• La foto es obligatoria</li>
                      <li>• Se recomienda foto de frente y rostro claro</li>
                      <li>• La imagen se almacenará de forma segura</li>
                      <li>• Formatos: JPG, PNG, GIF hasta 5MB</li>
                    </ul>
                  </div>
                </div>

                {(form.nombre || form.apellido) && (
                  <div className="space-y-2 mt-6">
                    <h3 className="text-xl font-semibold text-white">{form.nombre} {form.apellido}</h3>
                    {form.cedula && <p className="text-white/90 text-lg">V-{form.cedula}</p>}
                    {form.empresa && <p className="text-white/80">{form.empresa}</p>}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <p className="text-gray-800 mb-4">{modalMsg}</p>
              <button
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                onClick={handleCloseModal}
              >
                Aceptar
              </button>
            </div>
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
