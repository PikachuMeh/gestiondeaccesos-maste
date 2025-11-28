// src/jsx/DetalleUsuarioPage.jsx - ACTUALIZADO CON FOTO

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";

export default function DetalleUsuarioPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/usuarios`;
  const OPERADORES_IMG_URL = import.meta.env.VITE_OPERADORES_IMG_URL || "http://localhost:5173/src/img/operadores/";

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

  // Manejador para cambio de foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // Validar tipo
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de archivo no permitido. Usa: JPG, PNG, GIF o WEBP");
        return;
      }

      // Validar tamaño (máximo 5MB)
      const maxSizeMB = 5;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Archivo demasiado grande. Máximo: ${maxSizeMB}MB`);
        return;
      }

      setFotoFile(file);

      // Crear preview
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

  // Guardar cambios
  const handleSave = async () => {
    if (!isAdmin()) {
      setError("Solo administradores pueden editar usuarios");
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const formData = new FormData();

      // Agregar campos del formulario
      if (editForm.username && editForm.username !== usuario.username) {
        formData.append("username", editForm.username);
      }
      if (editForm.email && editForm.email !== usuario.email) {
        formData.append("email", editForm.email);
      }
      if (editForm.cedula && editForm.cedula !== usuario.cedula) {
        formData.append("cedula", editForm.cedula);
      }
      if (editForm.rol_id && editForm.rol_id !== usuario.rol_id) {
        formData.append("rol_id", editForm.rol_id);
      }

      // Agregar foto si fue seleccionada
      if (fotoFile) {
        formData.append("foto", fotoFile);
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

  // URL de la foto
  const fotoUrl = fotoPreview || (usuario.foto_path ? `${OPERADORES_IMG_URL}${usuario.foto_path}` : null);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1>Detalle del Usuario</h1>
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
          }}
        >
          ✗ {error}
        </div>
      )}

      {/* Contenedor principal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px", alignItems: "start" }}>
        {/* Columna izquierda - Foto */}
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
          <h3 style={{ margin: "0 0 10px 0" }}>Foto del Operador</h3>

          {/* Foto */}
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
              }}
            >
              Sin foto
            </div>
          )}

          {/* Botón editar foto (solo admin) */}
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
              }}
            >
              Cancelar cambio de foto
            </button>
          )}
        </div>

        {/* Columna derecha - Información */}
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          {isEditing ? (
            // Modo edición
            <div style={{ display: "grid", gap: "15px" }}>
              <h3>Editar Usuario</h3>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Username:
                </label>
                <input
                  type="text"
                  value={editForm.username || ""}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Email:
                </label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Cédula:
                </label>
                <input
                  type="text"
                  value={editForm.cedula || ""}
                  onChange={(e) => setEditForm({ ...editForm, cedula: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Rol:
                </label>
                <select
                  value={editForm.rol_id || 3}
                  onChange={(e) => setEditForm({ ...editForm, rol_id: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    fontSize: "14px",
                  }}
                >
                  <option value={2}>Supervisor</option>
                  <option value={3}>Operador</option>
                </select>
              </div>

              {/* Botones */}
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
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            // Modo vista
            <div style={{ display: "grid", gap: "15px" }}>
              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Username:</p>
                <p style={{ margin: "0", color: "#666" }}>{usuario.username}</p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Nombre Completo:</p>
                <p style={{ margin: "0", color: "#666" }}>
                  {usuario.nombre} {usuario.apellidos}
                </p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Email:</p>
                <p style={{ margin: "0", color: "#666" }}>{usuario.email}</p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Cédula:</p>
                <p style={{ margin: "0", color: "#666" }}>{usuario.cedula}</p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Rol:</p>
                <p style={{ margin: "0", color: "#666" }}>{usuario.rol?.nombre_rol || "N/A"}</p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Teléfono:</p>
                <p style={{ margin: "0", color: "#666" }}>{usuario.telefono || "N/A"}</p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Departamento:</p>
                <p style={{ margin: "0", color: "#666" }}>{usuario.departamento || "N/A"}</p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Estado:</p>
                <p style={{ margin: "0", color: usuario.activo ? "green" : "red" }}>
                  {usuario.activo ? "✓ Activo" : "✗ Inactivo"}
                </p>
              </div>

              <div>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Fecha de Creación:</p>
                <p style={{ margin: "0", color: "#666" }}>
                  {usuario.fecha_creacion ? new Date(usuario.fecha_creacion).toLocaleDateString() : "N/A"}
                </p>
              </div>

              {/* Botón editar */}
              {isAdmin() && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    marginTop: "10px",
                    padding: "10px 20px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    width: "100%",
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