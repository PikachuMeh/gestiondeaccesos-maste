"""
Manejador de tokens JWT para autenticación.
Proporciona funciones para crear, verificar y decodificar tokens JWT.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from app.config import settings
from app.schemas.esquema_usuario import TokenData
from app.models.models import RolUsuario  # Import para tipo chequeo

class JWTHandler:
    """
    Manejador de tokens JWT para el sistema de autenticación.
    
    Proporciona métodos para crear, verificar y decodificar tokens JWT.
    """
    
    def __init__(self):
        self.secret_key = settings.secret_key
        self.algorithm = settings.algorithm
        self.access_token_expire_minutes = settings.access_token_expire_minutes
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Crea un token de acceso JWT.
        
        Args:
            data: Datos a incluir en el token
            expires_delta: Tiempo de expiración personalizado
            
        Returns:
            Token JWT codificado
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """
        Verifica y decodifica un token JWT.
        
        Args:
            token: Token JWT a verificar
            
        Returns:
            Datos del token o None si es inválido
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            username: str = payload.get("sub")
            user_id: int = payload.get("user_id")
            rol_id: Optional[int] = payload.get("rol_id")

            if username is None or user_id is None:
                return None
            
            token_data = TokenData(
                username=username,
                user_id=user_id,
                rol_id=rol_id
            )
            
            return token_data
            
        except JWTError:
            return None
    
    def create_token_for_user(self, user_id: int, username: str, rol: Union[RolUsuario, int]) -> str:
        """
        Crea un token de acceso para un usuario específico.
        Compatible con login original: rol puede ser objeto RolUsuario o int (id_rol).
        """
        # Extrae id_rol flexiblemente (para no romper login existente)
        if isinstance(rol, RolUsuario):
            rol_id = rol.id_rol
        elif isinstance(rol, int):
            rol_id = rol
        else:
            raise ValueError("rol debe ser objeto RolUsuario o int (id_rol)")
        
        data = {
            "sub": username,
            "user_id": user_id,
            "rol_id": rol_id  # Siempre int del modelo
        }
        
        return self.create_access_token(data)

    def get_token_expiration_time(self) -> datetime:
        """
        Obtiene el tiempo de expiración por defecto para los tokens.
        
        Returns:
            Fecha y hora de expiración
        """
        return datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)

# Instancia global del manejador JWT
jwt_handler = JWTHandler()
