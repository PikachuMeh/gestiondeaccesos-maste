"""
Módulo API para manejo de visitas.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app.models import Visita, EstadoVisita, TipoActividad, Persona, CentroDatos
from app.schemas import (
    VisitaCreate,
    VisitaUpdate,
    VisitaResponse,
    VisitaListResponse,
    VisitaWithDetails,
    VisitaIngreso,
    VisitaSalida,
)

import random

router = APIRouter(prefix="/visitas", tags=["visitas"])

# ----------------------------
# Utilidades
# ----------------------------

def _codigo_9d() -> str:
    # 9 dígitos con cero a la izquierda si hace falta
    return str(random.randint(0, 999_999_999)).zfill(9)

def _generar_codigo_9d_unico(db: Session, max_intentos: int = 10) -> str:
    for _ in range(max_intentos):
        cod = _codigo_9d()
        if not db.query(Visita.id).filter(Visita.codigo_visita == cod).first():
            return cod
    # improbable, pero garantiza retorno
    return _codigo_9d()

# ----------------------------
# Validaciones de FKs
# ----------------------------

def _ensure_fk_visita(
    db: Session,
    *,
    persona_id: Optional[int],
    centro_datos_id: Optional[int],
    estado_id: Optional[int] = None,
    tipo_actividad_id: Optional[int] = None
):
    if persona_id is not None and not db.query(Persona.id).filter(Persona.id == persona_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Persona no encontrada")
    if centro_datos_id is not None and not db.query(CentroDatos.id).filter(CentroDatos.id == centro_datos_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Centro de datos no encontrado")
    if estado_id is not None and not db.query(EstadoVisita.id_estado).filter(EstadoVisita.id_estado == estado_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado de visita no encontrado")
    if tipo_actividad_id is not None and not db.query(TipoActividad.id_tipo_actividad).filter(
        TipoActividad.id_tipo_actividad == tipo_actividad_id
    ).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de actividad no encontrada")

# ----------------------------
# Helpers de obtención
# ----------------------------

def _get_visita_or_404(db: Session, visita_id: int) -> Visita:
    v = (
        db.query(Visita)
        .options(
            joinedload(Visita.persona),
            joinedload(Visita.centro_datos),
            # Si mantienes estas relaciones en el modelo, déjalas:
            joinedload(Visita.estado),
            joinedload(Visita.actividad),
        )
        .filter(Visita.id == visita_id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visita no encontrada")
    return v

# ----------------------------
# Endpoints
# ----------------------------

@router.post("/", response_model=VisitaResponse, status_code=status.HTTP_201_CREATED)
async def create_visita(payload: VisitaCreate, db: Session = Depends(get_db)):
    _ensure_fk_visita(
        db,
        persona_id=payload.persona_id,
        centro_datos_id=payload.centro_datos_id,
        estado_id=getattr(payload, "estado_id", None),
        tipo_actividad_id=getattr(payload, "tipo_actividad_id", None),
    )
    try:
        data = payload.model_dump(exclude_unset=True)

        # Elimina claves que no existen físicamente en la tabla (si aplica)
        data.pop("area_id", None)

        # Generar SIEMPRE un código de 9 dígitos si no viene
        if not data.get("codigo_visita"):
            data["codigo_visita"] = _generar_codigo_9d_unico(db)

        visita = Visita(**data)
        db.add(visita)
        db.commit()
        db.refresh(visita)
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando la visita: {exc}"
        )

@router.post("/", response_model=VisitaResponse, status_code=status.HTTP_201_CREATED)
async def create_visita(payload: VisitaCreate, db: Session = Depends(get_db)):
    # Resolver estado por defecto si no viene
    estado_id_in = getattr(payload, "estado_id", None)
    if estado_id_in is None:
        estado_prog = (
            db.query(EstadoVisita.id_estado)
              .filter(EstadoVisita.nombre_estado.ilike("PROGRAMADA"))
              .first()
        )
        if not estado_prog:
            raise HTTPException(status_code=500, detail="No existe el estado 'PROGRAMADA' en estado_visita")
        estado_id_in = estado_prog.id_estado

    _ensure_fk_visita(
        db,
        persona_id=payload.persona_id,
        centro_datos_id=payload.centro_datos_id,
        estado_id=estado_id_in,
        tipo_actividad_id=getattr(payload, "tipo_actividad_id", None),
    )

    try:
        data = payload.model_dump(exclude_unset=True)
        data["estado_id"] = estado_id_in
        data.pop("area_id", None)  # si no existe en la tabla

        if not data.get("codigo_visita"):
            data["codigo_visita"] = _generar_codigo_9d_unico(db)

        visita = Visita(**data)
        db.add(visita)
        db.commit()
        db.refresh(visita)
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando la visita: {exc}")


@router.get("/{visita_id}", response_model=VisitaWithDetails)
async def get_visita(visita_id: int, db: Session = Depends(get_db)):
    try:
        return _get_visita_or_404(db, visita_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo visita: {exc}"
        )

@router.put("/{visita_id}", response_model=VisitaResponse)
async def update_visita(visita_id: int, payload: VisitaUpdate, db: Session = Depends(get_db)):
    visita = _get_visita_or_404(db, visita_id)
    _ensure_fk_visita(
        db,
        persona_id=payload.persona_id,
        centro_datos_id=payload.centro_datos_id,
        estado_id=getattr(payload, "estado_id", None),
        tipo_actividad_id=getattr(payload, "tipo_actividad_id", None),
    )
    try:
        data = payload.model_dump(exclude_unset=True)
        data.pop("area_id", None)  # si no existe en BD

        for k, v in data.items():
            setattr(visita, k, v)

        db.commit()
        db.refresh(visita)
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando visita: {exc}"
        )

@router.post("/{visita_id}/ingreso", response_model=VisitaResponse)
async def registrar_ingreso(visita_id: int, payload: VisitaIngreso, db: Session = Depends(get_db)):
    visita = _get_visita_or_404(db, visita_id)
    try:
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(visita, k, v)
        db.commit()
        db.refresh(visita)
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error registrando ingreso: {exc}")
        

@router.post("/{visita_id}/salida", response_model=VisitaResponse)
async def registrar_salida(visita_id: int, payload: VisitaSalida, db: Session = Depends(get_db)):
    visita = _get_visita_or_404(db, visita_id)
    try:
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(visita, k, v)
        db.commit()
        db.refresh(visita)
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error registrando salida: {exc}")

@router.delete("/{visita_id}")
async def delete_visita(visita_id: int, db: Session = Depends(get_db)):
    visita = _get_visita_or_404(db, visita_id)
    try:
        db.delete(visita)
        db.commit()
        return {"detail": "Visita eliminada correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando visita: {exc}"
        )
