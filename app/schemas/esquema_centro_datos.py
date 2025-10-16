"""
Esquemas Pydantic para el modelo CentroDatos.
Define la validación y serialización de datos de centros de datos.
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional
from datetime import datetime


class CentroDatosBase(BaseModel):
    """Esquema base para CentroDatos con campos comunes"""
    nombre: str = Field(..., min_length=3, max_length=200, description="Nombre del centro de datos")
    codigo: str = Field(..., min_length=2, max_length=20, description="Código único del centro de datos")
    direccion: str = Field(..., min_length=10, description="Dirección física del centro de datos")
    ciudad: str = Field(..., min_length=2, max_length=100, description="Ciudad donde se ubica")
    pais: str = Field(default="Colombia", max_length=100, description="País donde se ubica")
    telefono_contacto: Optional[str] = Field(None, max_length=20, description="Teléfono de contacto")
    email_contacto: Optional[EmailStr] = Field(None, description="Email de contacto")
    descripcion: Optional[str] = Field(None, description="Descripción del centro de datos")
    observaciones: Optional[str] = Field(None, description="Observaciones adicionales")
    
    @validator('codigo')
    def validate_codigo(cls, v):
        """Valida que el código sea alfanumérico y en mayúsculas"""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('El código debe contener solo letras, números, guiones y guiones bajos')
        return v.upper()

    @validator('telefono_contacto')
    def validate_telefono_contacto(cls, v):
        """Valida el formato del teléfono de contacto"""
        if v is not None:
            telefono_limpio = ''.join(filter(str.isdigit, v))
            if len(telefono_limpio) < 7 or len(telefono_limpio) > 15:
                raise ValueError('El teléfono debe tener entre 7 y 15 dígitos')
        return v

class CentroDatosCreate(CentroDatosBase):
    """Esquema para crear un nuevo centro de datos"""
    pass

class CentroDatosUpdate(BaseModel):
    """Esquema para actualizar un centro de datos existente"""
    nombre: Optional[str] = Field(None, min_length=3, max_length=200)
    codigo: Optional[str] = Field(None, min_length=2, max_length=20)
    direccion: Optional[str] = Field(None, min_length=10)
    ciudad: Optional[str] = Field(None, min_length=2, max_length=100)
    pais: Optional[str] = Field(None, max_length=100)
    telefono_contacto: Optional[str] = Field(None, max_length=20)
    email_contacto: Optional[EmailStr] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None
    fecha: Optional[str] = None

class CentroDatosResponse(CentroDatosBase):
    """Esquema para respuesta de centro de datos"""
    id: int
    activo: bool
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CentroDatosListResponse(BaseModel):
    """Esquema para lista de centros de datos con paginación"""
    items: list[CentroDatosResponse]
    total: int
    page: int
    size: int
    pages: int
