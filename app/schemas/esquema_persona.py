from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class PersonaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    apellido: str = Field(..., min_length=2, max_length=100)
    documento_identidad: str = Field(..., min_length=3, max_length=20)
    email: EmailStr  # Requerido, no Optional
    empresa: str = Field(...)  # Requerido
    direccion: str = Field(...)  # Requerido
    cargo: Optional[str] = None
    observaciones: Optional[str] = None
    foto: Optional[str] = None
    unidad: Optional[str] = None
    departamento: Optional[str] = None

class PersonaCreate(PersonaBase):
    pass

class PersonaUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    documento_identidad: Optional[str] = None
    email: Optional[EmailStr] = None
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    direccion: Optional[str] = None
    observaciones: Optional[str] = None


class PersonaResponse(PersonaBase):
    id: int
    fecha_creacion: datetime  # No opcional, siempre se genera en BD
    fecha_actualizacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PersonaListResponse(BaseModel):
    items: List[PersonaResponse]
    total: int
    page: int
    size: int
    pages: int