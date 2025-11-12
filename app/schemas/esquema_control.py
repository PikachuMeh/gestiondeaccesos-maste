# app/schemas/esquema_control.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class EsquemaControl(BaseModel):
    id: int
    realizado: str
    fecha: date
    hora: str
    usuario_id: int
    detalles: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    tabla_afectada: Optional[str] = None
    registro_id: Optional[int] = None
    # Usuario embebido
    usuario: dict  # {"id": int, "username": str, ...}
    class Config:
        from_attributes = True

class ControlLogResponse(BaseModel):
    items: List[dict]  # Formateados con fecha_completa, usuario dict
    total: int
    page: int
    size: int
    pages: int

class ControlStatsResponse(BaseModel):
    stats: List[dict]  # [{"realizado": str, "tabla_afectada": str, "count": int}]

class ControlSearchRequest(BaseModel):
    search_term: str
    skip: int = 0
    limit: int = 50
