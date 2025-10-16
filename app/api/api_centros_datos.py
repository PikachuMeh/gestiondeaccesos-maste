# app/api/centros_datos.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import CentroDatos
from app.schemas import (
    CentroDatosCreate, CentroDatosUpdate,
    CentroDatosResponse, CentroDatosListResponse
)

router = APIRouter(prefix="/centros-datos", tags=["centros-datos"])

def _get_cd_or_404(db: Session, cd_id: int) -> CentroDatos:
    cd = db.query(CentroDatos).filter(CentroDatos.id == cd_id).first()
    if not cd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de datos no encontrado")
    return cd

@router.post("/", response_model=CentroDatosResponse, status_code=status.HTTP_201_CREATED)
async def create_centro_datos(payload: CentroDatosCreate, db: Session = Depends(get_db)):
    try:
        cd = CentroDatos(**payload.model_dump())
        db.add(cd)
        db.commit()
        db.refresh(cd)
        return cd
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error creando centro de datos: {exc}")

@router.get("/", response_model=CentroDatosListResponse)
async def list_centros_datos(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    ciudad: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(CentroDatos)
    if ciudad:
        q = q.filter(CentroDatos.ciudad.ilike(f"%{ciudad}%"))

    try:
        total = q.count()
        if total == 0:
            return CentroDatosListResponse(items=[], total=0, page=page, size=size, pages=0)

        items = q.order_by(CentroDatos.nombre.asc()).offset((page - 1) * size).limit(size).all()
        pages = (total + size - 1) // size
        return CentroDatosListResponse(items=items, total=total, page=page, size=size, pages=pages)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error listando centros de datos: {exc}")

@router.get("/{cd_id}", response_model=CentroDatosResponse)
async def get_centro_datos(cd_id: int, db: Session = Depends(get_db)):
    return _get_cd_or_404(db, cd_id)

@router.put("/{cd_id}", response_model=CentroDatosResponse)
async def update_centro_datos(cd_id: int, payload: CentroDatosUpdate, db: Session = Depends(get_db)):
    cd = _get_cd_or_404(db, cd_id)
    try:
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(cd, k, v)
        db.commit()
        db.refresh(cd)
        return cd
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error actualizando centro de datos: {exc}")

@router.delete("/{cd_id}")
async def delete_centro_datos(cd_id: int, db: Session = Depends(get_db)):
    cd = _get_cd_or_404(db, cd_id)
    try:
        db.delete(cd)
        db.commit()
        return {"detail": "Centro de datos eliminado correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error eliminando centro de datos: {exc}")
