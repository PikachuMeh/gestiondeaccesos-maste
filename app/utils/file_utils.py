# app/utils/file_utils.py (ACTUALIZADO - Usar config.settings)

import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from fastapi.responses import FileResponse
from typing import Optional
import logging
from app.config import settings  # IMPORTANTE: Importar desde config

logger = logging.getLogger(__name__)

# Configuración desde app.config.settings
UPLOAD_OPERADORES_PATH = settings.upload_operadores_path
UPLOAD_OPERADORES_URL = settings.upload_operadores_url
UPLOAD_MAX_SIZE_MB = settings.upload_max_size_mb
UPLOAD_ALLOWED_EXTENSIONS = [ext.strip() for ext in settings.upload_allowed_extensions.split(",")]

# Convertir a ruta absoluta desde la ubicación del proyecto
# Si UPLOAD_OPERADORES_PATH es relativa "../html/mi-app/src/img/operadores/"
# Usamos Path(__file__) para ubicar este archivo en app/utils/
# Luego subimos 3 niveles para llegar a la raíz del proyecto
PROJECT_ROOT = Path(__file__).parent.parent.parent  # gestiondeaccesos-maste/
UPLOAD_DIR = PROJECT_ROOT / UPLOAD_OPERADORES_PATH.lstrip("../")

# Crear directorio si no existe
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"✓ Upload directory creado/verificado: {UPLOAD_DIR}")
except Exception as e:
    logger.error(f"✗ Error creando directorio de uploads: {e}")

logger.info(f"Upload directory: {UPLOAD_DIR}")
logger.info(f"Upload URL base: {UPLOAD_OPERADORES_URL}")
logger.info(f"Upload max size: {UPLOAD_MAX_SIZE_MB}MB")
logger.info(f"Extensiones permitidas: {', '.join(UPLOAD_ALLOWED_EXTENSIONS)}")


async def save_operador_foto(file: UploadFile) -> str:
    """
    Guarda una foto de operador y retorna el nombre del archivo.
    
    Args:
        file: UploadFile del formulario
        
    Returns:
        str: Nombre del archivo guardado (ej: "550e8400-e29b-41d4...jpg")
        
    Raises:
        HTTPException: Si hay problemas con el archivo
    """
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archivo vacío o no proporcionado"
        )
    
    # Validar extensión
    file_extension = file.filename.split(".")[-1].lower() if file.filename else ""
    
    if file_extension not in UPLOAD_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de archivo no permitido. Extensiones válidas: {', '.join(UPLOAD_ALLOWED_EXTENSIONS)}"
        )
    
    # Validar tamaño
    file_content = await file.read()
    file_size_mb = len(file_content) / (1024 * 1024)
    
    if file_size_mb > UPLOAD_MAX_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Archivo demasiado grande. Máximo: {UPLOAD_MAX_SIZE_MB}MB. Recibido: {file_size_mb:.2f}MB"
        )
    
    # Generar nombre único (UUID + extensión original)
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # Guardar archivo
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"✓ Foto de operador guardada: {unique_filename} ({file_size_mb:.2f}MB)")
        return unique_filename
        
    except IOError as e:
        logger.error(f"✗ Error guardando archivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al guardar el archivo"
        )


def delete_operador_foto(filename: Optional[str]) -> bool:
    """
    Elimina una foto de operador.
    
    Args:
        filename: Nombre del archivo a eliminar
        
    Returns:
        bool: True si se eliminó, False si no existía
    """
    
    if not filename:
        return False
    
    try:
        file_path = UPLOAD_DIR / filename
        
        if file_path.exists() and file_path.is_file():
            file_path.unlink()  # Eliminar archivo
            logger.info(f"✓ Foto de operador eliminada: {filename}")
            return True
        else:
            logger.warning(f"⚠ Archivo no encontrado para eliminar: {filename}")
            return False
            
    except Exception as e:
        logger.error(f"✗ Error eliminando archivo {filename}: {str(e)}")
        return False


def get_operador_foto_url(filename: Optional[str]) -> Optional[str]:
    """
    Construye la URL completa de una foto de operador.
    
    Args:
        filename: Nombre del archivo
        
    Returns:
        str: URL completa o None si filename es None
        
    Ejemplo:
        filename = "550e8400-e29b-41d4-a716-446655440000.jpg"
        return "http://localhost:5173/src/img/operadores/550e8400-e29b-41d4-a716-446655440000.jpg"
    """
    
    if not filename:
        return None
    
    return f"{UPLOAD_OPERADORES_URL.rstrip('/')}/{filename}"


def get_upload_dir() -> Path:
    """
    Retorna la ruta del directorio de uploads.
    Útil para testing o debugging.
    """
    return UPLOAD_DIR