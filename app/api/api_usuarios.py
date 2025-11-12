# app/api/api_usuarios.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.usuario_service import UsuarioService
from app.auth.api_permisos import require_supervisor_or_above, require_admin
from app.models import Usuario, Visita
from app.schemas.esquema_usuario import UsuarioResponse, UsuarioListResponse, UsuarioCreate, UsuarioCreateResponse
from sqlalchemy import and_
from app.utils.log_utils import log_action  # Agregado

router = APIRouter(prefix="/usuarios", tags=["Usuarios/Operadores"])

@router.get("/", response_model=UsuarioListResponse)
async def list_usuarios(
    request: Request,
    page: int = 1,
    size: int = 10,
    current_user = Depends(require_supervisor_or_above),
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)

    if current_user.rol_id == 1:  # ADMIN
        usuarios = usuario_service.get_multi(skip=(page-1)*size, limit=size, order_by='username')
    else:  # SUPERVISOR (2)
        usuarios = usuario_service.get_multi(
            skip=(page-1)*size,
            limit=size,
            filters={"rol_id": 3},  # Solo OPERADORES
            order_by='username'
        )

    total = len(usuarios) if current_user.rol_id > 1 else usuario_service.count()
    pages = (total + size - 1) // size
    response = UsuarioListResponse(items=usuarios, total=total, page=page, size=size, pages=pages)
    # Logging
    await log_action(
        accion="consultar_lista_usuarios",
        tabla_afectada="usuarios",
        detalles={"page": page, "size": size, "rol_actual": current_user.rol_id},
        request=request,
        db=db,
        current_user=current_user
    )
    return response

@router.delete("/{usuario_id}", summary="Eliminar operador o supervisor")
async def delete_usuario(
    request: Request,
    usuario_id: int,
    current_user = Depends(require_supervisor_or_above),
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)
    target_user = usuario_service.get(usuario_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=403, detail="No puedes eliminarte a ti mismo")

    if current_user.rol_id == 2:  # SUPERVISOR solo borra OPERADORES(3)
        if target_user.rol_id != 3:
            raise HTTPException(status_code=403, detail="SUPERVISOR solo puede eliminar OPERADORES")

    if target_user.rol_id == 4:
        raise HTTPException(status_code=403, detail="No se pueden eliminar AUDITORES por ahora")

    # Check integridad
    visitas_count = db.query(Visita).filter(Visita.usuario_id == usuario_id).count()  # Ajusta relación
    if visitas_count > 0:
        raise HTTPException(status_code=400, detail="Usuario tiene visitas asociadas; elimínalas primero")

    try:
        db.delete(target_user)
        db.commit()

        # Logging
        await log_action(
            accion="eliminar_usuario",
            tabla_afectada="usuarios",
            registro_id=usuario_id,
            detalles={"username": target_user.username, "rol_id": target_user.rol_id},
            request=request,
            db=db,
            current_user=current_user
        )
        return {"detail": "Usuario eliminado correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error eliminando usuario: {exc}")

@router.post("/", response_model=UsuarioCreateResponse, status_code=status.HTTP_201_CREATED, summary="Crear operador o supervisor (solo ADMIN)")
async def create_usuario(
    request: Request,
    payload: UsuarioCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        usuario_service = UsuarioService(db)
        new_user = usuario_service.create_operator_or_supervisor(
            username=payload.username,
            password=payload.password,
            email=payload.email,
            cedula=payload.cedula,
            rol_id=payload.rol_id,
            db=db
        )

        response = UsuarioCreateResponse(
            **usuario_service.to_dict(new_user),
            message="Usuario creado exitosamente"
        )
        # Logging
        await log_action(
            accion="crear_usuario",
            tabla_afectada="usuarios",
            registro_id=new_user.id,
            detalles={"username": payload.username, "rol_id": payload.rol_id, "email": payload.email},
            request=request,
            db=db,
            current_user=current_user
        )
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando usuario: {exc}")
