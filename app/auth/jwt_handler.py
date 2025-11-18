from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from app.config import settings
from app.schemas.esquema_usuario import TokenData
from app.models.models import RolUsuario


class JWTHandler:
    """
    Manejador de tokens JWT para el sistema de autenticación.
    """
    
    def __init__(self):
        self.secret_key = settings.secret_key
        self.algorithm = settings.algorithm
        self.access_token_expire_minutes = settings.access_token_expire_minutes
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Crea un token de acceso JWT."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            # Si no se envía tiempo específico, usa la configuración por defecto (minutos)
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verifica y decodifica un token JWT."""
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
    
    # MODIFICADO: Ahora acepta un argumento opcional 'expires_delta'
    def create_token_for_user(self, user_id: int, username: str, rol: Union[RolUsuario, int], expires_delta: Optional[timedelta] = None) -> str:
        """Crea un token de acceso para un usuario específico con duración opcional."""
        if isinstance(rol, RolUsuario):
            rol_id = rol.id_rol
        elif isinstance(rol, int):
            rol_id = rol
        else:
            raise ValueError("rol debe ser objeto RolUsuario o int (id_rol)")
        
        data = {
            "sub": username,
            "user_id": user_id,
            "rol": {"id_rol": rol.id_rol, "nombre_rol": rol.nombre_rol}
            # Nota: Quitamos el campo "exp" de aquí porque create_access_token lo agrega
        }
        
        # Pasamos el expires_delta a la función base
        return self.create_access_token(data, expires_delta)
    
    def create_password_reset_token(self, user_id: int, username: str, hashed_password: str) -> str:
        """Crea un token especial para reseteo de contraseña."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        secret_key = self.secret_key + hashed_password
        
        to_encode = {
            "sub": username,
            "user_id": user_id,
            "exp": expire,
            "type": "password_reset"
        }
        
        encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_password_reset_token(self, token: str, hashed_password: str) -> Optional[dict]:
        """Verifica el token de reseteo de contraseña."""
        try:
            secret_key = self.secret_key + hashed_password
            payload = jwt.decode(token, secret_key, algorithms=[self.algorithm])
            
            if payload.get("type") != "password_reset":
                return None
                
            return {
                "user_id": payload.get("user_id"),
                "username": payload.get("sub")
            }
        except JWTError:
            return None
        
    def get_token_expiration_time(self) -> datetime:
        """Obtiene el tiempo de expiración por defecto para los tokens."""
        return datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)


# Instancia global del manejador JWT
jwt_handler = JWTHandler()