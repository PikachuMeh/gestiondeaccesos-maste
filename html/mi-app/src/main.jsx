// src/main.jsx
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import App from "./App.jsx"; // Layout Navbar + Outlet

import { AuthProvider } from "@/jsx/auth/AuthContext";
import ProtectedRoute from "@/jsx/auth/ProtectedRoute";

// Páginas
import AccesosPage from "@/jsx/AccesosPage.jsx";
import PersonasPage from "@/jsx/PersonasPage.jsx";
import UsuariosPage from "@/jsx/UsuariosPage.jsx";
import CrearAccesoPage from "@/jsx/registros/registro_acceso.jsx";
import LoginPage from "@/jsx/LoginPage.jsx";
import CrearVisitante from "@/jsx/registros/registro_funcionario.jsx";
import DetalleVisitaPage from "@/jsx/DetalleVisita.jsx";
import DetallePersonaPage from "@/jsx/DetallePersona.jsx";
import EditarPersonaPage from "@/jsx/EditarPersonaPage.jsx";
import Perfil_persona from "@/jsx/profile/perfil.jsx";
import ForgotPasswordPage from "@/jsx/ForgotPasswordPage.jsx";
import ResetPasswordPage from "@/jsx/ResetPasswordPage.jsx";
import CrearUsuarioPage from "@/jsx/registros/CrearUsuarioPage.jsx";
import AuditPage from "@/jsx/AuditPage.jsx";
import DetalleUsuarioPage from "@/jsx/DetalleUsuarioPage.jsx";

import './index.css';
import { ApiProvider } from "@/context/ApiContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ApiProvider>  {/* ✅ FIX: Envuelves todo */}
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />  {/* ✅ :token */}

          {/* Protegida top: auth básica + App layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/accesos" replace />} />
            <Route path="perfil" element={<Perfil_persona />} />

            {/* OPERADOR+ rol<=3 */}
            <Route path="accesos" element={
              <ProtectedRoute requiredRoleId={3}>
                <AccesosPage />
              </ProtectedRoute>
            } />
            <Route path="accesos/:id" element={
              <ProtectedRoute requiredRoleId={3}>
                <DetalleVisitaPage />
              </ProtectedRoute>
            } />
            <Route path="accesos/nuevo" element={
              <ProtectedRoute requiredRoleId={3}>
                <CrearAccesoPage />
              </ProtectedRoute>
            } />
            <Route path="personas" element={
              <ProtectedRoute requiredRoleId={3}>
                <PersonasPage />
              </ProtectedRoute>
            } />
            <Route path="personas/:id" element={
              <ProtectedRoute requiredRoleId={3}>
                <DetallePersonaPage />
              </ProtectedRoute>
            } />
            <Route path="registro/visitante" element={
              <ProtectedRoute requiredRoleId={3}>
                <CrearVisitante />
              </ProtectedRoute>
            } />

            {/* SUPERVISOR+ rol<=2 */}
            <Route path="usuarios" element={
              <ProtectedRoute requiredRoleId={2}>
                <UsuariosPage />
              </ProtectedRoute>
            } />
            <Route path="usuarios/nuevo" element={
              <ProtectedRoute requiredRoleId={1}>
                <CrearUsuarioPage />
              </ProtectedRoute>
            } />
            <Route path="usuarios/:id" element={
              <ProtectedRoute requiredRoleId={2}>
                <DetalleUsuarioPage />
              </ProtectedRoute>
            } />

            {/* ADMIN rol<=1? */}
            <Route path="personas/:id/editar" element={
              <ProtectedRoute requiredRoleId={1}>  {/* Fix rol=1 admin? */}
                <EditarPersonaPage />
              </ProtectedRoute>
            } />

            {/* AUDITOR rol=4 */}
            <Route path="admin/gestion" element={
              <ProtectedRoute requiredRoleId={4}>
                <AuditPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Catch-all logged? */}
          <Route path="*" element={
            <ProtectedRoute fallbackPath="/login">
              <Navigate to="/accesos" replace />
            </ProtectedRoute>
          } />  {/* ✅ Si auth → /accesos; no → /login */}
        </Routes>
      </AuthProvider>
    </ApiProvider>
  </BrowserRouter>
);