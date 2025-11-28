// src/jsx/auth/AuthContext.jsx - CORREGIDO
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useApi } from "../../context/ApiContext";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { API_V1 } = useApi();
  console.log("✓ AuthProvider inicializado, API_V1:", API_V1);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Validar si token es válido
  const isTokenValid = useCallback((tok) => {
    if (!tok) return false;
    try {
      const decoded = jwtDecode(tok);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (error) {
      console.error("❌ Error validando token:", error);
      return false;
    }
  }, []);

  // Cargar token del localStorage al montar
  useEffect(() => {
    console.log("✓ AuthProvider: leyendo localStorage");
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      if (isTokenValid(savedToken)) {
        console.log("✓ Token válido, restaurando sesión");
        setToken(savedToken);
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error("❌ Error parseando user:", error);
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
        }
      } else {
        console.log("❌ Token expirado");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, [isTokenValid]);

  // Validar token cuando cambia
  useEffect(() => {
    if (token && !isTokenValid(token)) {
      console.log("❌ Token inválido, haciendo logout");
      setToken(null);
      setUser(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
  }, [token, isTokenValid]);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_V1}/auth/login-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        let errorDetail = "Error al iniciar sesión";
        try {
          const errorData = await response.json();
          console.log("API Error response:", errorData);

          if (errorData.detail !== undefined) {
            if (typeof errorData.detail === "string") {
              errorDetail = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              errorDetail = errorData.detail
                .map((item) => item.msg || String(item))
                .join("; ");
            } else {
              errorDetail = String(errorData.detail);
            }
          } else if (errorData.error !== undefined) {
            if (typeof errorData.error === "string") {
              errorDetail = errorData.error;
            } else if (errorData.error.message) {
              errorDetail = errorData.error.message;
            } else {
              errorDetail = JSON.stringify(errorData.error);
            }
          } else if (errorData.message) {
            errorDetail = errorData.message;
          }
        } catch (parseErr) {
          console.error("Error parsing API error response:", parseErr);
        }

        if (!errorDetail) {
          errorDetail = `Error ${response.status}: ${response.statusText || "No autorizado"}`;
        }

        throw new Error(errorDetail);
      }

      const data = await response.json();
      console.log("✓ Login exitoso");

      let tokenPayload;
      try {
        tokenPayload = jwtDecode(data.access_token);
      } catch {
        const base64Url = data.access_token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        tokenPayload = JSON.parse(jsonPayload);
      }

      const userData = {
        id: tokenPayload.user_id || tokenPayload.id,
        username: tokenPayload.sub || tokenPayload.username,
        rol: tokenPayload.rol,
      };

      if (!userData.rol || !userData.rol.id_rol) {
        throw new Error("Rol no válido en el token");
      }

      if (!isTokenValid(data.access_token)) {
        throw new Error("Token inválido recibido del servidor");
      }

      setToken(data.access_token);
      setUser(userData);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✓ Navegando a /accesos");
      navigate("/accesos");
      return { success: true };
    } catch (error) {
      console.error("❌ Error en login:", error);
      let finalMessage = error?.message || "Error al iniciar sesión";

      try {
        if (
          typeof finalMessage === "string" &&
          (finalMessage.trim().startsWith("{") ||
            finalMessage.trim().startsWith("["))
        ) {
          const parsed = JSON.parse(finalMessage);
          if (typeof parsed.detail === "string") {
            finalMessage = parsed.detail;
          } else if (parsed.message) {
            finalMessage = parsed.message;
          } else if (typeof parsed.error === "string") {
            finalMessage = parsed.error;
          }
        }
      } catch (parseError) {
        console.error("Error parseando mensaje de error:", parseError);
      }

      return { success: false, message: finalMessage };
    }
  };

  const logout = useCallback(() => {
    console.log("✓ Logout ejecutado");
    setToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  const isAuthenticated = useCallback(() => {
    const auth = !!token && !!user && isTokenValid(token);
    console.log("isAuthenticated():", auth);
    return auth;
  }, [token, user, isTokenValid]);

  const handleApiError = useCallback(
    (error) => {
      if (error?.status === 401 || error?.message?.includes("401")) {
        logout();
      }
    },
    [logout]
  );

  const hasPermission = useCallback((requiredRolId) => {
    if (!user?.rol?.id_rol || typeof user.rol.id_rol !== "number") return false;
    return user.rol.id_rol <= requiredRolId;
  }, [user]);

  const isAdmin = useCallback(() => hasPermission(1), [hasPermission]);
  const isSupervisorOrAbove = useCallback(() => hasPermission(2), [hasPermission]);
  const isOperatorOrAbove = useCallback(() => hasPermission(3), [hasPermission]);
  const isAuditor = useCallback(() => user?.rol.id_rol === 4, [user]);
  const isAuditorOrBelow = useCallback(() => user?.rol.id_rol >= 4, [user]);
  const getCurrentRoleName = useCallback(() => user?.rol?.nombre_rol || "Desconocido", [user]);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    loading,
    handleApiError,
    hasPermission,
    isAdmin,
    isSupervisorOrAbove,
    isOperatorOrAbove,
    isAuditor,
    isAuditorOrBelow,
    getCurrentRoleName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};
