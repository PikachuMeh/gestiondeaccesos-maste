# app/routers/api_usuarios.py (nuevo archivo)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.usuario_service import UsuarioService
from app.auth.api_permisos import require_supervisor_or_above, require_admin
from app.models import Usuario,Visita
from app.schemas.esquema_usuario import UsuarioResponse, UsuarioListResponse  # Asume esquemas
from sqlalchemy import and_

router = APIRouter(prefix="/usuarios", tags=["Usuarios/Operadores"])

@router.get("/", response_model=UsuarioListResponse)  # Lista para frontend tabla
async def list_usuarios(
    page: int = 1,
    size: int = 10,
    current_user = Depends(require_supervisor_or_above),  # Solo SUPERVISOR/ADMIN ve lista
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)
    # Filtra según rol actual: ADMIN ve todo (rol 1-3), SUPERVISOR solo OPERADORES(3)
    if current_user.rol_id == 1:  # ADMIN
        usuarios = usuario_service.get_multi(skip=(page-1)*size, limit=size, order_by='username')
    else:  # SUPERVISOR (2)
        usuarios = usuario_service.get_multi(
            skip=(page-1)*size, 
            limit=size, 
            filters={"rol_id": 3},  # Solo OPERADORES
            order_by='username'
        )
    total = len(usuarios) if current_user.rol_id > 1 else usuario_service.count()  # Ajusta count
    pages = (total + size - 1) // size
    return UsuarioListResponse(items=usuarios, total=total, page=page, size=size, pages=pages)

@router.delete("/{usuario_id}", summary="Eliminar operador o supervisor")
async def delete_usuario(
    usuario_id: int,
    current_user = Depends(require_supervisor_or_above),  # Base: SUPERVISOR/ADMIN
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)
    target_user = usuario_service.get(usuario_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Checks granulares
    if target_user.id == current_user.id:
        raise HTTPException(status_code=403, detail="No puedes eliminarte a ti mismo")
    
    if current_user.rol_id == 2:  # SUPERVISOR solo borra OPERADORES(3)
        if target_user.rol_id != 3:
            raise HTTPException(status_code=403, detail="SUPERVISOR solo puede eliminar OPERADORES")
    
    # ADMIN (1) puede borrar todo (supervisores/operadores), pero no AUDITORES(4) por ahora
    if target_user.rol_id == 4:
        raise HTTPException(status_code=403, detail="No se pueden eliminar AUDITORES por ahora")
    
    # Check integridad: no borrar si tiene visitas (opcional, ajusta)
    visitas_count = db.query(Usuario).filter(Usuario.id == usuario_id).join(Visita).count()  # Asume relación si existe
    if visitas_count > 0:
        raise HTTPException(status_code=400, detail="Usuario tiene visitas asociadas; elimínalas primero")
    
    try:
        db.delete(target_user)
        db.commit()
        return {"detail": "Usuario eliminado correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error eliminando usuario: {exc}")
