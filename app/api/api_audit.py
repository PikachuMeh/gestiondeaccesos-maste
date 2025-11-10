# app/api/api_audit.py (nuevo archivo)
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.audit_service import AuditService
from app.auth.api_permisos import require_auditor
from app.schemas.esquema_audit import AuditLogResponse, AuditStatsResponse, AuditSearchRequest
from typing import Optional
from datetime import date

router = APIRouter(prefix="/audit", tags=["Auditoría"])

@router.get("/logs", response_model=AuditLogResponse)
async def get_audit_logs(
    request: Request,
    usuario_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    accion: Optional[str] = None,
    tabla_afectada: Optional[str] = None,
    page: int = 1,
    size: int = 50,
    current_user = Depends(require_auditor),  # Solo AUDITOR
    db: Session = Depends(get_db)
):
    """
    Obtiene registros de auditoría. Solo para AUDITORES.
    """
    audit_service = AuditService(db)
    skip = (page - 1) * size

    logs = audit_service.get_audit_logs(
        usuario_id=usuario_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        accion=accion,
        tabla_afectada=tabla_afectada,
        skip=skip,
        limit=size
    )

    # Contar total (simplificado)
    total = len(logs) if not any([usuario_id, fecha_desde, fecha_hasta, accion, tabla_afectada]) else 1000  # TODO: implementar count real
    pages = (total + size - 1) // size

    return AuditLogResponse(
        items=logs,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    current_user = Depends(require_auditor),  # Solo AUDITOR
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de auditoría. Solo para AUDITORES.
    """
    audit_service = AuditService(db)
    stats = audit_service.get_audit_stats(fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    return AuditStatsResponse(**stats)

@router.get("/user/{usuario_id}/activity")
async def get_user_activity(
    usuario_id: int,
    limit: int = 50,
    current_user = Depends(require_auditor),  # Solo AUDITOR
    db: Session = Depends(get_db)
):
    """
    Obtiene actividad reciente de un usuario específico. Solo para AUDITORES.
    """
    audit_service = AuditService(db)
    activity = audit_service.get_user_activity(usuario_id, limit)
    return {"activity": activity}

@router.post("/search")
async def search_audit_logs(
    search_request: AuditSearchRequest,
    current_user = Depends(require_auditor),  # Solo AUDITOR
    db: Session = Depends(get_db)
):
    """
    Busca en registros de auditoría. Solo para AUDITORES.
    """
    audit_service = AuditService(db)
    results = audit_service.search_audit_logs(
        search_term=search_request.search_term,
        skip=search_request.skip,
        limit=search_request.limit
    )
    return {"results": results}