// src/main.jsx (versión corregida e integrada)
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";  // Layout con Navbar
import { AuthProvider } from "./jsx/auth/AuthContext.jsx";
import ProtectedRoute from "./jsx/auth/ProtectedRoute.jsx";
import AccesosPage from "./jsx/AccesosPage.jsx";
import PersonasPage from "./jsx/PersonasPage.jsx";
import UsuariosPage from "./jsx/UsuariosPage.jsx";  // AGREGADO: Para gestión de operadores/supervisores
import CrearAccesoPage from "./jsx/registros/registro_acceso.jsx";
import LoginPage from "./jsx/LoginPage.jsx";
import CrearVisitante from "./jsx/registros/registro_funcionario.jsx";
import DetalleVisitaPage from "./jsx/DetalleVisita.jsx";
import DetallePersonaPage from "./jsx/DetallePersona.jsx";
import EditarPersonaPage from "./jsx/EditarPersonaPage.jsx";
import Perfil_persona from "./jsx/profile/perfil.jsx";
import ForgotPasswordPage from "./jsx/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./jsx/ResetPasswordPage.jsx";
import CrearUsuarioPage from "./jsx/registros/CrearUsuarioPage.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* ========== RUTAS PÚBLICAS (sin auth) ========== */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ========== RUTA RAÍZ PROTEGIDA (layout general con Navbar) ========== */}
        <Route
          path="/"
          element={
            <ProtectedRoute>  {/* Solo auth básica (sin rol específico) */}
              <App />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/accesos" replace />} />  {/* Redirige a accesos por defecto */}

          {/* Acceso general para autenticados (sin rol extra) */}
          <Route path="perfil" element={<Perfil_persona />} />

          {/* Rutas para OPERADOR+ (rol <=3: consulta/registrar visitas/personas) */}
          <Route 
            path="accesos" 
            element={
              <ProtectedRoute requiredRoleId={3}>
                <AccesosPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="accesos/:id" 
            element={
              <ProtectedRoute requiredRoleId={3}>
                <DetalleVisitaPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="accesos/nuevo" 
            element={
              <ProtectedRoute requiredRoleId={3}>
                <CrearAccesoPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="personas" 
            element={
              <ProtectedRoute requiredRoleId={3}>
                <PersonasPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="personas/:id" 
            element={
              <ProtectedRoute requiredRoleId={3}>
                <DetallePersonaPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="registro/visitante" 
            element={
              <ProtectedRoute requiredRoleId={3}>  {/* CORREGIDO: Typo 'ProtectedRoleId' → 'requiredRoleId' */}
                <CrearVisitante />
              </ProtectedRoute>
            } 
          />

          {/* NUEVA: Rutas para SUPERVISOR+ (rol <=2: gestión de operadores y ediciones avanzadas) */}
          <Route 
            path="usuarios" 
            element={
              <ProtectedRoute requiredRoleId={2}>
                <UsuariosPage />
              </ProtectedRoute>
            } 
          />
           <Route 
              path="usuarios/nuevo" 
              element={
                <ProtectedRoute requiredRoleId={1}>
                  <CrearUsuarioPage />
                </ProtectedRoute>
              } 
            />
          {/* Si necesitas detalle/editar usuarios, agrega: */}
          {/* <Route path="usuarios/:id" element={<ProtectedRoute requiredRoleId={2}><DetalleUsuario /></ProtectedRoute>} /> */}

          {/* Rutas solo para ADMIN (rol <=1: ediciones avanzadas, borrados) */}
          <Route 
            path="personas/:id/editar" 
            element={
              <ProtectedRoute requiredRoleId={1}>
                <EditarPersonaPage />
              </ProtectedRoute>
            } 
          />
          {/* Agrega si necesitas admin/gestion para borrados avanzados: */}
          {/* <Route path="admin/gestion" element={<ProtectedRoute requiredRoleId={1}><GestionPage /></ProtectedRoute>} /> */}
        </Route>

        {/* ========== CATCH-ALL (redirige a accesos si no autenticado) ========== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
