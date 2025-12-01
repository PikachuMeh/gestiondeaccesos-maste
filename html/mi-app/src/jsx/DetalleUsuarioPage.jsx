// src/jsx/DetalleUsuarioPage.jsx - CORREGIDO (handleChange para rol + foto funcionando)

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import { useImages } from "../context/ImageContext.jsx";


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
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Cargando usuario...</p>
      </div>
    );
  }


  if (error && !usuario) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "15px",
          }}
        >
          ✗ {error}
        </div>
        <button
          onClick={handleBack}
          style={{
            padding: "10px 20px",
            backgroundColor: "#999",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </div>
    );
  }


  if (!usuario) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Usuario no encontrado</p>
      </div>
    );
  }


  // ✅ Usar getImageUrl correctamente - CON DOS PARÁMETROS
  const fotoUrl = fotoPreview || getImageUrl('operador', usuario.foto_path);


  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ margin: 0 }}>Detalle del Usuario</h1>
        <button
          onClick={handleBack}
          style={{
            padding: "10px 20px",
            backgroundColor: "#999",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ← Volver
        </button>
      </div>


      {/* Mensaje de error */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
            border: "1px solid #fcc",
          }}
        >
          ✗ {error}
        </div>
      )}


      {/* Contenedor principal - Grid 2 columnas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px", alignItems: "start" }}>


        {/* ===== COLUMNA IZQUIERDA - FOTO ===== */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "15px",
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>
            Foto del Operador
          </h3>


          {/* Foto - Mostrar preview o URL de la API */}
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={usuario.nombre}
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "2px solid #ccc",
              }}
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Ctext x='50%' y='50%' fill='%23999' text-anchor='middle' dy='.3em'%3ESin Foto%3C/text%3E%3C/svg%3E";
              }}
            />
          ) : (
            <div
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "10px",
                backgroundColor: "#e0e0e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #ccc",
                color: "#999",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Sin foto
            </div>
          )}


          {/* Botón editar (solo admin) */}
          {isAdmin() && (
            <div style={{ width: "100%" }}>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Editar Información
                </button>
              ) : (
                <label
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Cambiar Foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFotoChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>
          )}


          {/* Limpiar foto si está en preview */}
          {fotoPreview && (
            <button
              onClick={handleClearFoto}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#f44",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              Cancelar cambio de foto
            </button>
          )}
        </div>


        {/* ===== COLUMNA DERECHA - INFORMACIÓN ===== */}
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          {isEditing ? (
            // MODO EDICIÓN
            <div style={{ display: "grid", gap: "15px" }}>
              <h3 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>Editar Usuario</h3>


              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "13px" }}>
                  Username:
                </label>
                <input
                  type="text"
                  name="username"
                  value={editForm.username || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>


              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "13px" }}>
                  Email:
                </label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>


              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "13px" }}>
                  Cédula:
                </label>
                <input
                  type="text"
                  name="cedula"
                  value={editForm.cedula || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>


              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "13px" }}>
                  Rol:
                </label>
                <select
                  name="rol_id"
                  value={editForm.rol_id || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Seleccionar rol...</option>
                  <option value="2">Supervisor</option>
                  <option value="3">Operador</option>
                </select>
              </div>


              {/* Botones de guardar/cancelar */}
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: updating ? "not-allowed" : "pointer",
                    opacity: updating ? 0.6 : 1,
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  {updating ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={updating}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#999",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            // MODO VISTA
            <div style={{ display: "grid", gap: "15px" }}>
              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Username:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>{usuario.username}</p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Nombre Completo:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                  {usuario.nombre} {usuario.apellidos}
                </p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Email:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>{usuario.email}</p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Cédula:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>{usuario.cedula}</p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Rol:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>{usuario.rol?.nombre_rol || "N/A"}</p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Teléfono:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>{usuario.telefono || "N/A"}</p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Departamento:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>{usuario.departamento || "N/A"}</p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Estado:</p>
                <p style={{ margin: "0", color: usuario.activo ? "green" : "red", fontSize: "14px", fontWeight: "bold" }}>
                  {usuario.activo ? "✓ Activo" : "✗ Inactivo"}
                </p>
              </div>


              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>Fecha de Creación:</p>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                  {usuario.fecha_creacion ? new Date(usuario.fecha_creacion).toLocaleDateString() : "N/A"}
                </p>
              </div>


              {/* Botón editar */}
              {isAdmin() && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    marginTop: "15px",
                    padding: "10px 20px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    width: "100%",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Editar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
