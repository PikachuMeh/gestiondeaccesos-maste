// src/config/api.js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

export const API_V1 = `${API_BASE_URL}/api/v1`;
