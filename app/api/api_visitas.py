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

router = APIRouter(prefix="/visitas", tags=["visitas"])


def _ensure_fk_visita(
    db: Session,
    *,
    persona_id: Optional[int],
    centro_datos_id: Optional[int],
    estado_id: Optional[int] = None,
    tipo_actividad_id: Optional[int] = None
):
    # Validaciones contra las PK/columnas reales del modelo
    if persona_id is not None and not db.query(Persona.id).filter(Persona.id == persona_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Persona no encontrada")
    if centro_datos_id is not None and not db.query(CentroDatos.id).filter(CentroDatos.id == centro_datos_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Centro de datos no encontrado")
    # OJO: en tu modelo actual EstadoVisita usa id_estado; si en tu models.py final usas idestado, cambia aquí a EstadoVisita.idestado
    if estado_id is not None and not db.query(EstadoVisita.id_estado).filter(EstadoVisita.id_estado == estado_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado de visita no encontrado")
    # OJO: en tu modelo actual TipoActividad usa id_tipo_actividad; si en tu models.py final usas idtipoactividad, cambia aquí.
    if tipo_actividad_id is not None and not db.query(TipoActividad.id_tipo_actividad).filter(
        TipoActividad.id_tipo_actividad == tipo_actividad_id
    ).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de actividad no encontrado")


def _get_visita_or_404(db: Session, visita_id: int) -> Visita:
    v = (
        db.query(Visita)
        .options(
            joinedload(Visita.persona),
            joinedload(Visita.centro_datos),
            joinedload(Visita.estado),
            joinedload(Visita.actividad),
        )
        .filter(Visita.id == visita_id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visita no encontrada")
    return v


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
        visita = Visita(**payload.dict())
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


@router.get("/", response_model=VisitaListResponse)
async def list_visitas(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    estado_id: Optional[int] = Query(None),
    tipo_actividad_id: Optional[int] = Query(None),
    persona_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Visita)
    # Alinear filtros a los nombres de columnas reales del modelo
    # Si en tu modelo actual las columnas son estadoid/tipoactividadid/personaid usa esas
    if estado_id is not None:
        q = q.filter(Visita.estado_id == estado_id)  # usar el nombre real en la tabla
    if tipo_actividad_id is not None:
        q = q.filter(Visita.tipo_actividad_id == tipo_actividad_id)
    if persona_id is not None:
        q = q.filter(Visita.persona_id == persona_id)

    try:
        total = q.count()
        if total == 0:
            return VisitaListResponse(items=[], total=0, page=page, size=size, pages=0)

        items = (
            q.options(
                joinedload(Visita.persona),
                joinedload(Visita.centro_datos),
                joinedload(Visita.estado),
                joinedload(Visita.actividad),
            )
            # Alinear orden a la columna real (fecha_programada vs fechaprogramada)
            .order_by(Visita.fecha_programada.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )
        return VisitaListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando visitas: {exc}"
        )


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
        tipo_actividad_id=payload.tipo_actividad_id if hasattr(payload, "tipo_actividad_id") else None,
    )
    try:
        data = payload.dict(exclude_unset=True)
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
        data = payload.dict(exclude_unset=True)
        for k, v in data.items():
            setattr(visita, k, v)
        db.commit()
        db.refresh(visita)
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registrando ingreso: {exc}"
        )


@router.post("/{visita_id}/salida", response_model=VisitaResponse)
async def registrar_salida(visita_id: int, payload: VisitaSalida, db: Session = Depends(get_db)):
    visita = _get_visita_or_404(db, visita_id)
    try:
        data = payload.dict(exclude_unset=True)
        for k, v in data.items():
            setattr(visita, k, v)
        db.commit()
        db.refresh(visita)
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registrando salida: {exc}"
        )


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
