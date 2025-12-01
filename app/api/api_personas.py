from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form, Request
from sqlalchemy.orm import Session
from typing import Optional
import shutil
import os
from pathlib import Path
from sqlalchemy import func, asc
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import Persona
from app.schemas import (
    PersonaUpdate,
    PersonaResponse,
    PersonaListResponse,
)
from app.services.visita_service import VisitaService
from app.auth.api_permisos import require_operator_or_above, require_supervisor_or_above
from app.utils.log_utils import log_action


router = APIRouter(prefix="/personas", tags=["personas"])

FOTO_DIR = Path("html/mi-app/src/img/personas")
FOTO_DIR.mkdir(parents=True, exist_ok=True)


def _get_persona_or_404(db: Session, persona_id: int) -> Persona:
    p = db.query(Persona).filter(Persona.id == persona_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada")
    return p


@router.post("/", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(
    request: Request,
    nombre: str = Form(...),
    apellido: str = Form(...),
    documento_identidad: str = Form(...),
    email: str = Form(...),
    empresa: str = Form(...),
    cargo: str = Form(None),
    direccion: str = Form(...),
    observaciones: str = Form(None),
    unidad: str = Form(None),
    foto: UploadFile = File(None),
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    """Crear una nueva persona con foto opcional"""
    # Validaciones
    persona_existente = db.query(Persona).filter(Persona.documento_identidad == documento_identidad).first()
    if persona_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"La cédula {documento_identidad} ya está registrada")
    email_existente = db.query(Persona).filter(Persona.email == email).first()
    if email_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El correo {email} ya está registrado")

    try:
        file_name = None
        if foto and foto.filename:
            doc_limpio = documento_identidad.replace(" ", "_")
            file_extension = os.path.splitext(foto.filename)[1]
            file_name = f"{doc_limpio}{file_extension}"
            file_path = FOTO_DIR / file_name
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            print(f"[INFO] Foto guardada: {file_name}")

        persona = Persona(
            nombre=nombre,
            apellido=apellido,
            documento_identidad=documento_identidad,
            email=email,
            empresa=empresa,
            cargo=cargo,
            direccion=direccion,
            observaciones=observaciones,
            unidad=unidad,
            foto=file_name or ""
        )
        db.add(persona)
        db.commit()
        db.refresh(persona)

        # Logging
        payload_detalles = {
            "nombre": nombre, "apellido": apellido, "documento_identidad": documento_identidad,
            "email": email, "empresa": empresa
        }
        await log_action(
            accion="crear_persona",
            tabla_afectada="personas",
            registro_id=persona.id,
            detalles=payload_detalles,
            request=request,
            db=db,
            current_user=current_user
        )
        print(f"[OK] Persona {persona.id} creada exitosamente")
        return persona

    except IntegrityError as exc:
        db.rollback()
        if "duplicate key value violates unique constraint" in str(exc) and "_pkey" in str(exc):
            db.execute("""
            SELECT setval(
                pg_get_serial_sequence('sistema_gestiones.personas', 'id'),
                COALESCE((SELECT MAX(id) FROM sistema_gestiones.personas), 0) + 1,
                false
            );
            """)
            db.commit()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Secuencia desincronizada. Por favor intente nuevamente.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error de integridad en base de datos")
    except Exception as exc:
        db.rollback()
        if file_name and os.path.exists(FOTO_DIR / file_name):
            os.remove(FOTO_DIR / file_name)
        print(f"[ERROR] Creando persona: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creando persona: {exc}")


@router.get("/", response_model=PersonaListResponse)
async def list_personas(
    request: Request,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    nombre: Optional[str] = Query(None),
    apellido: Optional[str] = Query(None),
    documento: Optional[str] = Query(None),
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    """Listar personas con paginación y filtros"""
    q = db.query(Persona)
    if nombre:
        q = q.filter(Persona.nombre.ilike(f"%{nombre}%"))
    if apellido:
        q = q.filter(Persona.apellido.ilike(f"%{apellido}%"))
    if documento:
        q = q.filter(Persona.documento_identidad.ilike(f"%{documento}%"))

    try:
        total = q.count()
        if total == 0:
            return PersonaListResponse(items=[], total=0, page=page, size=size, pages=0)
        items = q.offset((page - 1) * size).limit(size).all()
        response = PersonaListResponse(
            items=items, total=total, page=page, size=size, pages=(total + size - 1) // size
        )
        # Logging
        filtros_detalles = {"nombre": nombre, "apellido": apellido, "documento": documento, "page": page, "size": size}
        await log_action(
            accion="consultar_lista_personas",
            tabla_afectada="personas",
            detalles=filtros_detalles,
            request=request,
            db=db,
            current_user=current_user
        )
        return response
    except Exception as exc:
        print(f"[ERROR] Listando personas: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error listando personas: {exc}")


@router.get("/cedulas")
async def listar_cedulas(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_operator_or_above),
    limit: int = Query(5000, ge=1, le=5000000)
):
    """Listar todas las cédulas de personas"""
    try:
        rows = db.query(Persona.id, Persona.documento_identidad, Persona.nombre, Persona.apellido).order_by(Persona.documento_identidad).limit(limit).all()
        response = [{"id": r.id, "documento_identidad": r.documento_identidad, "nombre": r.nombre, "apellido": r.apellido} for r in rows]
        
        await log_action(
            accion="consultar_cedulas_personas",
            tabla_afectada="personas",
            detalles={"limit": limit},
            request=request,
            db=db,
            current_user=current_user
        )
        return response
    except Exception as exc:
        print(f"[ERROR] Listando cédulas: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error listando cédulas: {exc}")


@router.get("/search")
async def buscar_personas_por_cedula(
    request: Request,
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user = Depends(require_operator_or_above),
    size: int = Query(50, ge=1, le=100),
):
    """Buscar personas por cédula"""
    try:
        q_digits = "".join(ch for ch in q if ch.isdigit())
        if not q_digits:
            return []
        rows = (
            db.query(Persona.id, Persona.documento_identidad, Persona.nombre, Persona.apellido)
            .filter(Persona.documento_identidad.ilike(f"{q_digits}%"))
            .order_by(Persona.documento_identidad)
            .limit(size)
            .all()
        )
        response = [{"id": r.id, "documento_identidad": r.documento_identidad, "nombre": r.nombre, "apellido": r.apellido} for r in rows]
        
        await log_action(
            accion="buscar_personas_cedula",
            tabla_afectada="personas",
            detalles={"q": q, "size": size},
            request=request,
            db=db,
            current_user=current_user
        )
        return response
    except Exception as exc:
        print(f"[ERROR] Buscando personas: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error buscando personas: {exc}")


# ✅ RUTA ESPECÍFICA PARA FOTOS - DEBE IR ANTES DE /{persona_id}
@router.get("/files/{filename}")
async def get_foto_persona(filename: str):
    """
    ✅ ENDPOINT PARA SERVIR FOTOS
    GET /api/v1/personas/foto/{filename}
    
    IMPORTANTE: Esta ruta DEBE estar ANTES de /{persona_id}
    porque FastAPI procesa rutas en orden de especificidad.
    """
    file_path = FOTO_DIR / filename
    
    print(f"[DEBUG] Buscando foto: {file_path}")
    print(f"[DEBUG] Existe: {file_path.exists()}")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Foto no encontrada: {filename}")
    
    from fastapi.responses import FileResponse
    return FileResponse(file_path, media_type="image/jpeg")


# ✅ RUTA GENÉRICA - VA DESPUÉS DE RUTAS ESPECÍFICAS
@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(
    request: Request,
    persona_id: int,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    """Obtener los detalles de una persona por ID"""
    try:
        persona = _get_persona_or_404(db, persona_id)
        await log_action(
            accion="consultar_persona",
            tabla_afectada="personas",
            registro_id=persona_id,
            request=request,
            db=db,
            current_user=current_user
        )
        return persona
    except Exception as exc:
        print(f"[ERROR] Obteniendo persona: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error obteniendo persona: {exc}")


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    request: Request,
    persona_id: int,
    nombre: Optional[str] = Form(None),
    apellido: Optional[str] = Form(None),
    documento_identidad: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    empresa: Optional[str] = Form(None),
    cargo: Optional[str] = Form(None),
    direccion: Optional[str] = Form(None),
    observaciones: Optional[str] = Form(None),
    unidad: Optional[str] = Form(None),
    foto: UploadFile = File(None),
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    """
    ✅ ACTUALIZAR PERSONA - SOLO CAMPOS PROPORCIONADOS
    Solo actualiza los campos que fueron enviados (no None).
    La foto se actualiza solo si es proporcionada.
    """
    persona = _get_persona_or_404(db, persona_id)

    # ✅ Solo validar email si fue proporcionado y cambió
    if email is not None and email != persona.email:
        email_existente = db.query(Persona).filter(Persona.email == email, Persona.id != persona_id).first()
        if email_existente:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El correo {email} ya está registrado")

    try:
        # ✅ IMPORTANTE: Solo actualizar campos que NO son None
        if nombre is not None:
            persona.nombre = nombre
        if apellido is not None:
            persona.apellido = apellido
        if email is not None:
            persona.email = email
        if empresa is not None:
            persona.empresa = empresa
        if cargo is not None:
            persona.cargo = cargo
        if direccion is not None:
            persona.direccion = direccion
        if observaciones is not None:
            persona.observaciones = observaciones
        if unidad is not None:
            persona.unidad = unidad

        # ✅ Procesar foto si fue proporcionada
        if foto and foto.filename:
            print(f"[INFO] Procesando foto: {foto.filename}")
            
            # Eliminar foto anterior si existe
            if persona.foto:
                foto_anterior = FOTO_DIR / persona.foto
                if os.path.exists(foto_anterior):
                    os.remove(foto_anterior)
                    print(f"[INFO] Foto anterior eliminada: {foto_anterior}")
            
            # Guardar nueva foto
            doc_limpio = documento_identidad.replace(" ", "_") if documento_identidad else persona.documento_identidad.replace(" ", "_")
            file_extension = os.path.splitext(foto.filename)[1]
            file_name = f"{doc_limpio}{file_extension}"
            file_path = FOTO_DIR / file_name
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            
            persona.foto = file_name  # ✅ Guardar solo el filename
            print(f"[INFO] Foto guardada: {file_name}")

        db.commit()
        db.refresh(persona)

        # Logging
        payload_detalles = {
            "nombre": persona.nombre,
            "apellido": persona.apellido,
            "documento_identidad": persona.documento_identidad,
            "email": persona.email,
            "empresa": persona.empresa,
            "con_foto": bool(foto)
        }
        await log_action(
            accion="actualizar_persona",
            tabla_afectada="personas",
            registro_id=persona_id,
            detalles=payload_detalles,
            request=request,
            db=db,
            current_user=current_user
        )
        print(f"[OK] Persona {persona_id} actualizada exitosamente")
        return persona
        
    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Actualizando persona: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error actualizando persona: {exc}")


@router.delete("/{persona_id}")
async def delete_persona(
    request: Request,
    persona_id: int,
    current_user = Depends(require_supervisor_or_above),
    db: Session = Depends(get_db)
):
    """
    Eliminar una persona y su foto asociada.
    Solo supervisores y administradores pueden eliminar.
    No se pueden eliminar personas con visitas activas.
    """
    persona = _get_persona_or_404(db, persona_id)

    visita_service = VisitaService(db)
    visitas_activas = visita_service.count({"persona_id": persona_id, "activo": True})
    if visitas_activas > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la persona tiene visitas activas pendientes. Elimínalas primero.")

    try:
        if persona.empresa == "SENIAT":
            raise HTTPException(status_code=403, detail="No se puede borrar personal interno (SENIAT)")
        
        # Eliminar foto si existe
        if persona.foto:
            foto_file = FOTO_DIR / persona.foto
            if os.path.exists(foto_file):
                os.remove(foto_file)
                print(f"[INFO] Foto eliminada: {foto_file}")
        
        db.delete(persona)
        db.commit()

        # Logging
        await log_action(
            accion="eliminar_persona",
            tabla_afectada="personas",
            registro_id=persona_id,
            detalles={"documento_identidad": persona.documento_identidad, "nombre": persona.nombre},
            request=request,
            db=db,
            current_user=current_user
        )
        print(f"[OK] Persona {persona_id} eliminada exitosamente")
        return {"detail": "Persona eliminada correctamente"}
    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Eliminando persona: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Error eliminando persona: {exc}")

