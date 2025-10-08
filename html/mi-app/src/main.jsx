import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Navbar from './navbar/navbar.jsx'
import Items from './conexion/conexion.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Navbar />
    <Items />
  </StrictMode>,
)
