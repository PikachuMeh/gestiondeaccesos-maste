from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional
from datetime import datetime

# Esquema Pydantic para RolUsuario
class RolUsuarioSchema(BaseModel):
    id_rol: int
    nombre_rol: str

    model_config = {"from_attributes": True}


class UsuarioBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario único")
    email: EmailStr = Field(..., description="Correo electrónico del usuario")
    nombre_completo: str = Field(..., min_length=5, max_length=200, description="Nombre completo del usuario")
    rol: RolUsuarioSchema = Field(..., description="Rol del usuario en el sistema")
    telefono: Optional[str] = Field(None, max_length=20, description="Número de teléfono")
    departamento: Optional[str] = Field(None, max_length=100, description="Departamento donde trabaja")
    observaciones: Optional[str] = Field(None, description="Observaciones adicionales")

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
    password: str = Field(..., min_length=8, description="Contraseña del usuario")

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una letra minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v


class UsuarioUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    nombre_completo: Optional[str] = Field(None, min_length=5, max_length=200)
    rol: Optional[RolUsuarioSchema] = None
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


class UsuarioChangePassword(BaseModel):
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña")
    confirm_password: str = Field(..., description="Confirmación de nueva contraseña")

    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una letra minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v

    @validator('confirm_password')
    def validate_confirm_password(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('La confirmación de contraseña no coincide')
        return v


class UsuarioResponse(UsuarioBase):
    id: int
    activo: bool
    ultimo_acceso: Optional[datetime] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UsuarioListResponse(BaseModel):
    items: list[UsuarioResponse]
    total: int
    page: int
    size: int
    pages: int


class UsuarioLogin(BaseModel):
    username: str = Field(..., description="Nombre de usuario")
    password: str = Field(..., description="Contraseña")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    rol: Optional[RolUsuarioSchema] = None
