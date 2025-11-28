// src/main.jsx - PROVIDERS CON RUTAS ANIDADAS
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { ApiProvider } from '@/context/ApiContext';
import { AuthProvider } from '@/jsx/auth/AuthContext';
import { ImageProvider } from '@/context/ImageContext';

// Layout
import App from '@/App.jsx';
import ProtectedRoute from '@/jsx/auth/ProtectedRoute';

// Páginas Públicas
import LoginPage from '@/jsx/LoginPage.jsx';
import ForgotPasswordPage from '@/jsx/ForgotPasswordPage.jsx';
import ResetPasswordPage from '@/jsx/ResetPasswordPage.jsx';

// Páginas Protegidas - OPERADOR+
import AccesosPage from '@/jsx/AccesosPage.jsx';
import PersonasPage from '@/jsx/PersonasPage.jsx';
import DetallePersonaPage from '@/jsx/DetallePersona.jsx';
import EditarPersonaPage from '@/jsx/EditarPersonaPage.jsx';
import CrearAccesoPage from '@/jsx/registros/registro_acceso.jsx';
import CrearVisitante from '@/jsx/registros/registro_funcionario.jsx';
import DetalleVisitaPage from '@/jsx/DetalleVisita.jsx';
import Perfil_persona from '@/jsx/profile/perfil.jsx';

// Páginas Protegidas - SUPERVISOR+
import UsuariosPage from '@/jsx/UsuariosPage.jsx';
import DetalleUsuarioPage from '@/jsx/DetalleUsuarioPage.jsx';
import CrearUsuarioPage from '@/jsx/registros/CrearUsuarioPage.jsx';

// Páginas Protegidas - AUDITOR
import AuditPage from '@/jsx/AuditPage.jsx';

// Estilos
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ApiProvider>
        <AuthProvider>
          <ImageProvider>
            <Routes>
              {/* ==================== RUTAS PÚBLICAS ==================== */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* ==================== RUTAS PROTEGIDAS ==================== */}
              <Route
                element={<ProtectedRoute><App /></ProtectedRoute>}
              >
                {/* OPERADOR+ (rol <= 3) */}
                <Route path="/accesos" element={<AccesosPage />} />
                <Route path="/personas" element={<PersonasPage />} />
                <Route path="/personas/:id" element={<DetallePersonaPage />} />
                <Route path="/personas/:id/editar" element={<EditarPersonaPage />} />
                <Route path="/registrar/acceso" element={<CrearAccesoPage />} />
                <Route path="/registrar/visitante" element={<CrearVisitante />} />
                <Route path="/visita/:id" element={<DetalleVisitaPage />} />
                <Route path="/perfil" element={<Perfil_persona />} />

                {/* SUPERVISOR+ (rol <= 2) */}
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="/usuarios/nuevo" element={<CrearUsuarioPage />} />
                <Route path="/usuarios/:id" element={<DetalleUsuarioPage />} />

                {/* AUDITOR (rol = 4) */}
                <Route path="/auditoria" element={<AuditPage />} />

                {/* Catch-all - Redirige a /accesos */}
                <Route path="/" element={<Navigate to="/accesos" replace />} />
              </Route>

              {/* ==================== CATCH-ALL ==================== */}
              {/* Si no está autenticado, va a login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ImageProvider>
        </AuthProvider>
      </ApiProvider>
    </BrowserRouter>
  </React.StrictMode>
);

