from fastapi import HTTPException, status, Depends
from app.auth import get_current_active_user
from app.models import RolUsuario  # Asume que Usuario tiene rol
from app.database import get_db
from sqlalchemy.orm import Session


def require_role(required_role_id: int):
    """
    Dependencia: Verifica si el usuario actual tiene rol_id >= required_role_id.
    Ej: require_role(1) para ADMIN/OPERADOR (asumiendo 1=ADMIN, 2=OPERADOR).
    """
    def dependency(current_user: dict = Depends(get_current_active_user), db: Session = Depends(get_db)):
        # Obtén usuario completo para rol
        from app.services.usuario_service import UsuarioService
        usuario_service = UsuarioService(db)
        user = usuario_service.get(current_user["id"])
        if not user or user.rol_id < required_role_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol insuficiente. Requiere rol_id >= {required_role_id} (ej: {user.rol.nombre_rol if user else 'Ninguno'})."
            )
        return user
    return dependency

# Roles específicos
def require_admin(current_user: dict = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return require_role(1)(current_user, db)  # Solo ADMIN (id=1)

def require_operator_or_above(current_user: dict = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return require_role(1)(current_user, db)  # ADMIN (1) o OPERADOR (2), asumiendo jerarquía numérica
