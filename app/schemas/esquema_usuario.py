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
    nombre: str = Field(..., min_length=1, max_length=200)  # ← Separado
    apellidos: str = Field(..., min_length=1, max_length=200)  # ← Separado
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
    rol_id: int = Field(default=1, description="ID del rol")  # ← Solo el ID

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
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    apellidos: Optional[str] = Field(None, min_length=1, max_length=200)
    rol_id: Optional[int] = None  # ← Solo el ID
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
    cedula: int  # ← AGREGAR cedula
    username: str
    email: EmailStr
    nombre: str  # ← Separado
    apellidos: str  # ← Separado
    rol: RolUsuarioSchema  # ← Relación completa para respuesta
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool
    ultimo_acceso: Optional[datetime] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    @computed_field  # ← Campo computado para compatibilidad
    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.apellidos}"

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
    rol_id: Optional[int] = None  # ← Cambiar de rol a rol_id
