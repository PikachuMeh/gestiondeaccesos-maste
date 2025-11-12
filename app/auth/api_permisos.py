# app/auth/api_permisos.py (corregido y expandido)
from fastapi import HTTPException, status, Depends
from app.auth import get_current_active_user
from app.services.usuario_service import UsuarioService  # Para obtener usuario completo
from app.database import get_db
from sqlalchemy.orm import Session
from fastapi import Request  # Para IP en logs
from app.utils.log_utils import log_action  # Dependencia de logging
from app.services.Control_service import ControlService

def require_role(required_role_id: int):
    """
    Dependencia: Verifica si el usuario actual tiene rol_id <= required_role_id (jerarquía: bajo ID = alto privilegio).
    Ej: require_role(2) permite ADMIN(1) y SUPERVISOR(2); required_role_id es el máximo ID permitido.
    """
    def dependency(current_user: dict = Depends(get_current_active_user), db: Session = Depends(get_db)):
        usuario_service = UsuarioService(db)
        user = usuario_service.get(current_user["id"])
        if not user or user.rol_id > required_role_id:  # > required = privilegio bajo (e.g., 3 > 2 = denegar)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol insuficiente. Requiere rol_id <= {required_role_id} (actual: {user.rol.nombre_rol if user else 'Ninguno'})."
            )
        return user  # Retorna usuario completo para uso en endpoint
    return dependency

# Roles específicos (corregidos)
def require_admin(current_user = Depends(require_role(1)), db: Session = Depends(get_db)):
    return current_user  # Solo ADMIN (rol_id <=1)

def require_supervisor_or_above(current_user = Depends(require_role(2)), db: Session = Depends(get_db)):
    return current_user  # ADMIN(1) + SUPERVISOR(2)

def require_operator_or_above(current_user = Depends(require_role(3)), db: Session = Depends(get_db)):
    return current_user  # ADMIN(1) + SUPERVISOR(2) + OPERADOR(3)

def require_auditor(current_user = Depends(require_role(4)), db: Session = Depends(get_db)):
    return current_user  # Solo AUDITOR(4)
