# app/api/api_usuarios.py - VERSIÓN CORREGIDA

from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.usuario_service import UsuarioService
from app.auth.api_permisos import require_supervisor_or_above, require_role
from app.models import Usuario, Visita, RolUsuario
from app.schemas.esquema_usuario import UsuarioResponse, UsuarioListResponse, UsuarioUpdate, UsuarioCreate
from sqlalchemy.exc import IntegrityError
from app.utils.log_utils import log_action
from app.utils.file_utils import save_operador_foto, delete_operador_foto, get_operador_foto_url
from typing import Optional
import logging
import traceback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usuarios", tags=["Usuarios/Operadores"])

# ============================================================================
# GET - Listar usuarios (IMPORTANTE: Debe ir ANTES de POST/)
# ============================================================================

@router.get("/", response_model=UsuarioListResponse)
async def list_usuarios(
    request: Request,
    page: int = 1,
    size: int = 10,
    current_user=Depends(require_supervisor_or_above),
    db: Session = Depends(get_db)
):
    """
    Listar usuarios con paginación.
    - ADMIN: ve todos los usuarios
    - SUPERVISOR: ve solo operadores
    """
    # ✅ VALIDACIÓN 1: page debe ser >= 1
    if page < 1:
        page = 1
        logger.warning(f"Page menor a 1, ajustado a 1")
    
    # ✅ VALIDACIÓN 2: size debe estar entre 1 y 100
    if size < 1:
        size = 1
        logger.warning(f"Size menor a 1, ajustado a 1")
    if size > 100:
        size = 100
        logger.warning(f"Size mayor a 100, ajustado a 100")
    
    usuario_service = UsuarioService(db)
    
    # Obtener total y usuarios según rol
    if current_user.rol_id == 1:  # ADMIN
        total = usuario_service.count()
        usuarios = usuario_service.get_multi(
            skip=(page - 1) * size,
            limit=size,
            order_by='username'
        )
    else:  # SUPERVISOR (2)
        total = usuario_service.count(filters={"rol_id": 3})
        usuarios = usuario_service.get_multi(
            skip=(page - 1) * size,
            limit=size,
            filters={"rol_id": 3},
            order_by='username'
        )
    
    # ✅ VALIDACIÓN 3: Calcular páginas totales
    pages = max(1, (total + size - 1) // size)  # min 1 página
    
    # ✅ VALIDACIÓN 4: Si page excede pages, retornar lista vacía
    if page > pages:
        logger.warning(f"Page {page} excede total de páginas {pages}")
        usuarios = []
    
    # ✅ RESPUESTA CONSISTENTE
    response = UsuarioListResponse(
        items=usuarios,
        total=total,
        page=page,
        size=size,
        pages=pages
    )
    
    logger.info(
        f"Usuarios listados: page={page}/{pages}, "
        f"size={size}, total={total}, rol={current_user.rol_id}"
    )
    return response


# ============================================================================
# POST - Crear usuario
# ============================================================================

@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    username: str = Form(..., min_length=3, max_length=50),
    password: str = Form(..., min_length=6),
    email: str = Form(..., regex=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"),
    cedula: str = Form(..., min_length=7, max_length=10),
    rol_id: int = Form(..., ge=2, le=3),
    nombre: str = Form(..., min_length=1, max_length=200),
    apellidos: str = Form(..., min_length=1, max_length=200),
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(1)),  # Solo ADMIN
):
    """
    Crear nuevo usuario (Supervisor u Operador).
    La foto es opcional.
    """
    
    print(
        f"Received data: username={username}, email={email}, "
        f"rol_id={rol_id}, cedula={cedula}, nombre={nombre}, apellidos={apellidos}, "
        f"foto={'Sí' if foto else 'No'}"
    )
    
    # Protecciones
    if rol_id == 1:
        raise HTTPException(
            status_code=403,
            detail="No se puede crear un Administrador desde esta ruta",
        )
    
    if rol_id == 4:
        raise HTTPException(
            status_code=400,
            detail="Rol de Auditor no permitido",
        )
    foto_filename = None
    
    try:
        print("=== INICIANDO TRY create_user ===")
        usuario_service = UsuarioService(db)
        
        # Normalización
        username_lower = username.lower().strip()
        email_lower = email.lower().strip()
        
        # Pre-chequeos
        print(f"Pre-chequeo username='{username_lower}'")
        if db.query(Usuario).filter(Usuario.username == username_lower).first():
            raise HTTPException(
                status_code=409,
                detail=f"Conflicto en username: '{username_lower}' ya existe",
            )
        
        print(f"Pre-chequeo email='{email_lower}'")
        if db.query(Usuario).filter(Usuario.email == email_lower).first():
            raise HTTPException(
                status_code=409,
                detail=f"Conflicto en email: '{email_lower}' ya existe",
            )
        
        print(f"Pre-chequeo cedula='{cedula}'")
        if db.query(Usuario).filter(Usuario.cedula == cedula).first():
            raise HTTPException(
                status_code=409,
                detail=f"Conflicto en cédula: '{cedula}' ya existe",
            )
        
        # Procesar foto si fue proporcionada
        foto_filename = None
        if foto:
            print("Procesando foto...")
            try:
                foto_filename = await save_operador_foto(foto)
                print(f"✓ Foto guardada: {foto_filename}")
            except HTTPException as e:
                print(f"✗ Error guardando foto: {e.detail}")
                raise
        
        # Crear usuario
        print("Construyendo UsuarioCreate")
        create_data = UsuarioCreate(
            username=username_lower,
            email=email_lower,
            cedula=cedula,
            nombre=nombre.strip().title(),
            apellidos=apellidos.strip().title(),
            password=password,
            rol_id=rol_id,
            telefono=None,
            departamento=None,
            observaciones=None,
        )
        print("✓ UsuarioCreate OK")
        
        # Llamar servicio
        print("Llamando usuario_service.create_user")
        user = usuario_service.create_user(create_data)
        print("✓ usuario_service.create_user OK")
        
        # Asignar foto
        if foto_filename:
            print(f"Asignando foto {foto_filename} al usuario...")
            user.foto_path = foto_filename
            print(f"✓ Foto asignada al usuario")
        
        # Confirmar en DB
        db.commit()
        db.refresh(user)
        
        logger.info(
            f"Usuario creado: ID={user.id}, username={user.username}, "
            f"nombre={user.nombre} {user.apellidos}, rol_id={user.rol_id}, "
            f"foto={'Sí' if user.foto_path else 'No'}"
        )
        
        # Log de auditoría
        await log_action(
            accion="crear_usuario",
            tabla_afectada="usuario",
            registro_id=user.id,
            detalles={
                "username": user.username,
                "rol_id": user.rol_id,
                "nombre_completo": f"{user.nombre} {user.apellidos}",
                "con_foto": bool(user.foto_path)
            },
            request=request,
            db=db,
            current_user=current_user,
        )
        
        return user
        
    except ValueError as e:
        logger.error(f"ValueError del servicio: {str(e)}")
        if foto_filename:
            delete_operador_foto(foto_filename)
        
        if "ya existe" in str(e).lower() or "registrado" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
            
    except IntegrityError as e:
        db.rollback()
        if foto_filename:
            delete_operador_foto(foto_filename)
        
        orig_error = getattr(e.orig, "pgcode", "N/A") if hasattr(e, "orig") else "N/A"
        orig_msg = str(e.orig) if hasattr(e, "orig") else str(e)
        logger.error(f"IntegrityError: Código={orig_error}, Mensaje='{orig_msg}'")
        
        if orig_error == "23502":  # NOT NULL
            raise HTTPException(
                status_code=422,
                detail=f"Campo requerido faltante: {orig_msg[:100]}",
            )
        elif orig_error == "23505":  # UNIQUE
            if any(field in orig_msg.lower() for field in ["username", "email", "cedula"]):
                raise HTTPException(
                    status_code=409,
                    detail=f"Duplicado detectado en DB: {orig_msg[:100]}",
                )
            else:
                raise HTTPException(
                    status_code=409,
                    detail=f"Conflicto en DB: {orig_msg[:100]}",
                )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error DB: {orig_msg[:200]}",
            )
            
    except HTTPException:
        db.rollback()
        if foto_filename:
            delete_operador_foto(foto_filename)
        raise
        
    except Exception as e:
        db.rollback()
        if foto_filename:
            delete_operador_foto(foto_filename)
        
        tb = traceback.format_exc()
        logger.error(f"Error inesperado en create_user: {str(e)}\n{tb}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno: {str(e) or 'Excepción sin mensaje'}",
        )


