import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext"; // Asumo que usas el hook useAuth
import "../../css/perfil.css";

export default function Perfil_persona() {
    const { user, isAuthenticated } = useAuth(); // Obtener datos básicos del usuario del contexto
    const [perfilData, setPerfilData] = useState(null); // Estado para guardar los datos completos del perfil
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Función para obtener el token de acceso (necesario para el header Authorization)
    const getAuthToken = () => {
        // Asume que tu AuthContext guarda y expone la forma de obtener el token actual
        // Esto es un ejemplo, ajústalo a tu implementación real de AuthContext
        const token = localStorage.getItem('access_token'); 
        return token;
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
                // Endpoint que creamos/modificamos en FastApi
                const response = await fetch("http://localhost:8000/api/v1/auth/perfil  ", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`, // Se requiere el token JWT
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: No se pudo cargar el perfil.`);
                }
                
                const data = await response.json();
                setPerfilData(data); // Asumiendo que 'data' contiene la info combinada
            } catch (err) {
                console.error("Error al obtener datos del perfil:", err);
                setError("Ocurrió un error al cargar su información.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [user, isAuthenticated]); // Re-ejecutar si el usuario o el estado de auth cambia

    if (loading) {
        return <div className="perfil-container">Cargando perfil...</div>;
    }

    if (error) {
        return <div className="perfil-container error-message">Error: {error}</div>;
    }
    
    // Si la API devuelve la data directamente (el usuario y la persona combinados)
    // ...
    // ... en lugar de:
    // const displayData = perfilData?.persona || perfilData?.usuario; 
    // ... usa directamente:
    const displayData = perfilData; 

    if (!displayData) {
        return <div className="perfil-container">No se encontraron datos de perfil.</div>;
    }

    return (
        <div className="perfil-container">
            <div className="perfil-header">
                {/* Asumiendo que la Persona tiene un campo 'foto' */}
                <img 
                    className="perfil-foto" 
                    src={displayData.foto || "/src/img/default-profile.png"} 
                    alt={`Foto de perfil de ${displayData.nombre}`} 
                />
                <h2>{displayData.nombre} {displayData.apellido || displayData.apellidos}</h2>
                <p className="perfil-rol">Rol: {displayData.rol ? displayData.rol.nombre_rol : 'No Asignado'}</p> 
            </div>
            
            <div className="perfil-details">
                <h3>Detalles de Contacto y Cuenta</h3>
                <p><strong>Usuario:</strong> {displayData.username}</p>
                <p><strong>Cédula:</strong> {displayData.documento_identidad || displayData.cedula}</p>
                <p><strong>Email:</strong> {displayData.email}</p>
                <p><strong>Teléfono:</strong> {displayData.telefono || 'N/A'}</p>

                <h3>Información Laboral</h3>
                <p><strong>Empresa:</strong> {displayData.empresa || 'N/A'}</p>
                <p><strong>Cargo:</strong> {displayData.cargo || 'N/A'}</p>
                <p><strong>Departamento:</strong> {displayData.departamento || 'N/A'}</p>
                <p><strong>Unidad:</strong> {displayData.unidad || 'N/A'}</p>

                <h3>Otros Datos</h3>
                <p><strong>Dirección:</strong> {displayData.direccion || 'N/A'}</p>
                <p><strong>Último Acceso:</strong> {displayData.ultimo_acceso ? new Date(displayData.ultimo_acceso).toLocaleString() : 'N/A'}</p>
                <p><strong>Cuenta Activa:</strong> {displayData.activo ? 'Sí' : 'No'}</p>
                {/* Aquí podrías agregar un botón para editar el perfil si el usuario tiene permiso */}
            </div>
        </div>
    );
}

// Nota: El uso de 'displayData.rol.nombre_rol' asume que tu UsuarioResponse incluye el rol como objeto.