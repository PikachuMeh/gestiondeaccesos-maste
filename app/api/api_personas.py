# app/api/api_personas.py
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
from app.utils.log_utils import log_action  # Logging principal (usa para todo)
# Removido: from app.services.Control_service import ControlService  # No needed si log_action maneja


router = APIRouter(prefix="/personas", tags=["personas"])


FOTO_DIR = Path("html/mi-app/src/img/personas")  # Ajusta si public/ o static/
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
    # Validaciones
    persona_existente = db.query(Persona).filter(Persona.documento_identidad == documento_identidad).first()
    if persona_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"La cédula {documento_identidad} ya está registrada")
    email_existente = db.query(Persona).filter(Persona.email == email).first()
    if email_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El correo {email} ya está registrado")

    try:
        foto_path = None
        file_name = None
        if foto and foto.filename:
            doc_limpio = documento_identidad.replace(" ", "_")
            file_extension = os.path.splitext(foto.filename)[1]
            file_name = f"{doc_limpio}{file_extension}"
            file_path = FOTO_DIR / file_name
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            foto_path = f"img/personas/{file_name}"  # CORREGIDO: Relative consistente (ajusta FE import)

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
            foto=foto_path or ""
        )
        db.add(persona)
        db.commit()
        db.refresh(persona)

        # CORREGIDO: Logging post-creación (usa log_action; remueve control_service duplicado)
        payload_detalles = {
            "nombre": nombre, "apellido": apellido, "documento_identidad": documento_identidad,
            "email": email, "empresa": empresa
        }
        await log_action(
            accion="crear_persona",  # CORREGIDO: No "borrar"
            tabla_afectada="personas",
            registro_id=persona.id,
            detalles=payload_detalles,
            request=request,
            db=db,
            current_user=current_user
        )
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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creando persona: {exc}")


@router.get("/", response_model=PersonaListResponse)
async def list_personas(
    request: Request,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    nombre: Optional[str] = Query(None),
    apellido: Optional[str] = Query(None),
    documento: Optional[str] = Query(None),
    current_user = Depends(require_operator_or_above),  # OK: Resuelto aquí
    db: Session = Depends(get_db)
):
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
        # Logging OK (current_user resuelto)
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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error listando personas: {exc}")


@router.get("/cedulas")  # CORREGIDO: Agrega current_user como parámetro
async def listar_cedulas(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_operator_or_above),  # AGREGADO: Resuelve Usuario
    limit: int = Query(5000, ge=1, le=5000000)
):
    rows = db.query(Persona.id, Persona.documento_identidad, Persona.nombre, Persona.apellido).order_by(Persona.documento_identidad).limit(limit).all()
    response = [{"id": r.id, "documento_identidad": r.documento_identidad, "nombre": r.nombre, "apellido": r.apellido} for r in rows]
    # Logging OK (current_user ahora válido)
    await log_action(
        accion="consultar_cedulas_personas",
        tabla_afectada="personas",
        detalles={"limit": limit},
        request=request,
        db=db,
        current_user=current_user  # CORREGIDO: No Depends aquí
    )
    return response


@router.get("/search")  # CORREGIDO: Agrega current_user como parámetro
async def buscar_personas_por_cedula(
    request: Request,
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user = Depends(require_operator_or_above),  # AGREGADO: Resuelve Usuario
    size: int = Query(50, ge=1, le=100),
):
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
    # Logging OK
    await log_action(
        accion="buscar_personas_cedula",
        tabla_afectada="personas",
        detalles={"q": q, "size": size},
        request=request,
        db=db,
        current_user=current_user  # CORREGIDO
    )
    return response


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(
    request: Request,
    persona_id: int,
    current_user = Depends(require_operator_or_above),  # OK
    db: Session = Depends(get_db)
):
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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error obteniendo persona: {exc}")


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    request: Request,
    persona_id: int,
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
    persona = _get_persona_or_404(db, persona_id)

    if email != persona.email:
        email_existente = db.query(Persona).filter(Persona.email == email, Persona.id != persona_id).first()
        if email_existente:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El correo {email} ya está registrado")

    try:
        # Updates
        persona.nombre = nombre
        persona.apellido = apellido
        persona.email = email
        persona.empresa = empresa
        persona.cargo = cargo
        persona.direccion = direccion
        persona.observaciones = observaciones
        persona.unidad = unidad
        if foto and foto.filename:
            if persona.foto:
                foto_anterior = FOTO_DIR / os.path.basename(persona.foto)
                if os.path.exists(foto_anterior):
                    os.remove(foto_anterior)
            doc_limpio = documento_identidad.replace(" ", "_")
            file_extension = os.path.splitext(foto.filename)[1]
            file_name = f"{doc_limpio}{file_extension}"
            file_path = FOTO_DIR / file_name
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            persona.foto = f"img/personas/{file_name}"  # CORREGIDO: Consistente

        db.commit()
        db.refresh(persona)

        # Logging
        payload_detalles = {
            "nombre": nombre, "apellido": apellido, "documento_identidad": documento_identidad,
            "email": email, "empresa": empresa
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
        return persona
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error actualizando persona: {exc}")


@router.delete("/{persona_id}")
async def delete_persona(
    request: Request,
    persona_id: int,
    current_user = Depends(require_supervisor_or_above),
    db: Session = Depends(get_db)
):
    persona = _get_persona_or_404(db, persona_id)

    visita_service = VisitaService(db)
    visitas_activas = visita_service.count({"persona_id": persona_id, "activo": True})
    if visitas_activas > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la persona tiene visitas activas pendientes. Elimínalas primero.")

    try:
        if persona.empresa == "SENIAT":
            raise HTTPException(status_code=403, detail="No se puede borrar personal interno (SENIAT)")
        if persona.foto:
            foto_file = FOTO_DIR / os.path.basename(persona.foto)
            if os.path.exists(foto_file):
                os.remove(foto_file)
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
        return {"detail": "Persona eliminada correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error eliminando persona: {exc}")
