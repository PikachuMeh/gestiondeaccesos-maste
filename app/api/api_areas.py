"""
Módulo API para manejo de áreas en el sistema.
Define endpoints CRUD y listados con paginación para áreas.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app.models import Area, TipoArea, CentroDatos
from app.schemas import (
    AreaCreate,
    AreaUpdate,
    AreaResponse,
    AreaListResponse,
    AreaWithCentroDatos,
)

router = APIRouter(prefix="/areas", tags=["areas"])


def _get_area_or_404(db: Session, area_id: int) -> Area:
    area = (
        db.query(Area)
        .options(
            joinedload(Area.tipo),          # relación ORM
            joinedload(Area.centro_datos)   # relación ORM
        )
        .filter(Area.id == area_id)
        .first()
    )
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Área no encontrada"
        )
    return area


def _ensure_fk_exist(
    db: Session,
    *,
    tipo_id: Optional[int] = None,
    centro_datos_id: Optional[int] = None
) -> None:
    if tipo_id is not None:
        ok = db.query(TipoArea.id_tipo_area).filter(TipoArea.id_tipo_area == tipo_id).first()
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de área no encontrado"
            )
    if centro_datos_id is not None:
        ok = db.query(CentroDatos.id).filter(CentroDatos.id == centro_datos_id).first()
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Centro de datos no encontrado"
            )


@router.post("/", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
async def create_area(payload: AreaCreate, db: Session = Depends(get_db)):
    """
    Crea un área:
    - Recibe tipo_id y centro_datos_id (no objetos embebidos).
    - Valida FKs antes de insertar.
    - Valida capacidad_actual <= capacidad_maxima si ambas vienen.
    """
    if payload.capacidad_maxima is not None and payload.capacidad_actual is not None:
        if payload.capacidad_actual > payload.capacidad_maxima:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La capacidad actual no puede ser mayor que la capacidad máxima"
            )

    _ensure_fk_exist(db, tipo_id=payload.tipo_id, centro_datos_id=payload.centro_datos_id)

    try:
        area = Area(**payload.model_dump())
        db.add(area)
        db.commit()
        db.refresh(area)
        return area
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando el área: {exc}"
        )


@router.get("/", response_model=AreaListResponse)
async def list_areas(
    page: int = Query(1, ge=1, description="Página"),
    size: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    centro_datos_id: Optional[int] = Query(None, description="Filtrar por centro de datos"),
    tipo_id: Optional[int] = Query(None, description="Filtrar por tipo de área"),
    db: Session = Depends(get_db),
):
    """
    Lista áreas con paginación y filtros opcionales:
    - centro_datos_id
    - tipo_id
    """
    q = db.query(Area)
    if centro_datos_id is not None:
        q = q.filter(Area.centro_datos_id == centro_datos_id)
    if tipo_id is not None:
        q = q.filter(Area.tipo_id == tipo_id)

    try:
        total = q.count()
        if total == 0:
            return AreaListResponse(items=[], total=0, page=page, size=size, pages=0)

        items = (
            q.options(
                joinedload(Area.tipo),
                joinedload(Area.centro_datos)
            )
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )   

        return AreaListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando áreas: {exc}"
        )


@router.get("/{area_id}", response_model=AreaWithCentroDatos)
async def get_area(area_id: int, db: Session = Depends(get_db)):
    """
    Obtiene un área por ID, con relaciones precargadas.
    """
    try:
        return _get_area_or_404(db, area_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo el área: {exc}"
        )


@router.put("/{area_id}", response_model=AreaResponse)
async def update_area(area_id: int, payload: AreaUpdate, db: Session = Depends(get_db)):
    """
    Actualiza campos del área:
    - Valida FKs si vienen en el payload (tipo_id, centro_datos_id).
    - Solo aplica campos presentes (exclude_unset).
    - Valida capacidad_actual <= capacidad_maxima si ambas vienen.
    """
    area = _get_area_or_404(db, area_id)

    if payload.capacidad_maxima is not None and payload.capacidad_actual is not None:
        if payload.capacidad_actual > payload.capacidad_maxima:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La capacidad actual no puede ser mayor que la capacidad máxima"
            )

    if payload.tipo_id is not None or payload.centro_datos_id is not None:
        _ensure_fk_exist(db, tipo_id=payload.tipo_id, centro_datos_id=payload.centro_datos_id)

    try:
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(area, k, v)
        db.commit()
        db.refresh(area)
        return area
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando el área: {exc}"
        )


@router.delete("/{area_id}", status_code=status.HTTP_200_OK)
async def delete_area(area_id: int, db: Session = Depends(get_db)):
    """
    Elimina un área por ID.
    """
    area = _get_area_or_404(db, area_id)
    try:
        db.delete(area)
        db.commit()
        return {"detail": "Área eliminada correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando el área: {exc}"
        )
