// src/jsx/DetalleUsuarioPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";

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
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 text-muted-foreground">Cargando usuario...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800 mb-4">
          <p>Error: {error}</p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          onClick={handleBack}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 mb-4">
          <p>No se encontró el usuario solicitado.</p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          onClick={handleBack}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Detalle de usuario</h1>
          <p className="text-muted-foreground mt-2">
            Información completa del usuario seleccionado.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          onClick={handleBack}
        >
          Volver a la lista
        </button>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">ID</label>
              <div className="col-span-2 text-sm">{usuario.id}</div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nombre</label>
              <div className="col-span-2 text-sm">{usuario.nombre}</div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nombre de usuario</label>
              <div className="col-span-2 text-sm">{usuario.username}</div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Correo</label>
              <div className="col-span-2 text-sm">{usuario.email || "N/A"}</div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Rol</label>
              <div className="col-span-2 text-sm">{usuario.rol?.nombre_rol || "N/A"}</div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Cédula</label>
              <div className="col-span-2 text-sm">{usuario.cedula || "N/A"}</div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Activo</label>
              <div className="col-span-2 text-sm">
                <span className={usuario.activo ? "text-green-600" : "text-red-600"}>
                  {usuario.activo ? "Sí" : "No"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Fecha de creación</label>
              <div className="col-span-2 text-sm">{usuario.fecha_creacion || "N/A"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
