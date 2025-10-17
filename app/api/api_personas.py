"""
Módulo API para manejo de personas (visitantes/usuarios externos).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import Persona
from app.schemas import (
    PersonaCreate,
    PersonaUpdate,
    PersonaResponse,
    PersonaListResponse,
)


router = APIRouter(prefix="/personas", tags=["personas"])

def _get_persona_or_404(db: Session, persona_id: int) -> Persona:
    p = db.query(Persona).filter(Persona.id == persona_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada")
    return p

@router.post("/", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(payload: PersonaCreate, db: Session = Depends(get_db)):
    try:
        persona = Persona(**payload.dict())
        db.add(persona)
        db.commit()
        db.refresh(persona)
        return persona
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error creando persona: {exc}")

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

# app/api/personas.py

@router.get("/cedulas")
async def listar_cedulas(
    db: Session = Depends(get_db),
    limit: int = Query(5000, ge=1, le=50000)
):
    rows = (
        db.query(Persona.id, Persona.documento_identidad, Persona.nombre, Persona.apellido)
          .order_by(Persona.documento_identidad)
          .limit(limit)
          .all()
    )
    # FastAPI serializa tuplas; si prefieres dicts:
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
    # Solo prefijo numérico; sanitiza a dígitos
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
async def update_persona(persona_id: int, payload: PersonaUpdate, db: Session = Depends(get_db)):
    persona = _get_persona_or_404(db, persona_id)
    try:
        data = payload.dict(exclude_unset=True)
        for k, v in data.items():
            setattr(persona, k, v)
        db.commit()
        db.refresh(persona)
        return persona
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error actualizando persona: {exc}")

@router.delete("/{persona_id}")
async def delete_persona(persona_id: int, db: Session = Depends(get_db)):
    persona = _get_persona_or_404(db, persona_id)
    try:
        db.delete(persona)
        db.commit()
        return {"detail": "Persona eliminada correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error eliminando persona: {exc}")
