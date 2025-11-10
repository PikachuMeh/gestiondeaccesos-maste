"""
Esquemas Pydantic para auditoría
"""

from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, datetime

class AuditLogBase(BaseModel):
    realizado: str
    fecha: date
    hora: str
    usuario_id: int
    detalles: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    tabla_afectada: Optional[str] = None
    registro_id: Optional[int] = None

class AuditLogResponse(BaseModel):
    items: List[Any]  # Lista de objetos Control
    total: int
    page: int
    size: int
    pages: int

class AuditStatsResponse(BaseModel):
    total_acciones: int
    acciones_por_usuario: List[dict]
    acciones_por_tipo: List[dict]
    acciones_por_tabla: List[dict]

class AuditSearchRequest(BaseModel):
    search_term: str
    skip: int = 0
    limit: int = 50