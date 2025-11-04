import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext"; // Asume que expone logout()
import "../../css/perfil.css";

export default function Perfil_persona() {
    const { user, isAuthenticated, logout } = useAuth(); // Agrego logout para 401
    const [perfilData, setPerfilData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Función para obtener el token de acceso
    const getAuthToken = () => {
        return localStorage.getItem('access_token'); // Ajusta si useAuth lo maneja
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
                const response = await fetch("http://localhost:8000/api/v1/auth/perfil", {
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
    }, [user, isAuthenticated, logout]); // Dependencia en logout

    if (loading) {
        return <div className="vp-screen"><div className="vp-state">Cargando perfil...</div></div>;
    }

    if (error) {
        return (
            <div className="vp-screen">
                <div className="vp-state vp-state--err">Error: {error}</div>
            </div>
        );
    }
    
    const displayData = perfilData; // Directo de backend (PerfilResponse)

    if (!displayData) {
        return (
            <div className="vp-screen">
                <div className="vp-state">No se encontraron datos de perfil.</div>
            </div>
        );
    }

    return (
        <div className="vp-screen">
            <div className="vp-card vp-profile-card">
                <h1 className="vp-title">Mi Perfil</h1>

                <div className="vp-profile-header">
                    <div className="vp-profile-info">
                        <h2 className="vp-profile-name">{displayData.nombre} {displayData.apellidos}</h2>
                        <p className="vp-profile-rol">Rol: {displayData.rol?.nombre_rol || 'No Asignado'}</p>
                    </div>
                </div>
                
                <div className="vp-profile-details">
                    <div className="vp-section">
                        <h3 className="vp-section-title">Detalles de Contacto y Cuenta</h3>
                        <div className="vp-grid">
                            <p><strong>Usuario:</strong> {displayData.username}</p>
                            <p><strong>Cédula:</strong> {displayData.documento_identidad || displayData.cedula}</p>
                            <p><strong>Email:</strong> {displayData.email}</p>
                            <p><strong>Teléfono:</strong> {displayData.telefono || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="vp-section">
                        <h3 className="vp-section-title">Información Laboral</h3>
                        <div className="vp-grid">
                            <p><strong>Empresa:</strong> {displayData.empresa || 'N/A'}</p>
                            <p><strong>Cargo:</strong> {displayData.cargo || 'N/A'}</p>
                            <p><strong>Departamento:</strong> {displayData.departamento || 'N/A'}</p>
                            <p><strong>Unidad:</strong> {displayData.unidad || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="vp-section">
                        <h3 className="vp-section-title">Otros Datos</h3>
                        <div className="vp-grid">
                            <p><strong>Dirección:</strong> {displayData.direccion || 'N/A'}</p>
                            <p><strong>Último Acceso:</strong> {displayData.ultimo_acceso ? new Date(displayData.ultimo_acceso).toLocaleString('es-CO') : 'N/A'}</p>
                            <p><strong>Cuenta Activa:</strong> {displayData.activo ? 'Sí' : 'No'}</p>
                        </div>
                    </div>

                    <div className="vp-toolbar vp-profile-actions">
                        <button className="vp-btn vp-btn--primary" onClick={() => {/* Navega a editar perfil */}}>Editar Perfil</button>
                        <button className="vp-btn" onClick={logout}>Cerrar Sesión</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
