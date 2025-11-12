# app/api/api_audit.py - API para auditoría usando modelo Control (tabla "control")
from fastapi import APIRouter, Depends, Request, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, String  # Para combine fecha + hora si necesitas
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from app.database import get_db
from app.models import Control, Usuario  # CORREGIDO: Usa Control y Usuario
from app.services.Control_service import ControlService  # CORREGIDO: Renombra a ControlService (ver notas)
from app.auth.api_permisos import require_auditor  # Solo rol=4
from app.schemas.esquema_control import ControlLogResponse, ControlStatsResponse, ControlSearchRequest, EsquemaControl  # CORREGIDO: Renombra esquemas
from app.utils.log_utils import log_action  # Logging meta
from app.auth.dependencies import get_current_active_user


router = APIRouter(prefix="/audit", tags=["Auditoría"])

# AGREGADO: Helper para paginación y formateo (combina fecha + hora)
def paginate_and_format(items: List[Any], total: int, page: int, size: int) -> Dict[str, Any]:
    formatted_items = []
    for item in items:
        # Combina fecha (Date) + hora (String) a datetime para display
        try:
            fecha_str = f"{item.fecha} {item.hora}" if item.fecha and item.hora else str(item.fecha)
            fecha_completa = datetime.strptime(fecha_str, "%Y-%m-%d %H:%M:%S").isoformat() if item.hora else str(item.fecha)
        except:
            fecha_completa = str(item.fecha)
        formatted = {
            "id": item.id,
            "realizado": item.realizado,  # Acción (e.g., "borrar_persona")
            "tabla_afectada": item.tabla_afectada,  # Entidad (e.g., "personas")
            "registro_id": item.registro_id,  # Entidad ID
            "detalles": item.detalles,  # Text/JSON
            "fecha_completa": fecha_completa,
            "fecha": str(item.fecha),  # Solo fecha para filtros
            "hora": item.hora,
            "ip_address": item.ip_address,
            "user_agent": item.user_agent,
            "usuario": {
                "id": item.usuario.id,
                "username": item.usuario.username,
                "nombre": f"{item.usuario.nombre} {item.usuario.apellidos}"
            }
        }
        formatted_items.append(formatted)
    pages = (total + size - 1) // size
    return {
        "items": formatted_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/", response_model=List[EsquemaControl])  # CORREGIDO: Usa Control
async def get_controls(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    realizado: Optional[str] = Query(None),  # CORREGIDO: Filtro por 'realizado' (acción)
    usuario_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    # Check auditor
    if current_user.rol.id_rol != 4:
        raise HTTPException(status_code=403, detail="Acceso solo para auditores")

    # Query con join y filtros
    query = db.query(Control).join(Usuario, Control.usuario_id == Usuario.id).options(joinedload(Usuario.rol))
    if realizado:
        query = query.filter(Control.realizado == realizado)
    if usuario_id:
        query = query.filter(Control.usuario_id == usuario_id)
    query = query.order_by(desc(Control.fecha), desc(func.cast(Control.hora, String)))  # Orden fecha + hora DESC

    total = query.count()
    controls = query.offset((page - 1) * size).limit(size).all()
    return [EsquemaControl.from_orm(control) for control in controls]  # Ajusta si no usa from_orm

@router.get("/logs", response_model=ControlLogResponse)  # CORREGIDO: Usa 'realizado', tabla_afectada
async def get_control_logs(
    request: Request,
    usuario_id: Optional[int] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    realizado: Optional[str] = Query(None),  # CORREGIDO: Acción → realizado
    tabla_afectada: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: Usuario = Depends(require_auditor),
    db: Session = Depends(get_db)
):
    control_service = ControlService(db)  # CORREGIDO: Usa ControlService
    filters = {
        'usuario_id': usuario_id,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'realizado': realizado,  # CORREGIDO
        'tabla_afectada': tabla_afectada
    }
    skip = (page - 1) * size
    logs, total = control_service.get_control_logs(filters, skip=skip, limit=size)
    return paginate_and_format(logs, total, page, size)  # Usa helper para formato

    # Logging meta (ajustado)
    await log_action(
        accion="consultar_logs_control",  # CORREGIDO: Específico
        tabla_afectada="control",
        detalles={"filtros": filters, "page": page, "size": size},
        request=request,
        db=db,
        current_user=current_user
    )
    return ControlLogResponse(**response_data)  # Si usas Pydantic; o direct return

@router.get("/stats", response_model=ControlStatsResponse)
async def get_stats(
    request: Request,
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    current_user: Usuario = Depends(require_auditor),
    db: Session = Depends(get_db)
):
    control_service = ControlService(db)
    stats = control_service.get_control_stats(fecha_desde, fecha_hasta)  # CORREGIDO: Stats por realizado/tabla_afectada
    await log_action(
        accion="consultar_stats_control",
        tabla_afectada="control",
        detalles={"fecha_desde": str(fecha_desde) if fecha_desde else None, "fecha_hasta": str(fecha_hasta) if fecha_hasta else None},
        request=request,
        db=db,
        current_user=current_user
    )
    return ControlStatsResponse(**stats)

@router.post("/search")
async def search_logs(
    request: Request,
    req: ControlSearchRequest,  # CORREGIDO: Renombra
    current_user: Usuario = Depends(require_auditor),
    db: Session = Depends(get_db)
):
    control_service = ControlService(db)
    logs, total = control_service.search_logs(req.search_term, req.skip, req.limit)  # Búsqueda en realizado, detalles, username
    formatted_logs = paginate_and_format(logs, total, 1, req.limit)["items"]  # Formato
    await log_action(
        accion="buscar_logs_control",
        tabla_afectada="control",
        detalles={"search_term": req.search_term, "skip": req.skip, "limit": req.limit},
        request=request,
        db=db,
        current_user=current_user
    )
    return {"results": formatted_logs, "total": total}
