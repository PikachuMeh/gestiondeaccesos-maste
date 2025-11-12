from app.utils.log_utils import log_action
from app.schemas.esquema_control import EsquemaControl,ControlLogResponse,ControlSearchRequest,ControlStatsResponse
from app.auth.api_permisos import require_operator_or_above,require_admin 
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from app.database import get_db
from sqlalchemy.orm import Session
# En get_visita:
async def get_visita(request: Request, visita_id: int, current_user = Depends(require_operator_or_above), db: Session = Depends(get_db)):
    # ... lógica
    await log_action(accion="consultar_visita", tabla_afectada="visitas", registro_id=visita_id, request=request, db=db, current_user=current_user)
