import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../context/ApiContext.jsx";
import {
    FaUser,
    FaIdCard,
    FaEnvelope,
    FaPhone,
    FaBuilding,
    FaBriefcase,
    FaSitemap,
    FaMapMarkerAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaEdit,
    FaSignOutAlt,
    FaExclamationCircle
} from "react-icons/fa";

export default function Perfil_persona() {

    const { API_V1 } = useApi();
    const { user, isAuthenticated, logout } = useAuth();
    const [perfilData, setPerfilData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Función para obtener el token de acceso
    const getAuthToken = () => {
        return localStorage.getItem('access_token');
    };

    useEffect(() => {
        if (!isAuthenticated() || !user) {
            setLoading(false);
            return;
        }

        const fetchProfileData = async () => {
            const token = getAuthToken();
            if (!token) {
                setError("No se encontró token de autenticación.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_V1}/auth/perfil`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        logout(); // Redirige a login si token inválido
                        return;
                    }
                    throw new Error(`Error ${response.status}: No se pudo cargar el perfil.`);
                }

                const data = await response.json();
                setPerfilData(data); // Datos combinados de PerfilResponse
            } catch (err) {
                console.error("Error al obtener datos del perfil:", err);
                setError("Ocurrió un error al cargar su información.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [user, isAuthenticated, logout]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-lg flex items-center gap-2">
                    <FaExclamationCircle className="text-xl" />
                    <span>Error: {error}</span>
                </div>
            </div>
        );
    }

    const displayData = perfilData;

    if (!displayData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-6 py-4 rounded-lg flex items-center gap-2">
                    <FaExclamationCircle className="text-xl" />
                    <span>No se encontraron datos de perfil.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="bg-blue-600 dark:bg-blue-700 px-6 py-4 border-b border-blue-700 dark:border-blue-800">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FaUser /> Mi Perfil
                    </h1>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-4">
                            <FaUser className="text-6xl text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {displayData.nombre} {displayData.apellidos}
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center md:justify-start gap-2 mt-1">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">
                                    {displayData.rol?.nombre_rol || 'No Asignado'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 flex items-center gap-2">
                                    <FaIdCard className="text-blue-500" /> Detalles de Contacto y Cuenta
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <FaUser className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuario</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FaIdCard className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cédula</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.documento_identidad || displayData.cedula}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FaEnvelope className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FaPhone className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.telefono || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 flex items-center gap-2">
                                    <FaBuilding className="text-blue-500" /> Información Laboral
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <FaBuilding className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Empresa</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.empresa || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FaBriefcase className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cargo</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.cargo || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FaSitemap className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departamento</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.departamento || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FaSitemap className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unidad</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.unidad || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-blue-500" /> Otros Datos
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <FaMapMarkerAlt className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dirección</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.direccion || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FaClock className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Último Acceso</p>
                                            <p className="text-gray-900 dark:text-white">
                                                {displayData.ultimo_acceso ? new Date(displayData.ultimo_acceso).toLocaleString('es-CO') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        {displayData.activo ? (
                                            <FaCheckCircle className="text-green-500 mt-1" />
                                        ) : (
                                            <FaTimesCircle className="text-red-500 mt-1" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cuenta Activa</p>
                                            <p className="text-gray-900 dark:text-white">{displayData.activo ? 'Sí' : 'No'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                                <button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    onClick={() => {/* Navega a editar perfil */ }}
                                >
                                    <FaEdit /> Editar Perfil
                                </button>
                                <button
                                    className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    onClick={logout}
                                >
                                    <FaSignOutAlt /> Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
