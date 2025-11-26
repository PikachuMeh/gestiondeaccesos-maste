# app/api/api_visitas.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.services.visita_service import VisitaService
from app.services.persona_service import PersonaService
from app.database import get_db
from app.models import Visita, EstadoVisita, TipoActividad, Persona, CentroDatos, Area,CentroAreaVisita
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
from app.utils.telegram import enviar_notificacion_telegram
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

@router.get("/centros-datos", response_model=List[dict])
async def listar_centros_datos(
    db: Session = Depends(get_db),
    current_user=Depends(require_operator_or_above)
):
    """Listar todos los centros de datos activos"""
    centros = db.query(CentroDatos).filter(CentroDatos.activo == True).all()
    return [{"id": c.id, "nombre": c.nombre} for c in centros]

@router.get("/tipo_actividad")
async def obtener_tipo(db: Session = Depends(get_db)):
    tipos = db.query(TipoActividad).all()
    return [{"id_tipo_actividad": t.id_tipo_actividad, "nombre_actividad": t.nombre_actividad} for t in tipos]

@router.get("/{visita_id}", response_model=VisitaResponse)
def get_visita(visita_id: int, db: Session = Depends(get_db)):
    visita = db.query(Visita).filter(Visita.id == visita_id).first()
    if not visita:
        raise HTTPException(404, "Visita no encontrada")
    
    # ✅ INNER JOIN: areas_ids → nombres reales
    if visita.areas_ids:
        areas = db.query(Area).filter(Area.id.in_(visita.areas_ids)).all()
        visita.areas_nombres = [area.nombre for area in areas]  # ["TELECOM", "SERVIDORES"]
    
    if visita.centros_datos_ids:
        centros = db.query(CentroDatos).filter(CentroDatos.id.in_(visita.centros_datos_ids)).all()
        visita.centros_nombres = [centro.nombre for centro in centros]  # ["Chacao"]
    
    return visita

@router.get("/", response_model=VisitaListResponse, summary="Listar visitas")
async def list_visitas(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    persona_id: Optional[int] = Query(None),
    centro_datos_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    estado_id: Optional[int] = Query(None, description="Filtrar por estado"),
    tipo_actividad_id: Optional[int] = Query(None, description="Filtrar por tipo actividad"),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db),
):
    visita_service = VisitaService(db)
    persona_service = PersonaService(db)

    filters = {}
    if persona_id:
        filters["persona_id"] = persona_id
    if centro_datos_id:
        filters["centro_datos_id"] = centro_datos_id
    if area_id:
        filters["area_id"] = area_id
    if tipo_actividad_id:                      # ← NUEVO
        filters["tipo_actividad_id"] = tipo_actividad_id
    if estado_id:
        filters["estado_id"] = estado_id

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
        "area_id": area_id, "estado_id": estado_id, "fecha_desde": fecha_desde, "fecha_hasta": fecha_hasta,
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
    visitas = db.query(Visita).filter(
        Visita.persona_id == persona_id,
        Visita.activo == True
    ).options(
        joinedload(Visita.centro_datos),
        joinedload(Visita.area)
    ).all()
    

    for v in visitas:
        if v.areas_ids:
            areas = db.query(Area).filter(Area.id.in_(v.areas_ids)).all()
            v.areas_nombres = [a.nombre for a in areas]
        if v.centros_datos_ids:
            centros = db.query(CentroDatos).filter(CentroDatos.id.in_(v.centros_datos_ids)).all()
            v.centros_nombres = [c.nombre for c in centros]

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
async def obtener_areas_por_centro(centro_datos_id: int, db: Session = Depends(get_db)):
    areas = db.query(Area).filter(Area.id_centro_datos == centro_datos_id).all()
    return [{"id": a.id, "nombre": a.nombre} for a in areas]


