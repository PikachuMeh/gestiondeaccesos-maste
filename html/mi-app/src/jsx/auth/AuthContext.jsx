// src/jsx/auth/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useApi } from "../../context/ApiContext";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { API_V1 } = useApi();
  console.log("useApi imported in AuthContext");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isTokenValid = (tok) => {
    if (!tok) return false;
    try {
      const decoded = jwtDecode(tok);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (error) {
      console.error("Error validando token:", error);
      return false;
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      if (isTokenValid(savedToken)) {
        setToken(savedToken);
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error("Error parseando user:", error);
          logout();
        }
      } else {
        logout();
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token && !isTokenValid(token)) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_V1}/auth/login-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      // Manejo de errores de la API (401, 422, etc.)
      if (!response.ok) {
        let errorDetail = "Error al iniciar sesión";

        try {
          const errorData = await response.json();
          console.log("API Error response:", errorData);

          // 1) Caso más común: {"status_code":401,"detail":"Usuario no existe"}
          if (errorData.detail !== undefined) {
            if (typeof errorData.detail === "string") {
              errorDetail = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              // Ej: detail = [{ msg: "...", ... }, ...]
              errorDetail = errorData.detail
                .map((item) => item.msg || String(item))
                .join("; ");
            } else {
              errorDetail = String(errorData.detail);
            }
          }
          // 2) Otros formatos: { "error": "mensaje" } o { "error": { message: "..." } }
          else if (errorData.error !== undefined) {
            if (typeof errorData.error === "string") {
              errorDetail = errorData.error;
            } else if (errorData.error.message) {
              errorDetail = errorData.error.message;
            } else {
              errorDetail = JSON.stringify(errorData.error);
            }
          }
          // 3) Formato simple: { "message": "..." }
          else if (errorData.message) {
            errorDetail = errorData.message;
          }
        } catch (parseErr) {
          console.error("Error parsing API error response:", parseErr);
        }

        // Si no se pudo sacar nada más específico, al menos status + texto
        if (!errorDetail) {
          errorDetail = `Error ${response.status}: ${
            response.statusText || "No autorizado"
          }`;
        }

        // Lanzamos un Error con el mensaje ya limpio
        throw new Error(errorDetail);
      }

      // Si la respuesta es OK, procesamos el login normal
      const data = await response.json();

      let tokenPayload;
      try {
        tokenPayload = jwtDecode(data.access_token);
      } catch {
        // Fallback manual si jwtDecode falla
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
      navigate("/accesos");

      return { success: true };
    } catch (error) {
      console.error("Error en login:", error);

      let finalMessage = error?.message || "Error al iniciar sesión";

      // Por si en algún caso el backend devuelve un JSON como string
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
        console.error("Error parseando mensaje de error como JSON:", parseError);
      }

      // Devuelves el mensaje listo para mostrar en la UI
      return { success: false, message: finalMessage };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const isAuthenticated = () => !!token && !!user && isTokenValid(token);

  const handleApiError = (error) => {
    if (error?.status === 401 || error?.message?.includes("401")) {
      logout();
    }
  };

  const hasPermission = (requiredRolId) => {
    if (!user?.rol?.id_rol || typeof user.rol.id_rol !== "number") return false;
    return user.rol.id_rol <= requiredRolId;
  };

  const isAdmin = () => hasPermission(1);
  const isSupervisorOrAbove = () => hasPermission(2);
  const isOperatorOrAbove = () => hasPermission(3);
  const isAuditor = () => user?.rol.id_rol === 4;
  const isAuditorOrBelow = () => user?.rol.id_rol >= 4;
  const getCurrentRoleName = () => user?.rol?.nombre_rol || "Desconocido";

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
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