# ============================================================================
# GET - Obtener usuario por ID
# ============================================================================

@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(
    usuario_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_supervisor_or_above),
):
    """
    Obtener detalles de un usuario específico.
    """
    usuario_service = UsuarioService(db)
    usuario = usuario_service.get(usuario_id)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    
    # Auditoría
    await log_action(
        accion="consultar_usuario",
        tabla_afectada="usuario",
        registro_id=usuario_id,
        detalles={
            "username": usuario.username,
            "rol_id": usuario.rol_id,
        },
        db=db,
        request=request,
        current_user=current_user,
    )
    
    return usuario


# ============================================================================
# PUT - Actualizar usuario
# ============================================================================

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
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(1))
):
    """
    Actualizar usuario (solo admin).
    IMPORTANTE: Solo actualiza los campos que fueron proporcionados.
    Si un campo es None, NO se actualiza.
    """
    
    if rol_id == 1:
        raise HTTPException(status_code=403, detail="No se puede asignar rol de Administrador")
    
    existing_user = db.query(Usuario).filter(Usuario.id == user_id).first()
    
    if not existing_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if existing_user.id == current_user.id:
        raise HTTPException(status_code=403, detail="No se puede modificar tu propia cuenta como admin")
    
    try:
        usuario_service = UsuarioService(db)
        
        print(f"\n=== UPDATE USER {user_id} ===")
        print(f"Received: username={username}, email={email}, cedula={cedula}, rol_id={rol_id}, activo={activo}, foto={'Sí' if foto else 'No'}")
        
        # Procesar foto si fue proporcionada
        if foto:
            print("Procesando foto...")
            if existing_user.foto_path:
                delete_operador_foto(existing_user.foto_path)
            existing_user.foto_path = await save_operador_foto(foto)
            print(f"✓ Foto actualizada: {existing_user.foto_path}")
        
        # ✅ IMPORTANTE: Solo actualizar campos que NO son None
        # Construir diccionario con solo los campos que cambiaron
        update_dict = {}
        
        if username is not None:
            print(f"Actualizando username: {username}")
            update_dict["username"] = username.lower().strip()
        
        if email is not None:
            print(f"Actualizando email: {email}")
            update_dict["email"] = email.lower().strip()
        
        if cedula is not None:
            print(f"Actualizando cedula: {cedula}")
            update_dict["cedula"] = cedula
        
        if rol_id is not None:
            print(f"Actualizando rol_id: {rol_id}")
            update_dict["rol_id"] = rol_id
        
        if activo is not None:
            print(f"Actualizando activo: {activo}")
            update_dict["activo"] = activo
        
        if password is not None:
            print(f"Actualizando password")
            hashed = usuario_service.get_password_hash(password)
            update_dict["hashed_password"] = hashed
        
        print(f"Update dict: {update_dict}")
        
        # Si no hay nada para actualizar, retornar el usuario sin cambios
        if not update_dict and not foto:
            print("⚠️ No hay cambios para guardar")
            return existing_user
        
        # Actualizar usuario con solo los campos que proporcionaron
        for key, value in update_dict.items():
            setattr(existing_user, key, value)
        
        db.commit()
        db.refresh(existing_user)
        
        print(f"✓ Usuario actualizado exitosamente")
        
        # Log de auditoría
        await log_action(
            accion="actualizar_usuario",
            tabla_afectada="usuario",
            registro_id=existing_user.id,
            detalles={
                "username": existing_user.username,
                "campos_actualizados": list(update_dict.keys()),
                "con_foto": bool(foto)
            },
            request=request,
            db=db,
            current_user=current_user,
        )
        
        return existing_user
        
    except ValueError as e:
        db.rollback()
        logger.error(f"ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except IntegrityError as e:
        db.rollback()
        orig_error = getattr(e.orig, "pgcode", "N/A") if hasattr(e, "orig") else "N/A"
        orig_msg = str(e.orig) if hasattr(e, "orig") else str(e)
        logger.error(f"IntegrityError: Código={orig_error}, Mensaje='{orig_msg}'")
        
        if orig_error == "23505":  # UNIQUE violation
            if any(field in orig_msg.lower() for field in ["username", "email", "cedula"]):
                raise HTTPException(
                    status_code=409,
                    detail=f"Duplicado ya existe: {orig_msg[:100]}",
                )
        
        raise HTTPException(status_code=500, detail=f"Error BD: {orig_msg[:200]}")
        
    except Exception as e:
        db.rollback()
        tb = traceback.format_exc()
        logger.error(f"Error inesperado en update_user: {str(e)}\n{tb}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# ============================================================================
# DELETE - Eliminar usuario
# ============================================================================

@router.delete("/{usuario_id}", summary="Eliminar operador o supervisor")
async def delete_usuario(
    request: Request,
    usuario_id: int,
    current_user=Depends(require_supervisor_or_above),
    db: Session = Depends(get_db)
):
    """
    Eliminar (desactivar) un usuario.
    """
    usuario_service = UsuarioService(db)
    target_user = usuario_service.get(usuario_id)
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if target_user.id == current_user.id:
        raise HTTPException(status_code=403, detail="No puedes eliminarte a ti mismo")
    
    if current_user.rol_id == 2:  # SUPERVISOR
        if target_user.rol_id != 3:  # Solo puede borrar OPERADORES
            raise HTTPException(status_code=403, detail="SUPERVISOR solo puede eliminar OPERADORES")
    
    if target_user.rol_id == 4:
        raise HTTPException(status_code=403, detail="No se pueden eliminar AUDITORES por ahora")
    
    # Check integridad
    visitas_count = db.query(Visita).filter(Visita.persona_id == usuario_id).count()
    if visitas_count > 0:
        raise HTTPException(status_code=400, detail="Usuario tiene visitas asociadas; elimínalas primero")
    
    try:
        usuario_service.deactivate_user(usuario_id)
        db.commit()
        
        # Eliminar foto si existe
        if target_user.foto_path:
            delete_operador_foto(target_user.foto_path)
        
        # Log de auditoría
        await log_action(
            accion="eliminar_usuario",
            tabla_afectada="usuario",
            registro_id=usuario_id,
            detalles={
                "username": target_user.username,
                "rol_id": target_user.rol_id
            },
            request=request,
            db=db,
            current_user=current_user,
        )
        
        return {"detail": "Usuario desactivado correctamente"}
        
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error desactivando usuario: {exc}")
