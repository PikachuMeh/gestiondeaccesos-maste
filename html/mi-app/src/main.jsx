// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { ApiProvider } from '@/context/ApiContext';
import { AuthProvider } from '@/jsx/auth/AuthContext';
import { ImageProvider } from '@/context/ImageContext';
import { ThemeProvider } from '@/context/ThemeContext';

// Layout
import App from '@/App.jsx';
import ProtectedRoute from '@/jsx/auth/ProtectedRoute';

// Páginas Públicas
import LoginPage from '@/jsx/LoginPage.jsx';
import ForgotPasswordPage from '@/jsx/ForgotPasswordPage.jsx';
import ResetPasswordPage from '@/jsx/ResetPasswordPage.jsx';

// Páginas Protegidas - OPERADOR+ (rol <= 3)
import AccesosPage from '@/jsx/AccesosPage.jsx';
import PersonasPage from '@/jsx/PersonasPage.jsx';
import DetallePersonaPage from '@/jsx/DetallePersona.jsx';
import EditarPersonaPage from '@/jsx/EditarPersonaPage.jsx';
import CrearAccesoPage from '@/jsx/registros/registro_acceso.jsx';
import CrearVisitante from '@/jsx/registros/registro_funcionario.jsx';
import DetalleVisitaPage from '@/jsx/DetalleVisita.jsx';
import Perfil_persona from '@/jsx/profile/perfil.jsx';

// Páginas Protegidas - SUPERVISOR+ (rol <= 2)
import UsuariosPage from '@/jsx/UsuariosPage.jsx';
import DetalleUsuarioPage from '@/jsx/DetalleUsuarioPage.jsx';
import CrearUsuarioPage from '@/jsx/registros/CrearUsuarioPage.jsx';

// Páginas Protegidas - AUDITOR (rol = 4)
import AuditPage from '@/jsx/AuditPage.jsx';

// Páginas de error
import UnauthorizedPage from '@/jsx/UnauthorizedPage.jsx';

// Estilos
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ApiProvider>
        <AuthProvider>
          <ThemeProvider>
            <ImageProvider>
              <Routes>
                {/* ==================== RUTAS PÚBLICAS ==================== */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* ==================== PÁGINA DE SIN PERMISOS ==================== */}
                <Route path="/unauthorized" element={<App><UnauthorizedPage /></App>} />

                {/* ==================== RUTAS PROTEGIDAS ==================== */}
                <Route path="/" element={<App />}>
                  {/* ============ OPERADOR+ (rol <= 3) ============ */}
                  <Route
                    path="accesos"
                    element={
                      <ProtectedRoute requiredRoleId={3}>
                        <AccesosPage />
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
                    path="personas/:id/editar"
                    element={
                      <ProtectedRoute requiredRoleId={3}>
                        <EditarPersonaPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="registro/acceso"
                    element={
                      <ProtectedRoute requiredRoleId={3}>
                        <CrearAccesoPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="registro/visitante"
                    element={
                      <ProtectedRoute requiredRoleId={3}>
                        <CrearVisitante />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="visitas/:id"
                    element={
                      <ProtectedRoute requiredRoleId={3}>
                        <DetalleVisitaPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="usuarios/:id"
                    element={
                      <ProtectedRoute requiredRoleId={3}>
                        <DetalleUsuarioPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ============ SUPERVISOR+ (rol <= 2) ============ */}
                  <Route
                    path="usuarios"
                    element={
                      <ProtectedRoute requiredRoleId={2}>
                        <UsuariosPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="usuarios/:id"
                    element={
                      <ProtectedRoute requiredRoleId={2}>
                        <DetalleUsuarioPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="usuarios/nuevo"
                    element={
                      <ProtectedRoute requiredRoleId={2}>
                        <CrearUsuarioPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ============ AUDITOR (rol = 4) ============ */}
                  <Route
                    path="auditoria"
                    element={
                      <ProtectedRoute requiredRoleId={4}>
                        <AuditPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Ruta por defecto dentro del layout */}
                  <Route index element={<Navigate to="/accesos" replace />} />
                </Route>

                {/* ==================== CATCH-ALL ==================== */}
                {/* Si no está autenticado, va a login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </ImageProvider>
          </ThemeProvider>
        </AuthProvider>
      </ApiProvider>
    </BrowserRouter>
  </React.StrictMode>
);