@router.get("/", response_model=VisitaListResponse, summary="Listar visitas")
async def list_visitas(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    persona_id: Optional[int] = Query(None),
    centro_datos_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    estado_id: Optional[int] = Query(None, description="Filtrar por estado"),
    tipo_actividad_id: Optional[int] = Query(None, description="Filtrar por tipo actividad"),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db),
):
    visita_service = VisitaService(db)
    persona_service = PersonaService(db)
    
    filters = {}
    if persona_id:
        filters["persona_id"] = persona_id
    if centro_datos_id:
        filters["centro_datos_id"] = centro_datos_id
    if area_id:
        filters["area_id"] = area_id
    if tipo_actividad_id:
        filters["tipo_actividad_id"] = tipo_actividad_id
    if estado_id:
        filters["estado_id"] = estado_id

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

    await log_action(
        accion="consultar_visitas",
        tabla_afectada="visitas",
        detalles={"page": pages, "size": total, "filtros": filters},
        db=db,
        request=request,
        current_user=current_user
    )
    return response

@router.post("/", response_model=VisitaResponse, status_code=status.HTTP_201_CREATED)
async def create_visita(
    request: Request,
    payload: dict,
    current_user=Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    """Crear visita con Telegram + PDF + Email automático"""
    
    # ✅ EXTRAER Y VALIDAR
    persona_id = payload.get('persona_id')
    centro_datos_id = payload.get('centro_datos_id')
    centro_datos_ids = payload.get('centro_datos_ids', [centro_datos_id])
    tipo_actividad_id = payload.get('tipo_actividad_id')
    area_ids = payload.get('area_ids', [])
    estado_id = payload.get('estado_id', 1)

    if not all([persona_id, centro_datos_id, tipo_actividad_id]):
        raise HTTPException(400, detail="Faltan persona_id, centro_datos_id o tipo_actividad_id")

    # ✅ VALIDAR FKs
    _ensure_fk_visita(
        db,
        persona_id=persona_id,
        centro_datos_id=centro_datos_id,
        estado_id=estado_id,
        tipo_actividad_id=tipo_actividad_id
    )
    
    area_id = area_ids[0] if area_ids else None
    if area_id:
        _ensure_fk_visita(db, persona_id=persona_id, centro_datos_id=centro_datos_id, area_id=area_id)

    try:
        # Crear visita
        data = {
            "persona_id": persona_id,
            "centro_datos_id": centro_datos_id,
            "estado_id": estado_id,
            "tipo_actividad_id": tipo_actividad_id,
            "area_id": area_id,
            "descripcion_actividad": payload.get('descripcion_actividad', ''),
            "fecha_programada": payload['fecha_programada'],
            "activo": True,
            "codigo_visita": _generar_codigo_9d_unico(db),
        }
        
        # Campos JSON opcionales
        if centro_datos_ids:
            data['centros_datos_ids'] = centro_datos_ids
        if area_ids:
            data['areas_ids'] = area_ids
            
        for field in ['autorizado_por', 'equipos_ingresados', 'observaciones']:
            if payload.get(field):
                data[field] = payload.get(field)

        # Crear y guardar
        visita = Visita(**data)
        db.add(visita)
        db.commit()
        db.refresh(visita)

        # ✅ CARGAR DATOS POR QUERIES SEPARADOS (100% SEGURO)
        # 👤 Persona
        persona = db.query(Persona).filter(Persona.id == visita.persona_id).first()
        persona_nombre = "N/A"
        persona_cedula = "N/A"
        email_persona = None
        if persona:
            persona_nombre = f"{persona.nombre or ''} {persona.apellido or ''}".strip()
            persona_cedula = getattr(persona, 'cedula', 'N/A') or 'N/A'
            email_persona = getattr(persona, 'email', None)

        # 🏢 Centro
        centro_datos = db.query(CentroDatos).filter(CentroDatos.id == visita.centro_datos_id).first()
        
        # 📊 Áreas
        areas_nombres = []
        if hasattr(visita, 'areas_ids') and visita.areas_ids:
            areas = db.query(Area).filter(Area.id.in_(visita.areas_ids)).all()
            areas_nombres = [area.nombre for area in areas]
        
        # 📈 Centros múltiples
        centros_nombres = []
        if hasattr(visita, 'centros_datos_ids') and visita.centros_datos_ids:
            centros = db.query(CentroDatos).filter(CentroDatos.id.in_(visita.centros_datos_ids)).all()
            centros_nombres = [centro.nombre for centro in centros]

        # 🔔 TELEGRAM
        try:
            await enviar_notificacion_telegram({
                "id": visita.id,
                "codigovisita": visita.codigo_visita,
                "centronombre": centros_nombres[0] if centros_nombres else (centro_datos.nombre if centro_datos else "N/A"),
                "fechaprogramada": visita.fecha_programada.strftime("%d/%m/%Y %H:%M") if visita.fecha_programada else "N/A",
                "descripcionactividad": visita.descripcion_actividad or "N/A",
                "areasnombres": areas_nombres
            }, persona_nombre)
            print("✅ Telegram enviado")
        except Exception as telegram_error:
            print(f"⚠️ Telegram falló: {telegram_error}")

        # 📧 PDF + EMAIL
        try:
            from app.utils.pdf_generator import generar_pdf_visita
            from app.services.email_service import email_service
            
            visita_pdf_data = {
                "id": visita.id,
                "codigovisita": visita.codigo_visita,
                "persona_nombre": persona_nombre,
                "persona_cedula": persona_cedula,
                "centronombre": centros_nombres[0] if centros_nombres else (centro_datos.nombre if centro_datos else "N/A"),
                "fechaprogramada": visita.fecha_programada.strftime("%d/%m/%Y %H:%M") if visita.fecha_programada else "N/A",
                "descripcionactividad": visita.descripcion_actividad or "N/A",
                "areasnombres": areas_nombres,
                "estado": "Programada",
                "autorizadopor": getattr(visita, 'autorizado_por', 'No especificado'),
                "observaciones": getattr(visita, 'observaciones', 'Ninguna'),
            }
            
            # Generar PDF
            pdf_bytes = generar_pdf_visita(visita_pdf_data)
            
            # Enviar email
            if email_persona:
                await email_service.send_email(
                    email=email_persona,
                    subject=f"Constancia de Visita SENIAT - {visita.codigo_visita}",
                    body=f"""
Estimado/a {persona_nombre},

✅ Se ha registrado exitosamente su visita al sistema SENIAT.

DETALLES:
• Código: {visita.codigo_visita}
• Centro: {visita_pdf_data['centronombre']}
• Fecha/Hora: {visita_pdf_data['fechaprogramada']}
• Áreas: {', '.join(visita_pdf_data['areasnombres']) if areas_nombres else 'N/A'}

📎 Adjunto encontrará la **Constancia Oficial en PDF**.

Saludos cordiales,
Sistema de Control de Accesos SENIAT
                    """,
                    attachment_bytes=pdf_bytes,
                    attachment_name=f"constancia_visita_{visita.codigo_visita}.pdf"
                )
                print(f"✅ Email+PDF enviado a {email_persona}")
            else:
                print("⚠️ Persona sin email - PDF no enviado")
                
        except Exception as email_error:
            print(f"⚠️ Email/PDF falló (visita OK): {email_error}")

        # 📝 LOGGING
        await log_action(
            "crear_visita", "visitas",
            {
                "visita_id": visita.id, 
                "persona_id": persona_id, 
                "centro_id": centro_datos_id,
                "centros": centro_datos_ids, 
                "areas": area_ids
            },
            request, db, current_user
        )

        return visita

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error creando visita: {str(e)}")



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


@router.get("/centros-datos/{centro_id}", response_model=dict)
async def get_centro_datos(
    request: Request,
    centro_id: int,
    current_user=Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    centro = db.query(CentroDatos).filter(CentroDatos.id == centro_id).first()
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado")
    
    return {
        "id": centro.id,
        "nombre": centro.nombre,
        "codigo": centro.codigo,
        "direccion": centro.direccion,
        "ciudad": centro.ciudad
    }


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
