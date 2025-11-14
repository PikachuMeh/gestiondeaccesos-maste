# app/api/api_usuarios.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.usuario_service import UsuarioService  # Tu servicio
from app.auth.api_permisos import require_supervisor_or_above, require_role
from app.models import Usuario, Visita, RolUsuario
from app.schemas.esquema_usuario import UsuarioResponse, UsuarioListResponse, UsuarioUpdate, UsuarioCreate  # Importa UsuarioUpdate para PUT
from sqlalchemy.exc import IntegrityError
from app.utils.log_utils import log_action 
from typing import Optional
import logging  # Para logs detallados

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usuarios", tags=["Usuarios/Operadores"])

@router.get("/", response_model=UsuarioListResponse)
async def list_usuarios(
    request: Request,
    page: int = 1,
    size: int = 10,
    current_user=Depends(require_supervisor_or_above),  # Tipo inferido: Usuario
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
    # Logging (async como en tu original)
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
    current_user=Depends(require_supervisor_or_above),  # Usuario model
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
    visitas_count = db.query(Visita).filter(Visita.persona_id == usuario_id).count()  # Ajusta si needed
    if visitas_count > 0:
        raise HTTPException(status_code=400, detail="Usuario tiene visitas asociadas; elimínalas primero")

    try:
        # Usa deactivate en lugar de delete (soft delete del servicio)
        usuario_service.deactivate_user(usuario_id)
        db.commit()

        # Logging (async)
        await log_action(
            accion="eliminar_usuario",
            tabla_afectada="usuarios",
            registro_id=usuario_id,
            detalles={"username": target_user.username, "rol_id": target_user.rol_id},
            request=request,
            db=db,
            current_user=current_user
        )
        return {"detail": "Usuario desactivado correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error desactivando usuario: {exc}")

@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    username: str = Form(..., min_length=3, max_length=50),
    password: str = Form(..., min_length=6),
    email: str = Form(..., regex=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"),
    cedula: str = Form(..., min_length=7, max_length=8),
    rol_id: int = Form(..., ge=2, le=3),
    nombre: str = Form(..., min_length=1, max_length=200),
    apellidos: str = Form(..., min_length=1, max_length=200),
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(1))  # Usuario model, no dict
):
    print(f"Received data: username={username}, email={email}, rol_id={rol_id}, type(rol_id)={type(rol_id)}, cedula={cedula}, nombre={nombre}, apellidos={apellidos}")
    
    if rol_id == 1:
        raise HTTPException(status_code=403, detail="No se puede crear un Administrador desde esta ruta")
    if rol_id == 4:
        raise HTTPException(status_code=400, detail="Rol de Auditor no permitido")
    
    try:
        usuario_service = UsuarioService(db)
            
        # Chequeos pre-add opcionales (servicio los repite, pero para 409 custom)
        username_lower = username.lower().strip()
        email_lower = email.lower().strip()
        if db.query(Usuario).filter(Usuario.username == username_lower).first():
            raise HTTPException(status_code=409, detail=f"Conflicto en username: '{username_lower}' ya existe")
        if db.query(Usuario).filter(Usuario.email == email_lower).first():
            raise HTTPException(status_code=409, detail=f"Conflicto en email: '{email_lower}' ya existe")
        if db.query(Usuario).filter(Usuario.cedula == cedula).first():
            raise HTTPException(status_code=409, detail=f"Conflicto en cédula: '{cedula}' ya existe")
            
        logger.info(f"Pre-chequeos pasados: username={username_lower}, email={email_lower}, cedula={cedula}")
            
        # Crea UsuarioCreate full (tu esquema valida min_length, etc.)
        create_data = UsuarioCreate(
            username=username_lower,
            email=email_lower,
            cedula=cedula,
            nombre=nombre.strip().title(),  # Normaliza (ej. "Elza Pato")
            apellidos=apellidos.strip().title(),  # "perez perejil" → "Perez Perejil"
            password=password,
            rol_id=rol_id,
            telefono=None,  # Opcional; agrega Form si quieres input
            departamento=None,
            observaciones=None
        )
            
        # Usa create_user (genérico, acepta UsuarioCreate full con nombre/apellidos)
        user = usuario_service.create_user(create_data)
            
        # Si foto: Maneja upload (ej. guardar en user.foto_path = await save_file(foto))
        if foto:
            # Ejemplo: user.foto_path = f"uploads/{foto.filename}"
            # db.commit()
            pass  # Implementa si needed
                
        db.commit()  # Servicio ya commitea, pero refresh si foto
        db.refresh(user)
        logger.info(f"Usuario creado: ID={user.id}, username={user.username}, nombre={user.nombre} {user.apellidos}, rol_id={user.rol_id}")
            
        # FIX: Log acción – usa atributos de modelo (no .get())
        log_action(
            request, 
            "Crear usuario", 
            f"Usuario '{user.username}' (ID={user.id}, rol_id={user.rol_id}, nombre='{user.nombre} {user.apellidos}') creado por '{current_user.username}'",  # .username directo
            current_user.id,  # .id directo
            db
        )
        
        return user  # Serializa con UsuarioResponse (incluye rol)
        
    except ValueError as e:
        # Servicio lanza ValueError para duplicates/inválidos
        logger.error(f"ValueError del servicio: {str(e)}")
        if "ya existe" in str(e).lower() or "registrado" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError as e:
        db.rollback()
        orig_error = getattr(e.orig, 'pgcode', 'N/A') if hasattr(e, 'orig') else 'N/A'
        orig_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        logger.error(f"IntegrityError: Código={orig_error}, Mensaje='{orig_msg}'")
        
        if orig_error == '23502':  # NOT NULL (raro ahora, pero si)
            raise HTTPException(status_code=422, detail=f"Campo requerido faltante: {orig_msg[:100]}")
        elif orig_error == '23505':  # Unique (DB level, si servicio falla)
            if any(field in orig_msg.lower() for field in ['username', 'email', 'cedula']):
                raise HTTPException(status_code=409, detail=f"Duplicado detectado en DB: {orig_msg[:100]}")
            else:
                raise HTTPException(status_code=409, detail=f"Conflicto en DB: {orig_msg[:100]}")
        else:
            raise HTTPException(status_code=500, detail=f"Error DB: {orig_msg[:200]}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.put("/{user_id}", response_model=UsuarioResponse)
async def update_user(
    user_id: int,
    request: Request,
    username: Optional[str] = Form(None, min_length=3, max_length=50),
    email: Optional[str] = Form(None),
    cedula: Optional[str] = Form(None, min_length=7, max_length=8),
    rol_id: Optional[int] = Form(None, ge=2, le=3),
    password: Optional[str] = Form(None, min_length=6),
    activo: Optional[bool] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(1))  # Usuario model, no dict
):
    """
    Actualizar usuario (solo admin). Usa Form para compatibilidad.
    """
    # Prevenir cambio a admin
    if rol_id == 1:
        raise HTTPException(status_code=403, detail="No se puede asignar rol de Administrador")
    
    # Prevenir self-update
    existing_user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not existing_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if existing_user.id == current_user.id:  # FIX: .id directo
        raise HTTPException(status_code=403, detail="No se puede modificar tu propia cuenta como admin")

    try:
        usuario_service = UsuarioService(db)
        # Crea UsuarioUpdate instance (solo fields proporcionados)
        update_data = UsuarioUpdate(
            username=username.lower() if username else None,
            email=email.lower() if email else None,
            cedula=cedula if cedula else None,
            rol_id=rol_id,
            activo=activo
        )
        # Si password, hashea y actualiza manual (service no maneja en update)
        if password:
            hashed = usuario_service.get_password_hash(password)
            existing_user.hashed_password = hashed
            db.commit()
            db.refresh(existing_user)
        
        user = usuario_service.update_user(user_id, update_data)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # FIX: Log – usa .username e .id
        log_action(
            request, "Actualizar usuario", f"Usuario {user.username} actualizado por {current_user.username}",  # .username
            current_user.id,  # .id
            db
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(
    usuario_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_supervisor_or_above),  # supervisor+ puede ver detalles
):
    usuario_service = UsuarioService(db)
    usuario = usuario_service.get(usuario_id)  # ajusta al método real de tu service
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    # Auditoría opcional
    await log_action(
        accion="consultar_usuario",        # o crear_usuario, borrar_usuario, etc.
        tabla_afectada="usuarios",         # nombre de tabla/modelo
        registro_id=usuario_id,            # ID afectado
        detalles={
            "username": usuario.username,
            "rol_id": usuario.rol_id,
        },                                 # dict con info legible
        db=db,
        request=request,
        current_user=current_user,         # el usuario autenticado que hace la acción
    )

    return usuario