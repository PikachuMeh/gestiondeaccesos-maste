"""
Esquemas Pydantic para el modelo Visita.
Define la validación y serialización de datos de visitas.
"""

from pydantic import BaseModel, validator, Field
from typing import Optional
from datetime import datetime
# app/schemas/esquema_visita.py (Pydantic v2)
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, field_validator

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




class VisitaCreate(BaseModel):
    """
    Datos necesarios para crear una visita.
    Alinear nombres EXACTOS con columnas del modelo SQLAlchemy.
    """
    # FKs obligatorias
    persona_id: int = Field(..., ge=1, description="ID de la persona visitante")
    centro_datos_id: int = Field(..., ge=1, description="ID del centro de datos")

    # Catálogos opcionales si no se usan en el flujo actual
    estado_id: Optional[int] = Field(None, ge=1, description="Estado de la visita (opcional)")
    tipo_actividad_id: Optional[int] = Field(None, ge=1, description="Tipo de actividad (opcional)")

    # Detalles operativos
    descripcion_actividad: str = Field(..., min_length=3, description="Descripción o actividad a realizar/retirar")
    fecha_programada: datetime = Field(..., description="Fecha/hora programada en ISO; se normaliza a UTC")
    requiere_escolta: bool = Field(default=False, description="Si requiere escolta dentro del centro")
    nombre_escolta: Optional[str] = Field(None, max_length=200, description="Nombre de la escolta")
    autorizado_por: Optional[str] = Field(None, max_length=200, description="Nombre de quien autoriza")
    motivo_autorizacion: Optional[str] = Field(None, description="Motivo de la autorización")
    equipos_ingresados: Optional[str] = Field(None, description="Listado/desc de equipos a ingresar")
    equipos_retirados: Optional[str] = Field(None, description="Listado/desc de equipos a retirar (si aplica)")
    observaciones: Optional[str] = Field(None, description="Observaciones generales")
    area_id: Optional[int] = Field(None, ge=1, description="Área (opcional)")

    # Config para ORM
    model_config = ConfigDict(from_attributes=True)

    # Normalización y validaciones

    @field_validator("descripcion_actividad")
    @classmethod
    def desc_strip(cls, v: str) -> str:
        v2 = v.strip()
        if len(v2) < 3:
            raise ValueError("La descripción debe tener al menos 3 caracteres")
        return v2

    @field_validator("nombre_escolta")
    @classmethod
    def escolta_required_if_flag(cls, v: Optional[str], info):
        requiere = info.data.get("requiere_escolta", False)
        if requiere:
            if not v or not v.strip():
                raise ValueError("Debe indicar el nombre de la escolta")
            return v.strip()
        # si no requiere, permitir None o string vacío normalizado a None
        return v.strip() if isinstance(v, str) and v.strip() else None

    @field_validator("fecha_programada")
    @classmethod
    def fecha_utc_future(cls, v: datetime) -> datetime:
        # Asegurar tz-aware
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        else:
            # normalizar a UTC
            v = v.astimezone(timezone.utc)
        now_utc = datetime.now(timezone.utc)
        if v <= now_utc:
            raise ValueError("La fecha programada debe ser futura")
        return v

    @field_validator("autorizado_por", "motivo_autorizacion", "equipos_ingresados", "equipos_retirados", "observaciones")
    @classmethod
    def optional_str_strip(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v2 = v.strip()
        return v2 if v2 else None



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
