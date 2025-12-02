// src/jsx/DetalleUsuarioPage.jsx - CORREGIDO (handleChange para rol + foto funcionando)

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import { useImages } from "../context/ImageContext.jsx";
import {
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaUserTag,
  FaPhone,
  FaBuilding,
  FaCalendarAlt,
  FaEdit,
  FaSave,
  FaTimes,
  FaCamera,
  FaArrowLeft,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";

export default function DetalleUsuarioPage() {
  const { API_V1 } = useApi();
  const { getImageUrl } = useImages();
  const API_BASE = `${API_V1}/usuarios`;

  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAdmin } = useAuth();

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Cargar usuario
  useEffect(() => {
    if (!token) {
      setError("No autenticado");
      setLoading(false);
      return;
    }

    const fetchUsuario = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`${API_BASE}/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        setUsuario(data);
        setEditForm(data);
        setError(null);
      } catch (err) {
        console.error("Error cargando usuario:", err);
        setError(err.message || "Error cargando usuario");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuario();
  }, [id, token]);

  // ✅ MANEJADOR DE CAMBIOS - CONVIERTE rol_id A NÚMERO
  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ IMPORTANTE: Convertir rol_id a número porque los selects devuelven strings
    const finalValue = name === "rol_id" ? Number(value) : value;

    setEditForm((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  // Manejador para cambio de foto
  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de archivo no permitido. Usa: JPG, PNG, GIF o WEBP");
        return;
      }

      const maxSizeMB = 5;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Archivo demasiado grande. Máximo: ${maxSizeMB}MB`);
        return;
      }

      setFotoFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setFotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);

      setError(null);
    }
  };

  // Limpiar foto
  const handleClearFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
  };

  // Guardar cambios - SOLO ENVÍA CAMPOS QUE CAMBIARON
  const handleSave = async () => {
    if (!isAdmin()) {
      setError("Solo administradores pueden editar usuarios");
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const formData = new FormData();

      // ✅ IMPORTANTE: Solo agregar al FormData los campos que REALMENTE cambiaron
      // Comparar con el usuario original para saber qué cambió

      if (editForm.username && editForm.username !== usuario.username) {
        console.log(`✓ username cambió: ${usuario.username} → ${editForm.username}`);
        formData.append("username", editForm.username);
      } else if (editForm.username) {
        console.log(`✗ username NO cambió, no se envía`);
      }

      if (editForm.email && editForm.email !== usuario.email) {
        console.log(`✓ email cambió: ${usuario.email} → ${editForm.email}`);
        formData.append("email", editForm.email);
      } else if (editForm.email) {
        console.log(`✗ email NO cambió, no se envía`);
      }

      if (editForm.cedula && editForm.cedula !== usuario.cedula) {
        console.log(`✓ cedula cambió: ${usuario.cedula} → ${editForm.cedula}`);
        formData.append("cedula", editForm.cedula);
      } else if (editForm.cedula) {
        console.log(`✗ cedula NO cambió, no se envía`);
      }

      // ✅ AHORA FUNCIONA PORQUE rol_id ES UN NÚMERO EN AMBOS LADOS
      if (editForm.rol_id && editForm.rol_id !== usuario.rol_id) {
        console.log(`✓ rol_id cambió: ${usuario.rol_id} → ${editForm.rol_id}`);
        formData.append("rol_id", editForm.rol_id);
      } else if (editForm.rol_id) {
        console.log(`✗ rol_id NO cambió (${editForm.rol_id} === ${usuario.rol_id}), no se envía`);
      }

      // Foto
      if (fotoFile) {
        console.log(`✓ foto se va a actualizar`);
        formData.append("foto", fotoFile);
      }

      // Debug: mostrar qué se va a enviar
      console.log("=== FormData a enviar ===");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? `File(${value.name})` : value}`);
      }

      // Validar que al menos haya algo para actualizar
      const hasChanges = Array.from(formData.keys()).length > 0;
      if (!hasChanges) {
        setError("No hay cambios para guardar");
        setUpdating(false);
        return;
      }

      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error: ${response.status}`);
      }

      const updated = await response.json();
      setUsuario(updated);
      setEditForm(updated);
      setFotoFile(null);
      setFotoPreview(null);
      setIsEditing(false);

      alert("Usuario actualizado exitosamente");
    } catch (err) {
      console.error("Error guardando:", err);
      setError(`Error guardando cambios: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(usuario);
    setFotoFile(null);
    setFotoPreview(null);
  };

  const handleBack = () => {
    navigate("/usuarios");
  };

  // Estados de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (error && !usuario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-6 rounded-lg mb-6 flex items-center gap-3">
          <FaExclamationCircle className="text-2xl" />
          <div>
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
          </div>
        </div>
        <button
          onClick={handleBack}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <FaArrowLeft /> Volver
        </button>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400">Usuario no encontrado</p>
        </div>
      </div>
    );
  }

  // ✅ Usar getImageUrl correctamente - CON DOS PARÁMETROS
  const fotoUrl = fotoPreview || getImageUrl('operador', usuario.foto_path);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 bg-white dark:bg-gray-800 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FaUser className="text-blue-600 dark:text-blue-400" /> Detalle del Usuario
        </h1>
        <button
          onClick={handleBack}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <FaArrowLeft /> Volver
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-lg flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {/* Contenedor principal - Grid 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

        {/* ===== COLUMNA IZQUIERDA - FOTO ===== */}
        <div className="md:col-span-1 flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Foto del Operador
          </h3>

          {/* Foto - Mostrar preview o URL de la API */}
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={usuario.nombre}
              className="w-48 h-48 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Ctext x='50%' y='50%' fill='%23999' text-anchor='middle' dy='.3em'%3ESin Foto%3C/text%3E%3C/svg%3E";
              }}
            />
          ) : (
            <div className="w-48 h-48 rounded-lg bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500">
              <FaUser className="text-4xl mb-2" />
              <span className="text-sm font-bold">Sin foto</span>
            </div>
          )}

          {/* Botón editar (solo admin) */}
          {isAdmin() && (
            <div className="w-full">
              {!isEditing ? (
                <></>
              ) : (
                <label className="block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-center font-bold transition-colors flex items-center justify-center gap-2">
                  <FaCamera /> Cambiar Foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Limpiar foto si está en preview */}
          {fotoPreview && (
            <button
              onClick={handleClearFoto}
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <FaTimes /> Cancelar cambio de foto
            </button>
          )}
        </div>

        {/* ===== COLUMNA DERECHA - INFORMACIÓN ===== */}
        <div className="md:col-span-2 p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          {isEditing ? (
            // MODO EDICIÓN
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaEdit className="text-blue-600 dark:text-blue-400" /> Editar Usuario
              </h3>

              <div>
                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">
                  Username:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={editForm.username || ""}
                    onChange={handleChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">
                  Email:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email || ""}
                    onChange={handleChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">
                  Cédula:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaIdCard className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="cedula"
                    value={editForm.cedula || ""}
                    onChange={handleChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">
                  Rol:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUserTag className="text-gray-400" />
                  </div>
                  <select
                    name="rol_id"
                    value={editForm.rol_id || ""}
                    onChange={handleChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">Seleccionar rol...</option>
                    <option value="2">Supervisor</option>
                    <option value="3">Operador</option>
                  </select>
                </div>
              </div>

              {/* Botones de guardar/cancelar */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>Guardando...</>
                  ) : (
                    <>
                      <FaSave /> Guardar
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={updating}
                  className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaTimes /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            // MODO VISTA
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Información Personal</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaUser className="text-gray-400" /> Username:
                  </p>
                  <p className="text-gray-900 dark:text-white">{usuario.username}</p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaUser className="text-gray-400" /> Nombre Completo:
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {usuario.nombre} {usuario.apellidos}
                  </p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaEnvelope className="text-gray-400" /> Email:
                  </p>
                  <p className="text-gray-900 dark:text-white">{usuario.email}</p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaIdCard className="text-gray-400" /> Cédula:
                  </p>
                  <p className="text-gray-900 dark:text-white">{usuario.cedula}</p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaUserTag className="text-gray-400" /> Rol:
                  </p>
                  <p className="text-gray-900 dark:text-white">{usuario.rol?.nombre_rol || "N/A"}</p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaPhone className="text-gray-400" /> Teléfono:
                  </p>
                  <p className="text-gray-900 dark:text-white">{usuario.telefono || "N/A"}</p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaBuilding className="text-gray-400" /> Departamento:
                  </p>
                  <p className="text-gray-900 dark:text-white">{usuario.departamento || "N/A"}</p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaCheckCircle className="text-gray-400" /> Estado:
                  </p>
                  <p className={`font-bold flex items-center gap-1 ${usuario.activo ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {usuario.activo ? <><FaCheckCircle /> Activo</> : <><FaTimesCircle /> Inactivo</>}
                  </p>
                </div>

                <div>
                  <p className="mb-1 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-400" /> Fecha de Creación:
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {usuario.fecha_creacion ? new Date(usuario.fecha_creacion).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>

              {/* Botón editar */}
              {isAdmin() && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <FaEdit /> Editar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
