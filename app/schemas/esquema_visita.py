"""
Esquemas Pydantic para el modelo Visita.
Define la validación y serialización de datos de visitas.
"""

from pydantic import BaseModel, validator, Field
from typing import Optional
from datetime import datetime


class VisitaBase(BaseModel):
    persona_id: int = Field(..., description="ID de la persona que realiza la visita")
    centro_datos_id: int = Field(..., description="ID del centro de datos")
    tipo_actividad_id: int = Field(..., description="ID del tipo de actividad a realizar")
    descripcion_actividad: str = Field(..., min_length=10, description="Descripción detallada de la actividad")
    fecha_programada: datetime = Field(..., description="Fecha y hora programada para la visita")
    duracion_estimada: Optional[int] = Field(None, ge=15, le=480, description="Duración estimada en minutos (15-480)")
    autorizado_por: Optional[str] = Field(None, max_length=200, description="Persona que autoriza la visita")
    motivo_autorizacion: Optional[str] = Field(None, description="Motivo de la autorización")
    requiere_escolta: bool = Field(False, description="Si requiere escolta de seguridad")
    nombre_escolta: Optional[str] = Field(None, max_length=200, description="Nombre de la escolta asignada")
    equipos_ingresados: Optional[str] = Field(None, description="Lista de equipos que ingresarán")
    equipos_retirados: Optional[str] = Field(None, description="Lista de equipos que se retirarán")
    observaciones_seguridad: Optional[str] = Field(None, description="Observaciones de seguridad")
    observaciones: Optional[str] = Field(None, description="Observaciones generales")
    
    @validator('fecha_programada')
    def validate_fecha_programada(cls, v):
        if v <= datetime.now():
            raise ValueError('La fecha programada debe ser futura')
        return v
    
    @validator('nombre_escolta')
    def validate_nombre_escolta(cls, v, values):
        if values.get('requiere_escolta') and not v:
            raise ValueError('Si requiere escolta, debe proporcionar el nombre de la escolta')
        return v


class VisitaCreate(VisitaBase):
    pass


class VisitaUpdate(BaseModel):
    persona_id: Optional[int] = None
    centro_datos_id: Optional[int] = None
    tipo_actividad_id: Optional[int] = None
    descripcion_actividad: Optional[str] = Field(None, min_length=10)
    fecha_programada: Optional[datetime] = None
    duracion_estimada: Optional[int] = Field(None, ge=15, le=480)
    autorizado_por: Optional[str] = Field(None, max_length=200)
    motivo_autorizacion: Optional[str] = None
    requiere_escolta: Optional[bool] = None
    nombre_escolta: Optional[str] = Field(None, max_length=200)
    equipos_ingresados: Optional[str] = None
    equipos_retirados: Optional[str] = None
    observaciones_seguridad: Optional[str] = None
    observaciones: Optional[str] = None
    notas_finales: Optional[str] = None
    activo: Optional[bool] = None


class VisitaIngreso(BaseModel):
    fecha_ingreso: Optional[datetime] = Field(default_factory=datetime.now, description="Fecha y hora de ingreso")
    observaciones_ingreso: Optional[str] = Field(None, description="Observaciones al momento del ingreso")


class VisitaSalida(BaseModel):
    fecha_salida: Optional[datetime] = Field(default_factory=datetime.now, description="Fecha y hora de salida")
    equipos_retirados: Optional[str] = Field(None, description="Equipos retirados durante la visita")
    observaciones_salida: Optional[str] = Field(None, description="Observaciones al momento de la salida")
    notas_finales: Optional[str] = Field(None, description="Notas finales de la visita")


class VisitaResponse(VisitaBase):
    id: int
    codigo_visita: str
    estado_id: int
    fecha_ingreso: Optional[datetime] = None
    fecha_salida: Optional[datetime] = None
    duracion_real: Optional[int] = None
    notas_finales: Optional[str] = None
    activo: bool
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    esta_activa: bool
    
    class Config:
        from_attributes = True


class VisitaListResponse(BaseModel):
    items: list[VisitaResponse]
    total: int
    page: int
    size: int
    pages: int


class VisitaWithDetails(VisitaResponse):
    persona: dict = {}
    centro_datos: dict = {}
    

class VisitaEstadisticas(BaseModel):
    total_visitas: int
    visitas_programadas: int
    visitas_en_curso: int
    visitas_completadas: int
    visitas_canceladas: int
    promedio_duracion: Optional[float] = None
    visitas_por_tipo_actividad: dict
    visitas_por_centro_datos: dict
