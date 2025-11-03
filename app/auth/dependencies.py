"""
Dependencias de autenticación para FastAPI.
Proporciona funciones de dependencia para verificar autenticación y autorización.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt_handler import jwt_handler
from app.schemas.esquema_usuario import TokenData
from app.services.usuario_service import UsuarioService

# Esquema de seguridad HTTP Bearer
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Dependencia para obtener el usuario actual autenticado.
    
    Args:
        credentials: Credenciales de autorización HTTP
        db: Sesión de base de datos
        
    Returns:
        Datos del usuario autenticado
        
    Raises:
        HTTPException: Si las credenciales son inválidas o el usuario no existe
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verificar el token JWT
        token_data = jwt_handler.verify_token(credentials.credentials)
        if token_data is None:
            raise credentials_exception
        
        # Obtener el usuario de la base de datos (con rol cargado)
        usuario_service = UsuarioService(db)
        user = usuario_service.get(token_data.user_id)

        if user is None or not user.activo:
            raise credentials_exception

        # Rol como string (nombre_rol del modelo) y ID (id_rol)
        rol_value = user.rol.nombre_rol if user.rol else 'N/A'
        rol_id = user.rol.id_rol if user.rol else None

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "nombre_completo": f"{user.nombre} {user.apellidos}",  # Separados en modelo
            "rol": rol_value,  # String para comparaciones
            "rol_id": rol_id,  # Int para refresh
            "activo": user.activo
        }

    except Exception:
        raise credentials_exception

def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependencia para obtener el usuario actual activo.
    
    Args:
        current_user: Usuario actual obtenido de get_current_user
        
    Returns:
        Datos del usuario activo
        
    Raises:
        HTTPException: Si el usuario no está activo
    """
    if not current_user.get("activo", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    return current_user

def require_role(required_role: str):
    """
    Decorador de dependencia para requerir un rol específico.
    
    Args:
        required_role: Rol requerido como string (nombre_rol del modelo, ej. "Administrador")
        
    Returns:
        Función de dependencia que verifica el rol
    """
    def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        user_role = current_user.get("rol")
        
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol {required_role}"
            )
        
        return current_user
    
    return role_checker

def require_admin(current_user: dict = Depends(get_current_active_user)) -> dict:
    return require_role("Administrador")(current_user)

def require_supervisor_or_admin(current_user: dict = Depends(get_current_active_user)) -> dict:
    user_role = current_user.get("rol")
    allowed_roles = ["Supervisor", "Administrador"]  # Del modelo
    
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de supervisor o administrador"
        )
    
    return current_user

def require_operator_or_above(current_user: dict = Depends(get_current_active_user)) -> dict:
    user_role = current_user.get("rol")
    allowed_roles = ["Operador", "Supervisor", "Administrador"]  # Del modelo
    
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de operador o superior"
        )
    
    return current_user

def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[dict]:
    """
    Dependencia opcional para obtener el usuario actual.
    
    Args:
        credentials: Credenciales de autorización HTTP (opcional)
        db: Sesión de base de datos
        
    Returns:
        Datos del usuario autenticado o None si no está autenticado
    """
    if not credentials:
        return None
    
    try:
        token_data = jwt_handler.verify_token(credentials.credentials)
        if token_data is None:
            return None
            
        usuario_service = UsuarioService(db)
        user = usuario_service.get(token_data.user_id)
        
        if user is None or not user.activo:
            return None
        
        rol_value = user.rol.nombre_rol if user.rol else 'N/A'
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "nombre_completo": f"{user.nombre} {user.apellidos}",
            "rol": rol_value,  # String del modelo
        }
        
    except Exception:
        return None
