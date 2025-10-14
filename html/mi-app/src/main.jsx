// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate,Outlet } from "react-router-dom";
import App from "./App.jsx";
import AccesosPage from "./jsx/AccesosPage.jsx";
import PersonasPage from "./jsx/PersonasPage.jsx";
import CrearAccesoPage from "./jsx/registros/registro_acceso.jsx";
import LoginPage from "./jsx/LoginPage.jsx";  
import CrearVisitante from "./jsx/registros/registro_funcionario.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(

  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="/accesos" replace />} />
        <Route path="accesos" element={<AccesosPage />} />
        <Route path="personas" element={<PersonasPage />} />
        <Route path="accesos/nuevo" element={<CrearAccesoPage />} />
        <Route path="registro/visitante" element={<CrearVisitante />} />
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
