// src/jsx/PersonasPage.jsx - CON BOTÓN AGREGAR PERSONA

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { useApi } from "../context/ApiContext.jsx";
import {
  FaPlus,
  FaSearch,
  FaBuilding,
  FaRedo,
  FaEye,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaUserFriends
} from "react-icons/fa";

const PAGE_SIZE = 10;

export default function PersonasPage() {
  const { API_V1 } = useApi();
  const API_BASE = `${API_V1}/personas`;
  const navigate = useNavigate();
  const didMount = useRef(false);
  const { token, isOperatorOrAbove, loading: authLoading } = useAuth();

  const canEdit = isOperatorOrAbove;
  const canCreate = isOperatorOrAbove; // OPERADOR+ puede crear

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Búsqueda unificada (nombre o cédula)
  const [searchQuery, setSearchQuery] = useState("");
  // Búsqueda por empresa (separada)
  const [empresa, setEmpresa] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce para búsqueda
  const [debSearchQuery, setDebSearchQuery] = useState(searchQuery);
  const [debEmpresa, setDebEmpresa] = useState(empresa);

  useEffect(() => {
    const id = setTimeout(() => setDebSearchQuery(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    const id = setTimeout(() => setDebEmpresa(empresa), 300);
    return () => clearTimeout(id);
  }, [empresa]);

  // Cargar personas
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!didMount.current) didMount.current = true;

    const ctrl = new AbortController();
    setPageLoading(true);

    // Preparar parámetros de búsqueda
    const params = new URLSearchParams({
      skip: String((page - 1) * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      ...(debEmpresa.trim() ? { empresa: debEmpresa.trim() } : {}),
    });

    // ✅ Búsqueda unificada: intenta nombre y documento
    if (debSearchQuery.trim()) {
      // Si es principalmente números, busca por documento
      const isNumeric = /^\d+$/.test(debSearchQuery.replace(/\s+/g, ""));
      if (isNumeric && debSearchQuery.length >= 3) {
        params.append("documento", debSearchQuery.trim());
      } else {
        // Sino, busca por nombre
        params.append("nombre", debSearchQuery.trim());
      }
    }

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${API_BASE}?${params.toString()}`, {
      signal: ctrl.signal,
      headers,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const items = Array.isArray(json) ? json : json.items ?? [];
        setRows(items);
        setPages(json.pages ?? Math.ceil((json.total ?? items.length) / PAGE_SIZE));
        setTotal(json.total ?? items.length);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error cargando personas");
        }
      })
      .finally(() => setPageLoading(false));

    return () => ctrl.abort();
  }, [page, debSearchQuery, debEmpresa, token, authLoading]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(pages, p + 1));

  const handleVerPersona = (id) => {
    navigate(`/personas/${id}`);
  };

  const handleEditarPersona = (id) => {
    navigate(`/personas/${id}/editar`);
  };

  // ✅ Nueva función para agregar persona
  const handleAgregarPersona = () => {
    navigate("/registro/visitante");
  };

  const handleLimpiarFiltros = () => {
    setSearchQuery("");
    setEmpresa("");
    setPage(1);
  };

  // Mientras se autentica
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-800 min-h-screen">
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-lg flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {/* Header con botón agregar */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaUserFriends className="text-blue-600 dark:text-blue-400" /> Personas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Total: {total} registros</p>
        </div>
        {canCreate && (
          <button
            onClick={handleAgregarPersona}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <FaPlus /> Nuevo Visitante
          </button>
        )}
      </div>

      {/* Filtros de Búsqueda */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FaSearch className="text-gray-400" /> Filtros de Búsqueda
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Búsqueda Unificada (Nombre o Cédula) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar por Nombre o Cédula
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Ej: Juan Pérez o 12345678"
                className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Escribe un nombre o una cédula para buscar
            </p>
          </div>

          {/* Búsqueda por Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar por Empresa
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaBuilding className="text-gray-400" />
              </div>
              <input
                type="text"
                value={empresa}
                onChange={(e) => {
                  setEmpresa(e.target.value);
                  setPage(1);
                }}
                placeholder="Ej: Acme Corp"
                className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Botón Limpiar */}
        {(searchQuery || empresa) && (
          <button
            onClick={handleLimpiarFiltros}
            className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <FaRedo /> Limpiar Filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      {pageLoading ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          Cargando personas...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          {searchQuery || empresa
            ? "No se encontraron personas con esos criterios"
            : "No hay personas registradas"}
        </div>
      ) : (
        <>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow overflow-x-auto border border-gray-200 dark:border-gray-700">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800">
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleVerPersona(p.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      V-{p.documento_identidad || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {p.nombre || "—"} {p.apellido || ""}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {p.empresa || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {p.cargo || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {p.unidad || "—"}
                    </td>
                    <td
                      className="px-6 py-4 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerPersona(p.id)}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          <FaEye /> Ver
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleEditarPersona(p.id)}
                            className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            <FaEdit /> Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="mt-6 flex justify-center items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              <FaChevronLeft /> Anterior
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded-lg transition-colors ${page === p
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
              {pages > 5 && <span className="text-gray-500 dark:text-gray-400">...</span>}
            </div>

            <button
              onClick={handleNext}
              disabled={page === pages}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              Siguiente <FaChevronRight />
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {page} de {pages}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
