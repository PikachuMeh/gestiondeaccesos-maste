# app/api/api_visitas.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.services.visita_service import VisitaService
from app.services.persona_service import PersonaService
from app.database import get_db
from app.models import Visita, EstadoVisita, TipoActividad, Persona, CentroDatos, Area
from sqlalchemy.sql import func
from app.schemas import (
    VisitaCreate,
    VisitaUpdate,
    VisitaResponse,
    VisitaListResponse,
    VisitaWithDetails,
    VisitaIngreso,
    VisitaSalida,
    VisitaTipoActividad,
)
from datetime import datetime, date
import random
from app.auth.api_permisos import require_operator_or_above, require_admin
from app.utils.log_utils import log_action  # Agregado

router = APIRouter(prefix="/visitas", tags=["visitas"])

def _codigo_9d() -> str:
    return str(random.randint(0, 999_999_999)).zfill(9)

def _generar_codigo_9d_unico(db: Session, max_intentos: int = 10) -> str:
    for _ in range(max_intentos):
        cod = _codigo_9d()
        if not db.query(Visita.id).filter(Visita.codigo_visita == cod).first():
            return cod
    return _codigo_9d()

def _ensure_fk_visita(
    db: Session,
    *,
    persona_id: Optional[int],
    centro_datos_id: Optional[int],
    estado_id: Optional[int] = None,
    tipo_actividad_id: Optional[int] = None,
    area_id: Optional[int] = None,
):
    if persona_id is not None and not db.query(Persona.id).filter(Persona.id == persona_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Persona no encontrada")
    if centro_datos_id is not None and not db.query(CentroDatos.id).filter(CentroDatos.id == centro_datos_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Centro de datos no encontrado")
    if estado_id is not None and not db.query(EstadoVisita.id_estado).filter(EstadoVisita.id_estado == estado_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado de visita no encontrado")
    if tipo_actividad_id is not None and not db.query(TipoActividad.id_tipo_actividad).filter(TipoActividad.id_tipo_actividad == tipo_actividad_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de actividad no encontrada")
    if area_id is not None and not db.query(Area.id).filter(Area.id == area_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Área no encontrada")

def _get_visita_or_404(db: Session, visita_id: int) -> Visita:
    v = (
        db.query(Visita)
        .options(
            joinedload(Visita.persona),
            joinedload(Visita.centro_datos),
            joinedload(Visita.estado),
            joinedload(Visita.actividad),
            joinedload(Visita.area)
        )
        .filter(Visita.id == visita_id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visita no encontrada")
    return v

@router.get("/", response_model=VisitaListResponse, summary="Listar visitas")
async def list_visitas(
    request: Request,  # Agregado
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a retornar"),
    search: Optional[str] = Query(None, description="Término de búsqueda"),
    persona_id: Optional[int] = Query(None, description="Filtrar por persona"),
    centro_datos_id: Optional[int] = Query(None, description="Filtrar por centro de datos"),
    area_id: Optional[int] = Query(None, description="Filtrar por área"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    fecha_desde: Optional[date] = Query(None, description="Fecha de inicio"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha de fin"),
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db),
):
    visita_service = VisitaService(db)
    persona_service = PersonaService(db)

    filters = {}
    if persona_id:
        filters['persona_id'] = persona_id
    if centro_datos_id:
        filters['centro_datos_id'] = centro_datos_id
    if area_id:
        filters['area_id'] = area_id
    if estado:
        filters['estado'] = estado

    fecha_desde_dt = None
    fecha_hasta_dt = None
    if fecha_desde:
        fecha_desde_dt = datetime.combine(fecha_desde, datetime.min.time())
    if fecha_hasta:
        fecha_hasta_dt = datetime.combine(fecha_hasta, datetime.max.time())

    if search:
        visitas = visita_service.search(search, ['codigo_visita', 'descripcion_actividad'])
        total = len(visitas)
        visitas = visitas[skip:skip + limit]
    else:
        visitas = visita_service.get_multi(skip=skip, limit=limit, filters=filters, order_by='fecha_programada', order_direction='desc')
        total = visita_service.count(filters)

    pages = (total + limit - 1) // limit
    current_page = (skip // limit) + 1
    response = VisitaListResponse(
        items=visitas,
        total=total,
        page=current_page,
        size=limit,
        pages=pages
    )
    # Logging
    filtros_detalles = {
        "search": search, "persona_id": persona_id, "centro_datos_id": centro_datos_id,
        "area_id": area_id, "estado": estado, "fecha_desde": fecha_desde, "fecha_hasta": fecha_hasta,
        "skip": skip, "limit": limit
    }
    await log_action(
        accion="consultar_visitas",
        tabla_afectada="visitas",
        detalles={"page": pages, "size": total, "filtros": filters},
        db=db,
        request=request,
        current_user=current_user
    )
    return response

@router.get("/persona/{persona_id}/historial", response_model=List[VisitaResponse])
async def get_historial_persona(
    request: Request,
    persona_id: int,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    persona = db.query(Persona.id).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada")

    visitas = (
        db.query(Visita)
        .options(
            joinedload(Visita.persona),
            joinedload(Visita.centro_datos),
            joinedload(Visita.estado),
            joinedload(Visita.actividad),
            joinedload(Visita.area),
        )
        .filter(Visita.persona_id == persona_id)
        .order_by(Visita.fecha_programada.desc())
        .all()
    )
    # Logging
    await log_action(
        accion="consultar_historial_visitas_persona",
        tabla_afectada="visitas",
        detalles={"persona_id": persona_id},
        request=request,
        db=db,
        current_user=current_user
    )
    return visitas

@router.get("/areas/{centro_datos_id}", response_model=List[dict])
async def obtener_areas_por_centro(
    request: Request,
    centro_datos_id: int,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    centro = db.query(CentroDatos.id).filter(CentroDatos.id == centro_datos_id).first()
    if not centro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de datos no encontrado")

    rows = db.query(Area).filter(Area.id_centro_datos == centro_datos_id).all()
    response = [{"id": row.id, "nombre": row.nombre, "id_centro_datos": row.id_centro_datos} for row in rows]
    # Logging
    await log_action(
        accion="consultar_areas_centro_datos",
        tabla_afectada="areas",
        detalles={"centro_datos_id": centro_datos_id},
        request=request,
        db=db,
        current_user=current_user
    )
    return response

@router.post("/", response_model=VisitaResponse, status_code=status.HTTP_201_CREATED)
async def create_visita(
    request: Request,
    payload: VisitaCreate,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    estado_id_in = getattr(payload, "estado_id", None)
    if estado_id_in is None:
        estado_prog = db.query(EstadoVisita.id_estado).filter(EstadoVisita.nombre_estado.ilike("PROGRAMADA")).first()
        if not estado_prog:
            raise HTTPException(status_code=500, detail="No existe el estado 'PROGRAMADA' en estado_visita")
        estado_id_in = estado_prog.id_estado

    _ensure_fk_visita(
        db,
        persona_id=payload.persona_id,
        centro_datos_id=payload.centro_datos_id,
        estado_id=estado_id_in,
        tipo_actividad_id=getattr(payload, "tipo_actividad_id", None),
        area_id=getattr(payload, "area_id", None),
    )

    try:
        data = payload.model_dump(exclude_unset=True)
        data["estado_id"] = estado_id_in
        if "activo" not in data:
            data["activo"] = True
        if not data.get("codigo_visita"):
            data["codigo_visita"] = _generar_codigo_9d_unico(db)

        visita = Visita(**data)
        db.add(visita)
        db.commit()
        db.refresh(visita)

        # Actualizar persona si existe
        persona = db.query(Persona).filter(Persona.id == payload.persona_id).first()
        if persona:
            persona.fecha_actualizacion = func.now()

        db.commit()

        # Logging
        await log_action(
            accion="crear_visita",
            tabla_afectada="visitas",
            registro_id=visita.id,
            detalles=data,
            request=request,
            db=db,
            current_user=current_user
        )
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando la visita: {exc}")

@router.get("/tipo_actividad")
async def obtener_tipo(
    request: Request,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    rows = db.query(TipoActividad).all()
    response = [{"id_tipo_actividad": row.id_tipo_actividad, "nombre_actividad": row.nombre_actividad} for row in rows]
    await log_action(
        accion="consultar_tipos_actividad",
        tabla_afectada="tipo_actividad",
        request=request,
        db=db,
        current_user=current_user
    )
    return response

@router.get("/{visita_id}", response_model=VisitaWithDetails)
async def get_visita(
    request: Request,
    visita_id: int,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    try:
        visita = _get_visita_or_404(db, visita_id)
        await log_action(
            accion="consultar_visita",
            tabla_afectada="visitas",
            registro_id=visita_id,
            request=request,
            db=db,
            current_user=current_user
        )
        return visita
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error obteniendo visita: {exc}")

@router.put("/{visita_id}", response_model=VisitaResponse)
async def update_visita(
    request: Request,
    visita_id: int,
    payload: VisitaUpdate,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
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
        data.pop("area_id", None)  # Si no existe en BD
        for k, v in data.items():
            setattr(visita, k, v)
        db.commit()
        db.refresh(visita)

        # Logging
        await log_action(
            accion="actualizar_visita",
            tabla_afectada="visitas",
            registro_id=visita_id,
            detalles=data,
            request=request,
            db=db,
            current_user=current_user
        )
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error actualizando visita: {exc}")

@router.post("/{visita_id}/ingreso", response_model=VisitaResponse)
async def registrar_ingreso(
    request: Request,
    visita_id: int,
    payload: VisitaIngreso,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    visita = _get_visita_or_404(db, visita_id)

    try:
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(visita, k, v)
        db.commit()
        db.refresh(visita)

        # Logging
        await log_action(
            accion="registrar_ingreso_visita",
            tabla_afectada="visitas",
            registro_id=visita_id,
            detalles=data,
            request=request,
            db=db,
            current_user=current_user
        )
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error registrando ingreso: {exc}")

@router.post("/{visita_id}/salida", response_model=VisitaResponse)
async def registrar_salida(
    request: Request,
    visita_id: int,
    payload: VisitaSalida,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    visita = _get_visita_or_404(db, visita_id)

    try:
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(visita, k, v)
        db.commit()
        db.refresh(visita)

        # Logging
        await log_action(
            accion="registrar_salida_visita",
            tabla_afectada="visitas",
            registro_id=visita_id,
            detalles=data,
            request=request,
            db=db,
            current_user=current_user
        )
        return visita
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error registrando salida: {exc}")

@router.delete("/{visita_id}")
async def delete_visita(
    request: Request,
    visita_id: int,
    current_user = Depends(require_admin),  # Solo ADMIN
    db: Session = Depends(get_db)
):
    visita = _get_visita_or_404(db, visita_id)

    if visita.estado_id != 1:  # Asume 1=Programada
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se pueden eliminar visitas en estado 'Programada'")

    try:
        db.delete(visita)
        db.commit()

        # Logging
        await log_action(
            accion="eliminar_visita",
            tabla_afectada="visitas",
            registro_id=visita_id,
            detalles={"codigo_visita": visita.codigo_visita},
            request=request,
            db=db,
            current_user=current_user
        )
        return {"detail": "Visita eliminada correctamente"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error eliminando visita: {exc}")
