// src/context/ApiContext.jsx
import { createContext, useContext } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_V1 = `${API_BASE_URL}/api/v1`;
const IMG_OPERADORES = `${API_BASE_URL}/src/img/operadores`;

const ApiContext = createContext({ 
  API_BASE_URL, 
  API_V1,
  IMG_OPERADORES 
});

export const ApiProvider = ({ children }) => (
  <ApiContext.Provider value={{ API_BASE_URL, API_V1, IMG_OPERADORES }}>
    {children}
  </ApiContext.Provider>
);

export const useApi = () => {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error("useApi debe usarse dentro de ApiProvider");
  }
  return ctx;
};

