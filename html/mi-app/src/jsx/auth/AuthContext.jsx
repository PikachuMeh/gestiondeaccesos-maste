import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";  // Para navigate en logout y errores
import { jwtDecode } from "jwt-decode";  // Fix: Import nombrado (no default)

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();  // Para redirigir en logout y errores

  // Función para validar token (expiración y formato)
  const isTokenValid = (tok) => {
    if (!tok) return false;
    try {
      const decoded = jwtDecode(tok);  // Usa jwtDecode
      const currentTime = Date.now() / 1000;  // Tiempo actual en segundos
      return decoded.exp > currentTime;  // Verifica si no ha expirado
    } catch (error) {
      console.error("Error validando token:", error);
      return false;
    }
  };

  // Cargar token y user al inicio, con validación
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    
    if (savedToken && savedUser) {
      if (isTokenValid(savedToken)) {  // Valida antes de setear
        setToken(savedToken);
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error("Error parseando user:", error);
          logout();  // Limpia si user corrupto
        }
      } else {
        // Token inválido (expirado): Limpia automáticamente
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Efecto adicional para revalidar si cambia el token (ej. post-API)
  useEffect(() => {
    if (token && !isTokenValid(token)) {
      logout();  // Forza logout si token se invalida
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/login-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error al iniciar sesión");
      }

      const data = await response.json();
      
      // Decodificar el token para obtener info del usuario (usa jwtDecode para robustez)
      // Fallback a atob si jwtDecode falla (mantengo compatibilidad con tu código original)
      let tokenPayload;
      try {
        tokenPayload = jwtDecode(data.access_token);
      } catch {
        // Fallback: Tu método original con atob (inseguro, pero funciona)
        const base64Url = data.access_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        tokenPayload = JSON.parse(jsonPayload);
      }
      
      const userData = {
        id: tokenPayload.user_id || tokenPayload.id,  // Ajusta según tu payload (user_id en ejemplo)
        username: tokenPayload.sub || tokenPayload.username,
        rol: tokenPayload.rol  // {id_rol: 1, nombre_rol: 'ADMIN'}
      };

      // Validación básica del rol si no existe
      if (!userData.rol || !userData.rol.id_rol) {
        console.log(userData);
        throw new Error("Rol no válido en el token");
      }

      // Verifica que el token sea válido antes de guardar
      if (!isTokenValid(data.access_token)) {
        throw new Error("Token inválido recibido del servidor");
      }

      setToken(data.access_token);
      setUser(userData);
      
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      
      navigate("/accesos");  // Redirige después de login exitoso
      return { success: true };
    } catch (error) {
      console.error("Error en login:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });  // Redirige y reemplaza history
    return { success: true };
  };

  // Actualizado: Incluye chequeo de validez del token
  const isAuthenticated = () => {
    return !!token && !!user && isTokenValid(token);
  };

  // Maneja errores 401 globalmente (usa en fetches de componentes)
  const handleApiError = (error) => {
    if (error?.status === 401 || error?.message?.includes("401")) {
      logout();  // Limpia y redirige al login
    }
  };

  // Función genérica para permisos (sin cambios, pero usa user validado)
  const hasPermission = (requiredRolId) => {
    if (!user || !user.rol || typeof user.rol.id_rol !== 'number') {
      return false;
    }
    return user.rol.id_rol <= requiredRolId;
  };

  // Helpers específicos (sin cambios)
  const isAdmin = () => hasPermission(1);
  const isSupervisorOrAbove = () => hasPermission(2);
  const isOperatorOrAbove = () => hasPermission(3);
  const isAuditor = () => user?.rol.id_rol === 4;
  const isAuditorOrBelow = () => user?.rol.id_rol >= 4;
  const getCurrentRoleName = () => user?.rol?.nombre_rol || 'Desconocido';

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    loading,
    handleApiError,  // Exporta para usar en componentes
    hasPermission,
    isAdmin,
    isSupervisorOrAbove,
    isOperatorOrAbove,
    isAuditor,
    isAuditorOrBelow,
    getCurrentRoleName
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};
