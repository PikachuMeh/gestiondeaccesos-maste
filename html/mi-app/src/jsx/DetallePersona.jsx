// src/jsx/DetallePersona.jsx - CORREGIDO CON IMAGEN FUNCIONANDO

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";

export default function DetallePersonaPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/personas`;
  const { id } = useParams();
  const navigate = useNavigate();

  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [persona, setPersona] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated()) {
      setError("Sesión expirada. Redirigiendo a login...");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    const ctrl = new AbortController();
    setPageLoading(true);
    setError(null);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    fetch(`${API_BASE}/${id}`, {
      signal: ctrl.signal,
      headers,
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 403)
            throw new Error("Acceso denegado: Verifica tu sesión.");
          if (r.status === 401)
            throw new Error("No autenticado: Redirigiendo...");
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setPersona)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar la persona");
          if (
            err.message.includes("No autenticado") ||
            err.message.includes("Acceso denegado")
          ) {
            setTimeout(() => navigate("/login"), 2000);
          }
        }
      })
      .finally(() => setPageLoading(false));

    return () => ctrl.abort();
  }, [id, token, isAuthenticated, navigate, authLoading]);

  const handleBack = () => {
    navigate("/personas");
  };

  const handleVerAccesos = () => {
    navigate(`/accesos?persona_id=${id}`);
  };

  // ✅ Función para construir URL de imagen (igual que EditarPersona)
  const getImageUrl = (fotoPath) => {
    if (!fotoPath) return null;
    if (fotoPath.startsWith("http")) return fotoPath;
    return `${API_V1}/files/${fotoPath}`;
  };

  // Estados de carga
  if (authLoading || pageLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Cargando persona...</p>
        </div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              {error || "Persona no encontrada"}
            </p>
            <button
              onClick={handleBack}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Volver a Personas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
          ❌ {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {persona.nombre} {persona.apellido}
          </h1>
          <button
            onClick={handleBack}
            className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
          >
            ← Volver
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Lado Izquierdo - Imagen */}
          <div className="md:col-span-1">
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              {persona.foto ? (
                <img
                  src={getImageUrl(persona.foto)}
                  alt={`${persona.nombre} ${persona.apellido}`}
                  className="w-full h-auto object-cover aspect-square"
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/300?text=Sin+Foto";
                  }}
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                  <div className="text-center">
                    <div className="text-6xl mb-2">👤</div>
                    <p className="text-gray-600 text-sm">Sin foto</p>
                  </div>
                </div>
              )}
            </div>

            {/* Información Rápida */}
            <div className="mt-6 space-y-3">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Cédula</p>
                <p className="text-lg font-semibold text-blue-900">
                  V-{persona.documento_identidad || "N/A"}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-600 font-medium">Empresa</p>
                <p className="text-lg font-semibold text-green-900">
                  {persona.empresa || "N/A"}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-600 font-medium">Cargo</p>
                <p className="text-lg font-semibold text-purple-900">
                  {persona.cargo || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Lado Derecho - Información Detallada */}
          <div className="md:col-span-2">
            {/* Información de Contacto */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                📞 Información de Contacto
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <p className="text-gray-900 mt-1">
                    {persona.email ? (
                      <a
                        href={`mailto:${persona.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {persona.email}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Teléfono
                  </label>
                  <p className="text-gray-900 mt-1">
                    {persona.telefono ? (
                      <a
                        href={`tel:${persona.telefono}`}
                        className="text-blue-600 hover:underline"
                      >
                        {persona.telefono}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">
                    Dirección
                  </label>
                  <p className="text-gray-900 mt-1">
                    {persona.direccion || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Información Organizacional */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                🏢 Información Organizacional
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Empresa
                  </label>
                  <p className="text-gray-900 mt-1">{persona.empresa || "N/A"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Unidad
                  </label>
                  <p className="text-gray-900 mt-1">{persona.unidad || "N/A"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Cargo
                  </label>
                  <p className="text-gray-900 mt-1">{persona.cargo || "N/A"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Departamento
                  </label>
                  <p className="text-gray-900 mt-1">
                    {persona.departamento || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            {persona.observaciones && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                  📝 Observaciones
                </h2>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {persona.observaciones}
                  </p>
                </div>
              </div>
            )}

            {/* Fechas */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                📅 Información de Registro
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Fecha de Creación
                  </label>
                  <p className="text-gray-900 mt-1">
                    {persona.fecha_creacion
                      ? new Date(persona.fecha_creacion).toLocaleDateString(
                          "es-ES"
                        )
                      : "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Última Actualización
                  </label>
                  <p className="text-gray-900 mt-1">
                    {persona.fecha_actualizacion
                      ? new Date(persona.fecha_actualizacion).toLocaleDateString(
                          "es-ES"
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="border-t pt-6 flex gap-3 justify-end">
          <button
            onClick={handleBack}
            className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors font-medium"
          >
            ← Volver
          </button>
          <button
            onClick={handleVerAccesos}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>📋</span> Ver Accesos
          </button>
        </div>
      </div>
    </div>
  );
}
