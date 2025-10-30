import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./jsx/auth/AuthContext.jsx";
import ProtectedRoute from "./jsx/auth/ProtectedRoute.jsx";
import AccesosPage from "./jsx/AccesosPage.jsx";
import PersonasPage from "./jsx/PersonasPage.jsx";
import CrearAccesoPage from "./jsx/registros/registro_acceso.jsx";
import LoginPage from "./jsx/LoginPage.jsx";
import CrearVisitante from "./jsx/registros/registro_funcionario.jsx";
import DetalleVisitaPage from "./jsx/DetalleVisita.jsx";
import DetallePersonaPage from "./jsx/DetallePersona.jsx";
import EditarPersonaPage from "./jsx/EditarPersonaPage.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/accesos" replace />} />
          <Route path="accesos" element={<AccesosPage />} />
          <Route path="accesos/:id" element={<DetalleVisitaPage />} />
          <Route path="accesos/nuevo" element={<CrearAccesoPage />} />
          <Route path="personas" element={<PersonasPage />} />
          <Route path="personas/:id" element={<DetallePersonaPage />} />
          <Route path="personas/:id/editar" element={<EditarPersonaPage />} />
          <Route path="registro/visitante" element={<CrearVisitante />} />
        </Route>

        {/* Ruta catch-all: cualquier ruta no definida */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Navigate to="/accesos" replace />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
