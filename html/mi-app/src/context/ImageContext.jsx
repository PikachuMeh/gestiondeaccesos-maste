// src/context/ImageContext.jsx
import { createContext, useContext } from 'react';
import { useApi } from './ApiContext';

const ImageContext = createContext(null);

export const ImageProvider = ({ children }) => {
  const { API_V1 } = useApi();

  /**
   * Construir URL de imagen según el tipo
   * @param {string} type - 'operador', 'persona', 'captura'
   * @param {string} filename - nombre del archivo (ej: "8698d097-4551-4d7b-a978-472303a644e2.png")
   * @returns {string} URL completa de la imagen
   */
  const getImageUrl = (type, filename) => {
    if (!filename || filename === 'null' || filename === '') {
      // Retornar imagen por defecto si no hay filename
      return null;
    }

    // Construir URLs según el tipo
    const imageUrls = {
      operador: `${API_V1.replace('/api/v1', '')}/imagenes/operadores/${filename}`,
      persona: `${API_V1.replace('/api/v1', '')}/imagenes/personas/${filename}`,
      captura: `${API_V1.replace('/api/v1', '')}/imagenes/capturas/${filename}`,
    };

    return imageUrls[type] || null;
  };

  /**
   * Obtener fallback para imagen no disponible
   */
  const getPlaceholderImage = (type = 'generic') => {
    const placeholders = {
      operador: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23e0e0e0" width="200" height="200"/%3E%3Ctext x="50" y="50" fill="%23999" font-size="14" text-anchor="middle" dy=".3em"%3ESin Foto%3C/text%3E%3C/svg%3E',
      persona: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23e0e0e0" width="200" height="200"/%3E%3Ctext x="50" y="50" fill="%23999" font-size="14" text-anchor="middle" dy=".3em"%3ESin Foto%3C/text%3E%3C/svg%3E',
      captura: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23e0e0e0" width="200" height="200"/%3E%3Ctext x="50" y="50" fill="%23999" font-size="14" text-anchor="middle" dy=".3em"%3ESin Captura%3C/text%3E%3C/svg%3E',
    };

    return placeholders[type] || placeholders.operador;
  };

  const value = {
    getImageUrl,
    getPlaceholderImage,
  };

  return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>;
};

export const useImages = () => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImages debe usarse dentro de ImageProvider');
  }
  return context;
};
