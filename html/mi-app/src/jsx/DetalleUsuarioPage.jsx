// src/jsx/DetalleUsuarioPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import "../css/usuarios_detalles.css"; // opcional, o reutiliza usuarios.css

const API_BASE = "http://localhost:8000/api/v1/usuarios";

export default function DetalleUsuarioPage() {
  const { id } = useParams();              // /usuarios/:id
  const navigate = useNavigate();
  const { token } = useAuth();

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleBack = () => {
    navigate("/usuarios");
  };

  if (loading) {
    return <div className="usuarios-detalle-loading">Cargando usuario...</div>;
  }

  if (error) {
    return (
      <div className="usuarios-detalle-error">
        <p>Error: {error}</p>
        <button onClick={handleBack}>Volver</button>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="usuarios-detalle-error">
        <p>No se encontró el usuario solicitado.</p>
        <button onClick={handleBack}>Volver</button>
      </div>
    );
  }

  return (
    <div className="usuarios-detalle-container">
      <h1>Detalle de usuario</h1>
      <p className="usuarios-detalle-subtitle">
        Información completa del usuario seleccionado.
      </p>

      <div className="usuarios-detalle-card">
        <div className="usuarios-detalle-row">
          <span className="label">ID:</span>
          <span>{usuario.id}</span>
        </div>
        <div className="usuarios-detalle-row">
          <span className="label">Nombre:</span>
          <span>{usuario.nombre}</span>
        </div>
        <div className="usuarios-detalle-row">
          <span className="label">Nombre de usuario:</span>
          <span>{usuario.username}</span>
        </div>
        <div className="usuarios-detalle-row">
          <span className="label">Correo:</span>
          <span>{usuario.email || "N/A"}</span>
        </div>
        <div className="usuarios-detalle-row">
          <span className="label">Rol:</span>
          <span>{usuario.rol?.nombre_rol || "N/A"}</span>
        </div>
        <div className="usuarios-detalle-row">
          <span className="label">Cédula:</span>
          <span>{usuario.cedula || "N/A"}</span>
        </div>
        <div className="usuarios-detalle-row">
            <span className="label">Activo:</span>
            <span className={usuario.activo ? "estado-activo" : "estado-inactivo"}>
                {usuario.activo ? "Sí" : "No"}
            </span>
        </div>

        <div className="usuarios-detalle-row">
          <span className="label">Fecha de creación:</span>
          <span>{usuario.fecha_creacion || "N/A"}</span>
        </div>
        {/* Agrega más campos si tu esquema los trae */}
      </div>

      <button className="btn btn--secondary" onClick={handleBack}>
        Volver a la lista
      </button>
    </div>
  );
}
