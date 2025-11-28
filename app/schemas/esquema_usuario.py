# app/schemas/esquema_usuario.py (ACTUALIZADO CON FOTO)

from pydantic import BaseModel, EmailStr, validator, Field, computed_field
from typing import Optional
from datetime import datetime

# Esquema Pydantic para RolUsuario
class RolUsuarioSchema(BaseModel):
    id_rol: int
    nombre_rol: str
    model_config = {"from_attributes": True}

class UsuarioBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    nombre: str = Field(..., min_length=1, max_length=200)
    apellidos: str = Field(..., min_length=1, max_length=200)
    telefono: Optional[str] = Field(None, max_length=20)
    departamento: Optional[str] = Field(None, max_length=100)
    observaciones: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('El nombre de usuario debe contener solo letras, números, guiones y guiones bajos')
        if ' ' in v:
            raise ValueError('El nombre de usuario no puede contener espacios')
        return v.lower()
    
    @validator('telefono')
    def validate_telefono(cls, v):
        if v is not None:
            telefono_limpio = ''.join(filter(str.isdigit, v))
            if len(telefono_limpio) < 7 or len(telefono_limpio) > 15:
                raise ValueError('El teléfono debe tener entre 7 y 15 dígitos')
        return v

class UsuarioCreate(UsuarioBase):
    cedula: int = Field(..., description="Cédula de identidad")
    password: str = Field(..., min_length=8)
    rol_id: int = Field(default=1, description="ID del rol del modelo RolUsuario")

class UsuarioUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    apellidos: Optional[str] = Field(None, min_length=1, max_length=200)
    rol_id: Optional[int] = None
    telefono: Optional[str] = Field(None, max_length=20)
    departamento: Optional[str] = Field(None, max_length=100)
    observaciones: Optional[str] = None
    activo: Optional[bool] = None
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if not v.replace('_', '').replace('-', '').isalnum():
                raise ValueError('El nombre de usuario debe contener solo letras, números, guiones y guiones bajos')
            if ' ' in v:
                raise ValueError('El nombre de usuario no puede contener espacios')
            return v.lower()
        return v

class UsuarioResponse(BaseModel):
    id: int
    cedula: int
    username: str
    email: EmailStr
    nombre: str
    apellidos: str
    rol: RolUsuarioSchema
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    observaciones: Optional[str] = None
    # NUEVO: Campo de foto
    foto_path: Optional[str] = None
    activo: bool
    ultimo_acceso: Optional[datetime] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    
    @computed_field
    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.apellidos}"
    
    model_config = {"from_attributes": True}

# Perfil con campos de Persona opcionales para defaults
class PerfilResponse(UsuarioResponse):
    documento_identidad: str
    empresa: Optional[str] = "N/A"
    cargo: Optional[str] = None
    direccion: Optional[str] = "N/A"
    foto: Optional[str] = "/src/img/default-profile.png"
    unidad: Optional[str] = None
    model_config = {"from_attributes": True}

class UsuarioLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class UsuarioListResponse(BaseModel):
    items: list[UsuarioResponse]
    total: int
    page: int
    size: int
    pages: int

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    rol_id: Optional[int] = None

class RolResponse(BaseModel):
    id_rol: int
    nombre_rol: str
    model_config = {"from_attributes": True}

class SolicitudRecuperacionPassword(BaseModel):
    """Esquema para solicitar recuperación de contraseña"""
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Esquema para resetear contraseña con token"""
    token: str
    nueva_password: str
    confirmar_password: str

class UsuarioCreateResponse(UsuarioResponse):
    """
    Usuario creado sin password (hereda de UsuarioResponse).
    """
    message: str = "Usuario creado exitosamente"