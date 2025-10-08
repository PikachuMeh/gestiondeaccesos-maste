from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TipoAreaOut(BaseModel):
    id_tipo_area: int
    tipo_area: str
    class Config:
        from_attributes = True

class CentroDatosBrief(BaseModel):
    id: int
    nombre: str
    codigo: str
    class Config:
        from_attributes = True

class AreaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    codigo: str = Field(..., min_length=1, max_length=20)
    piso: Optional[str] = None
    sala: Optional[str] = None
    rack_inicio: Optional[str] = None
    rack_fin: Optional[str] = None
    capacidad_maxima: Optional[int] = None
    capacidad_actual: Optional[int] = 0
    requiere_autorizacion_especial: bool = False
    nivel_seguridad: str = "normal"
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool = True

class AreaCreate(AreaBase):
    tipo_id: int
    centro_datos_id: int

class AreaUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    tipo_id: Optional[int] = None
    centro_datos_id: Optional[int] = None
    piso: Optional[str] = None
    sala: Optional[str] = None
    rack_inicio: Optional[str] = None
    rack_fin: Optional[str] = None
    capacidad_maxima: Optional[int] = None
    capacidad_actual: Optional[int] = None
    requiere_autorizacion_especial: Optional[bool] = None
    nivel_seguridad: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None

class AreaResponse(AreaBase):
    id: int
    tipo_id: int
    centro_datos_id: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    class Config:
        from_attributes = True

class AreaWithCentroDatos(AreaResponse):
    tipo: Optional[TipoAreaOut] = None
    centro_datos: Optional[CentroDatosBrief] = None
    class Config:
        from_attributes = True

class AreaListResponse(BaseModel):
    items: List[AreaResponse]
    total: int
    page: int
    size: int
    pages: int