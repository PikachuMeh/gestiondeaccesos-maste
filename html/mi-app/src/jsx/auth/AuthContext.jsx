import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar token al inicio
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

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
      
      // Decodificar el token para obtener info del usuario
      const tokenPayload = JSON.parse(atob(data.access_token.split('.')[1]));
      
      const userData = {
        id: tokenPayload.id,
        username: tokenPayload.username,
        rol: tokenPayload.rol  // Asume {id_rol: 1, nombre_rol: 'ADMINISTRADOR'}
      };

      // NUEVO: Validación básica del rol si no existe
      if (!userData.rol || !userData.rol.id_rol) {
        console.log(userData  )
        throw new Error("Rol no válido en el token");
      }

      setToken(data.access_token);
      setUser(userData);
      
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      
      // NO navegamos aquí, retornamos éxito
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
    // NO navegamos aquí, retornamos éxito
    return { success: true };
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  // NUEVO: Función genérica para permisos (jerarquía: ID bajo = más privilegios, ej: 1=ADMIN permite >=1)
  const hasPermission = (requiredRolId) => {
    if (!user || !user.rol || typeof user.rol.id_rol !== 'number') {
      return false;
    }
    // Ajusta la lógica si tu jerarquía es inversa (ID alto = privilegios)
    return user.rol.id_rol <= requiredRolId;  // ADMIN(1) <= 2 (permite OPERADOR+), etc.
  };

  // NUEVO: Helpers específicos (ajusta IDs según tu tabla roles)
  const isAdmin = () => hasPermission(1);  // Solo id_rol === 1 (o <=1 si hay sub-admins)
  const isOperatorOrAbove = () => hasPermission(2);  // ADMIN(1) o OPERADOR(2)
  const isSupervisorOrAbove = () => hasPermission(4);  // Si SUPERVISOR=4 es bajo, ajusta
  const isAuditorOrBelow = () => user?.rol.id_rol >= 3;  // AUDITOR(3) o SUPERVISOR(4): solo lectura

  // NUEVO: Función para obtener rol actual (útil para mostrar en UI)
  const getCurrentRoleName = () => user?.rol?.nombre_rol || 'Desconocido';

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    loading,
    // NUEVO: Exporta las funciones de permisos
    hasPermission,
    isAdmin,
    isOperatorOrAbove,
    isSupervisorOrAbove,
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
