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
from app.models.models import RolUsuario

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
        
        # Obtener el usuario de la base de datos
        usuario_service = UsuarioService(db)
        user = usuario_service.get(token_data.user_id)
        
        if user is None or not user.activo:
            raise credentials_exception
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "nombre_completo": user.nombre_completo,
            "rol": user.rol,
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


def require_role(required_role: RolUsuario):
    """
    Decorador de dependencia para requerir un rol específico.
    
    Args:
        required_role: Rol requerido para acceder al endpoint
        
    Returns:
        Función de dependencia que verifica el rol
    """
    def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        """
        Verifica que el usuario tenga el rol requerido.
        
        Args:
            current_user: Usuario actual
            
        Returns:
            Datos del usuario si tiene el rol requerido
            
        Raises:
            HTTPException: Si el usuario no tiene el rol requerido
        """
        user_role = current_user.get("rol")
        
        if user_role != required_role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol {required_role.value}"
            )
        
        return current_user
    
    return role_checker


def require_admin(current_user: dict = Depends(get_current_active_user)) -> dict:
    """
    Dependencia para requerir rol de administrador.
    
    Args:
        current_user: Usuario actual
        
    Returns:
        Datos del usuario si es administrador
        
    Raises:
        HTTPException: Si el usuario no es administrador
    """
    return require_role(RolUsuario.ADMINISTRADOR)(current_user)


def require_supervisor_or_admin(current_user: dict = Depends(get_current_active_user)) -> dict:
    """
    Dependencia para requerir rol de supervisor o administrador.
    
    Args:
        current_user: Usuario actual
        
    Returns:
        Datos del usuario si es supervisor o administrador
        
    Raises:
        HTTPException: Si el usuario no tiene los permisos requeridos
    """
    user_role = current_user.get("rol")
    allowed_roles = [RolUsuario.SUPERVISOR.value, RolUsuario.ADMINISTRADOR.value]
    
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de supervisor o administrador"
        )
    
    return current_user


def require_operator_or_above(current_user: dict = Depends(get_current_active_user)) -> dict:
    """
    Dependencia para requerir rol de operador o superior.
    
    Args:
        current_user: Usuario actual
        
    Returns:
        Datos del usuario si tiene permisos de operador o superior
        
    Raises:
        HTTPException: Si el usuario no tiene los permisos requeridos
    """
    user_role = current_user.get("rol")
    allowed_roles = [
        RolUsuario.OPERADOR.value, 
        RolUsuario.SUPERVISOR.value, 
        RolUsuario.ADMINISTRADOR.value
    ]
    
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
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "nombre_completo": user.nombre_completo,
            "rol": user.rol,
            "activo": user.activo
        }
        
    except Exception:
        return None
