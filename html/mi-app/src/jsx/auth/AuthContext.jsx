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
        rol: tokenPayload.rol  // Asume {id_rol: 3, nombre_rol: 'OPERADOR'} para operador
      };

      // Validación básica del rol si no existe
      if (!userData.rol || !userData.rol.id_rol) {
        console.log(userData);
        throw new Error("Rol no válido en el token");
      }

      setToken(data.access_token);
      setUser(userData);
      
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      
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
    return { success: true };
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  // Función genérica para permisos (jerarquía: ID bajo = más privilegios; <= required permite igual o superior)
  const hasPermission = (requiredRolId) => {
    if (!user || !user.rol || typeof user.rol.id_rol !== 'number') {
      return false;
    }
    return user.rol.id_rol <= requiredRolId;  // E.g., required=3 permite 1(ADMIN),2(SUPERVISOR),3(OPERADOR)
  };

  // Helpers específicos (ajustados a tu jerarquía: ADMIN=1, SUPERVISOR=2, OPERADOR=3, AUDITOR=4)
  const isAdmin = () => hasPermission(1);  // Solo ADMIN (id_rol <=1)
  const isSupervisorOrAbove = () => hasPermission(2);  // ADMIN(1) + SUPERVISOR(2)
  const isOperatorOrAbove = () => hasPermission(3);  // ADMIN(1) + SUPERVISOR(2) + OPERADOR(3)
  const isAuditor = () => user?.rol.id_rol === 4;  // Solo AUDITOR (id_rol =4)
  const isAuditorOrBelow = () => user?.rol.id_rol >= 4;  // AUDITOR(4): solo lectura básica, excluye privilegios altos

  // Función para obtener rol actual
  const getCurrentRoleName = () => user?.rol?.nombre_rol || 'Desconocido';

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    loading,
    // Exporta las funciones de permisos
    hasPermission,
    isAdmin,
    isSupervisorOrAbove,  // Renombrado para claridad (era isSupervisorOrAbove)
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

