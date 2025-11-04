"""
Módulo API para manejo de personas (visitantes/usuarios externos).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional
import shutil
import os
from pathlib import Path
from sqlalchemy import func, cast, Integer,asc
from app.database import get_db
from app.models import Persona
from app.schemas import (
    PersonaUpdate,
    PersonaResponse,
    PersonaListResponse,
)
from app.auth.api_permisos import require_admin, require_operator_or_above
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import asc
router = APIRouter(prefix="/personas", tags=["personas"])

# Ruta donde se guardarán las fotos
FOTO_DIR = Path("html/mi-app/src/img/personas")
FOTO_DIR.mkdir(parents=True, exist_ok=True)


def _get_persona_or_404(db: Session, persona_id: int) -> Persona:
    p = db.query(Persona).filter(Persona.id == persona_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada")
    return p


@router.post("/", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(
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
    db: Session = Depends(get_db)
):
    """
    Crea una nueva persona. Valida que la cédula no esté duplicada.
    La foto se guarda en html/mi-app/src/img/personas/
    """
    current_user = Depends(require_operator_or_above)  # NUEVO: Requiere OPERADOR+
    # VALIDACIÓN: Verificar si la cédula ya existe
    persona_existente = db.query(Persona).filter(
        Persona.documento_identidad == documento_identidad
    ).first()
    
    if persona_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La cédula {documento_identidad} ya está registrada"
        )
    
    # VALIDACIÓN: Verificar si el email ya existe
    email_existente = db.query(Persona).filter(
        Persona.email == email
    ).first()
    
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El correo {email} ya está registrado"
        )
    
    try:
        foto_path = None
        file_name = None
        
        # Si hay una foto, guardarla
        if foto and foto.filename:
            # Limpiar el documento para usarlo como nombre de archivo
            doc_limpio = documento_identidad.replace(" ", "_")
            
            file_extension = os.path.splitext(foto.filename)[1]
            
            # Nombre del archivo: 12345678.jpg
            file_name = f"{doc_limpio}{file_extension}"
            
            # Ruta completa donde se guardará
            file_path = FOTO_DIR / file_name
            
            # Guardar el archivo en el sistema
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            
            # Guardar solo la ruta relativa en la BD para que React pueda usarla
            foto_path = f"/src/img/personas/{file_name}"
        
        # Crear objeto Persona
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
            foto=foto_path or ""  # Si no hay foto, guardar string vacío
        )
        
        db.add(persona)
        db.commit()
        db.refresh(persona)
        return persona
    
    except IntegrityError as exc:
        db.rollback()
        # Si es error de secuencia, intentar resetearla
        if "duplicate key value violates unique constraint" in str(exc) and "_pkey" in str(exc):
            # Resetear secuencia
            db.execute("""
                SELECT setval(
                    pg_get_serial_sequence('sistema_gestiones.personas', 'id'),
                    COALESCE((SELECT MAX(id) FROM sistema_gestiones.personas), 0) + 1,
                    false
                );
            """)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Secuencia desincronizada. Por favor intente nuevamente."
            )
        
    except HTTPException:
        # Si es una excepción HTTP (validación), re-lanzarla
        raise
    except Exception as exc:
        db.rollback()
        # Si hubo error y se guardó el archivo, eliminarlo
        if file_name and os.path.exists(FOTO_DIR / file_name):
            os.remove(FOTO_DIR / file_name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando persona: {exc}"
        )


@router.get("/", response_model=PersonaListResponse)
async def list_personas(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    nombre: Optional[str] = Query(None),
    apellido: Optional[str] = Query(None),
    documento: Optional[str] = Query(None),
    db: Session = Depends(get_db),
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
        return PersonaListResponse(
            items=items, total=total, page=page, size=size, pages=(total + size - 1) // size
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error listando personas: {exc}")




@router.get("/cedulas")
async def listar_cedulas(
    db: Session = Depends(get_db),
    limit: int = Query(5000, ge=1, le=5000000)
):
    rows = []
    rows = (
        db.query(Persona.id, Persona.documento_identidad, Persona.nombre, Persona.apellido)
          .order_by(Persona.documento_identidad).all()
    )

    return [
        {
            "id": r.id,
            "documento_identidad": r.documento_identidad,
            "nombre": r.nombre,
            "apellido": r.apellido,
        } for r in rows
    ]



@router.get("/search")
async def buscar_personas_por_cedula(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    size: int = Query(50, ge=1, le=100)
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
    return [
        {
            "id": r.id,
            "documento_identidad": r.documento_identidad,
            "nombre": r.nombre,
            "apellido": r.apellido,
        } for r in rows
    ]


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: int, db: Session = Depends(get_db)):
    try: 
        return _get_persona_or_404(db, persona_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error obteniendo persona: {exc}")


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
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
    db: Session = Depends(get_db)
):
    current_user = Depends(require_operator_or_above)  # NUEVO
    """
    Actualiza una persona existente. Permite cambiar la foto.
    """
    persona = _get_persona_or_404(db, persona_id)
    
    try:
        # Validar si el email cambió y ya existe
        if email != persona.email:
            email_existente = db.query(Persona).filter(
                Persona.email == email,
                Persona.id != persona_id
            ).first()
            
            if email_existente:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"El correo {email} ya está registrado"
                )
        
        # Actualizar campos
        persona.nombre = nombre
        persona.apellido = apellido
        persona.email = email
        persona.empresa = empresa
        persona.cargo = cargo
        persona.direccion = direccion
        persona.observaciones = observaciones
        persona.unidad = unidad
        
        # Manejar foto si se envió una nueva
        if foto and foto.filename:
            # Eliminar foto anterior si existe
            if persona.foto:
                foto_anterior = FOTO_DIR / os.path.basename(persona.foto)
                if os.path.exists(foto_anterior):
                    os.remove(foto_anterior)
            
            # Guardar nueva foto
            doc_limpio = documento_identidad.replace(" ", "_")
            file_extension = os.path.splitext(foto.filename)[1]
            file_name = f"{doc_limpio}{file_extension}"
            file_path = FOTO_DIR / file_name
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            
            persona.foto = f"/src/img/personas/{file_name}"
        
        db.commit()
        db.refresh(persona)
        return persona
        
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando persona: {exc}"
        )


@router.delete("/{persona_id}")
async def delete_persona(persona_id: int, db: Session = Depends(get_db)):
    persona = _get_persona_or_404(db, persona_id)
    current_user = Depends(require_operator_or_above)  # NUEVO
    try:
        if persona.empresa == "SENIAT":  # Asume "personal" son de SENIAT
            raise HTTPException(403, detail="No se puede borrar personal interno")
        # Eliminar foto si existe
        if persona.foto:
            foto_file = FOTO_DIR / os.path.basename(persona.foto)
            if os.path.exists(foto_file):
                os.remove(foto_file)
        
        db.delete(persona)
        db.commit()
        return {"detail": "Persona eliminada correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error eliminando persona: {exc}")
