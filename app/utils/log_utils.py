# app/utils/log_utils.py - Utilidad para loggear acciones en tabla "control"
import json
import logging  # AGREGADO: Para log si no hay DB
from typing import Optional, Dict, Any
from fastapi import Request
from sqlalchemy.orm import Session
from app.database import get_db  # No usado aquí (pasa db explícito)
from app.services.Control_service import ControlService  # Lowercase (crea control_service.py si no)
from app.models import Usuario  # Para type hints y checks
from datetime import datetime, date  # Para hora/fecha si necesitas override

# AGREGADO: Logger simple (opcional, para debug si no DB)
logger = logging.getLogger(__name__)

async def log_action(
    accion: str,
    tabla_afectada: Optional[str] = None,
    registro_id: Optional[int] = None,
    detalles: Optional[Dict[str, Any]] = None,
    db: Session = None,  # CORREGIDO: = None (opcional) + manejo si None
    request: Optional[Request] = None,  # Opcional
    current_user: Optional[Usuario] = None  # Asume Usuario object (ajusta si dict)
) -> None:
    """
    Loggea acción post-operación en modelo Control.
    Compatible con current_user como:
    - Objeto Usuario (user.rol.id_rol, user.id)
    - Dict (de JWT: user['rol_id'], user['id']) – fallback
    - None (pre-auth, e.g., login: usa defaults o skip)
    
    Auditors (rol 4) skip en acciones "consultar_*" para evitar spam en vistas.
    Si db is None, skip logging (e.g., tests o llamadas sin DB).
    """
    # AGREGADO: Skip si no hay DB (evita crash en llamadas sin session)
    if db is None:
        logger.warning(f"Skip log_action '{accion}': No DB session provided.")
        return

    # Extraer rol_id y usuario_id de forma segura
    usuario_id = None
    rol_id = None
    if current_user is not None:
        if isinstance(current_user, Usuario):  # Objeto Usuario (de dependencies)
            rol_id = current_user.rol.id_rol if current_user.rol else None  # user.rol.id_rol
            usuario_id = current_user.id
        elif isinstance(current_user, dict):  # Dict de JWT (si usas sin modelo)
            rol_id = current_user.get('rol_id', None)
            usuario_id = current_user.get('id', None)
        else:  # Fallback (e.g., custom obj)
            # Intenta attrs primero, luego dict
            rol_id = getattr(current_user, 'rol_id', None)
            if rol_id is None and hasattr(current_user, 'rol') and current_user.rol:
                rol_id = current_user.rol.id_rol
            usuario_id = getattr(current_user, 'id', current_user.get('id', None))

    # Skip si no hay usuario_id (e.g., anónimo/pre-auth)
    if usuario_id is None:
        # Opcional: Log anónimo para intentos fallidos
        # await log_action_anon(accion + "_anonimo", ...) – implementa si necesitas
        return

    # Skip logs de vistas para auditors (rol 4) y acciones "consultar_*"
    if rol_id == 4 and accion.startswith("consultar_"):
        return

    # Crea log con ControlService
    control_service = ControlService(db)
    ip = request.client.host if request else "unknown"
    user_agent = request.headers.get("User-Agent") if request else "unknown"  # Case-sensitive

    detalles_final = detalles or {}
    # Enriquecir con info user (segura, excluye sensibles)
    if isinstance(current_user, Usuario):
        # Usa dict sin sensibles (implementa to_dict en Usuario si no tienes)
        user_info = {
            "id": current_user.id,
            "username": current_user.username,
            "nombre": f"{current_user.nombre} {getattr(current_user, 'apellidos', '')}" if hasattr(current_user, 'apellidos') else current_user.nombre,
            "rol_id": rol_id,
            # Agrega más si necesitas (e.g., email), pero no password/rol full
        }
    elif isinstance(current_user, dict):
        user_info = {k: v for k, v in current_user.items() if k not in ['password', 'hashed_password', 'token']}
    else:
        user_info = {"id": usuario_id, "rol_id": rol_id}

    detalles_final['usuario_info'] = user_info
    detalles_final['ip_address'] = ip  # Enriquecido
    detalles_final['user_agent'] = user_agent

    # JSON stringify para detalles (Text/JSON en modelo)
    detalles_json = json.dumps(detalles_final, default=str, ensure_ascii=False)  # Maneja dates/non-serializables

    # Crea log (service sets fecha/hora auto; override si necesitas)
    control_service.create_control_log(
        realizado=accion,  # accion → realizado
        usuario_id=usuario_id,
        tabla_afectada=tabla_afectada,
        registro_id=registro_id,
        detalles=detalles_json,  # JSON str
        ip_address=ip,
        user_agent=user_agent
        # fecha=date.today() y hora=datetime.now().strftime("%H:%M:%S") – auto en service
    )
