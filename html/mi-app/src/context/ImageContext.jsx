// src/context/ImageContext.jsx - VERSION SIMPLIFICADA Y ROBUSTA
import { createContext, useContext } from 'react';

const ImageContext = createContext(null);

export function ImageProvider({ children }) {
  const getImageUrl = (type, filename) => {
    // Debug
    console.log(`[ImageContext] getImageUrl(${type}, ${filename})`);
    
    if (!filename) {
      console.warn(`[ImageContext] filename vacío para tipo: ${type}`);
      return null;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';
    
    // Si ya es una URL completa, devuélvela
    if (filename.startsWith('http')) {
      console.log(`[ImageContext] URL completa detectada: ${filename}`);
      return filename;
    }
    
    // Mapeo de tipos de imágenes
    const routes = {
      operador: `${baseUrl}/imagenes/operadores/`,
      persona: `${baseUrl}/imagenes/personas/`,
      captura: `${baseUrl}/imagenes/capturas/`,
    };
    
    const url = `${routes[type] || routes.operador}${filename}`;
    console.log(`[ImageContext] URL generada: ${url}`);
    
    return url;
  };
  
  const value = { getImageUrl };
  
  return (
    <ImageContext.Provider value={value}>
      {children}
    </ImageContext.Provider>
  );
}

export function useImages() {
  const context = useContext(ImageContext);
  
  if (!context) {
    console.error('[ImageContext] ❌ useImages debe estar dentro de ImageProvider');
    throw new Error('useImages debe estar dentro de ImageProvider');
  }
  
  console.log('[ImageContext] ✓ useImages cargado correctamente');
  return context;
}

