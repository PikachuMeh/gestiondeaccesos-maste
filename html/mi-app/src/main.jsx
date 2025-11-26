// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import App from "./App.jsx"; // Layout con Navbar
import { AuthProvider } from "./jsx/auth/AuthContext.jsx";
import ProtectedRoute from "./jsx/auth/ProtectedRoute.jsx";

// Páginas
import AccesosPage from "./jsx/AccesosPage.jsx";
import PersonasPage from "./jsx/PersonasPage.jsx";
import UsuariosPage from "./jsx/UsuariosPage.jsx";
import CrearAccesoPage from "./jsx/registros/registro_acceso.jsx";
import LoginPage from "./jsx/LoginPage.jsx";
import CrearVisitante from "./jsx/registros/registro_funcionario.jsx";
import DetalleVisitaPage from "./jsx/DetalleVisita.jsx";
import DetallePersonaPage from "./jsx/DetallePersona.jsx";
import EditarPersonaPage from "./jsx/EditarPersonaPage.jsx";
import Perfil_persona from "./jsx/profile/perfil.jsx";
import ForgotPasswordPage from "./jsx/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./jsx/ResetPasswordPage.jsx";
import CrearUsuarioPage from "./jsx/registros/CrearUsuarioPage.jsx";
import AuditPage from "./jsx/AuditPage.jsx";
import DetalleUsuarioPage from "./jsx/DetalleUsuarioPage.jsx";

import './index.css';

// ✅ NUEVO: Provider de API (centraliza VITE_API_BASE_URL)
import { ApiProvider } from "./context/ApiContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ✅ Providers ANTES de la app */}
    <ApiProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ========== RUTAS PÚBLICAS (sin auth) ========== */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            {/* ========== RUTA RAÍZ PROTEGIDA (layout general con Navbar) ========== */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            >
              {/* Solo auth básica */}
              <Route index element={<Navigate to="/accesos" replace />} />

              {/* Acceso general */}
              <Route path="accesos" element={<AccesosPage />} />

              {/* OPERADOR+ (rol <=3: consultas/registrar) */}
              <Route path="accesos/nuevo" element={<CrearAccesoPage />} />
              <Route path="accesos/:id" element={<DetalleVisitaPage />} />
              <Route path="personas" element={<PersonasPage />} />
              <Route path="personas/nuevo" element={<CrearVisitante />} />
              <Route path="personas/:id" element={<DetallePersonaPage />} />
              <Route path="personas/:id/editar" element={<EditarPersonaPage />} />
              <Route path="profile" element={<Perfil_persona />} />

              {/* SUPERVISOR+ (rol <=2: gestión operadores) */}
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="usuarios/nuevo" element={<CrearUsuarioPage />} />
              <Route path="usuarios/:id" element={<DetalleUsuarioPage />} />

              {/* ADMIN (rol <=1: ediciones avanzadas) */}
              <Route path="usuarios/:id/editar" element={<CrearUsuarioPage />} />

              {/* AUDITOR (rol =4: solo logs de auditoría) */}
              <Route path="audit" element={<AuditPage />} />

              {/* ========== CATCH-ALL ========== */}
              <Route path="*" element={<Navigate to="/accesos" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApiProvider>
  </React.StrictMode>
);
