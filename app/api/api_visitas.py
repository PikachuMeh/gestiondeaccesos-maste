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
import base64
from pathlib import Path
from fastapi.responses import StreamingResponse
import io
from app.utils.pdf_generator import generar_pdf_visita
from app.utils.telegram import enviar_notificacion_telegram, enviar_email_a_telegram
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
    """Obtener una visita específica con toda su información"""
    visita = db.query(Visita).filter(Visita.id == visita_id).first()
    if not visita:
        raise HTTPException(404, "Visita no encontrada")
    
    # ✅ ARREGLO: Validar que las listas JSON no estén vacías
    
    # 🔧 Procesar ÁREAS
    if hasattr(visita, 'areas_ids') and visita.areas_ids and isinstance(visita.areas_ids, list) and len(visita.areas_ids) > 0:
        try:
            areas = db.query(Area).filter(Area.id.in_(visita.areas_ids)).all()
            visita.areas_nombres = [area.nombre for area in areas]
        except Exception as e:
            print(f"⚠️ Error procesando áreas: {e}")
            visita.areas_nombres = []
    else:
        visita.areas_nombres = []
    
    # 🔧 Procesar CENTROS
    if hasattr(visita, 'centros_datos_ids') and visita.centros_datos_ids and isinstance(visita.centros_datos_ids, list) and len(visita.centros_datos_ids) > 0:
        try:
            centros = db.query(CentroDatos).filter(CentroDatos.id.in_(visita.centros_datos_ids)).all()
            visita.centros_nombres = [centro.nombre for centro in centros]
        except Exception as e:
            print(f"⚠️ Error procesando centros: {e}")
            visita.centros_nombres = []
    else:
        visita.centros_nombres = []
    
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
    """Obtener historial de visitas de una persona"""
    visitas = db.query(Visita).filter(
        Visita.persona_id == persona_id,
        Visita.activo == True
    ).options(
        joinedload(Visita.centro_datos),
        joinedload(Visita.area)
    ).all()
    
    # ✅ ARREGLO: Validar ANTES de usar .in_()
    for v in visitas:
        # Procesar ÁREAS
        if (hasattr(v, 'areas_ids') and 
            v.areas_ids and 
            isinstance(v.areas_ids, list) and 
            len(v.areas_ids) > 0):
            try:
                areas = db.query(Area).filter(Area.id.in_(v.areas_ids)).all()
                v.areas_nombres = [a.nombre for a in areas]
            except Exception as e:
                print(f"⚠️ Error procesando áreas: {e}")
                v.areas_nombres = []
        else:
            v.areas_nombres = []
        
        # Procesar CENTROS
        if (hasattr(v, 'centros_datos_ids') and 
            v.centros_datos_ids and 
            isinstance(v.centros_datos_ids, list) and 
            len(v.centros_datos_ids) > 0):
            try:
                centros = db.query(CentroDatos).filter(CentroDatos.id.in_(v.centros_datos_ids)).all()
                v.centros_nombres = [c.nombre for c in centros]
            except Exception as e:
                print(f"⚠️ Error procesando centros: {e}")
                v.centros_nombres = []
        else:
            v.centros_nombres = []
    
    await log_action(
        accion="consultar_historial_visitas_persona",
        tabla_afectada="visitas",
        detalles={"persona_id": persona_id},
        request=request,
        db=db,
        current_user=current_user
    )
    
    return visitas

## 2️⃣ ENDPOINT: list_visitas (LÍNEA ~130 aprox)
# Este endpoint lista visitas y también necesita el arreglo


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
    estado_id: Optional[int] = Query(None),
    tipo_actividad_id: Optional[int] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db),
):
    """Listar visitas con filtros"""
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
    
    # ✅ ARREGLO: Procesar todas las visitas de forma segura
    for v in visitas:
        # Procesar ÁREAS
        if (hasattr(v, 'areas_ids') and 
            v.areas_ids and 
            isinstance(v.areas_ids, list) and 
            len(v.areas_ids) > 0):
            try:
                areas = db.query(Area).filter(Area.id.in_(v.areas_ids)).all()
                v.areas_nombres = [a.nombre for a in areas]
            except Exception as e:
                print(f"⚠️ Error procesando áreas: {e}")
                v.areas_nombres = []
        else:
            v.areas_nombres = []
        
        # Procesar CENTROS
        if (hasattr(v, 'centros_datos_ids') and 
            v.centros_datos_ids and 
            isinstance(v.centros_datos_ids, list) and 
            len(v.centros_datos_ids) > 0):
            try:
                centros = db.query(CentroDatos).filter(CentroDatos.id.in_(v.centros_datos_ids)).all()
                v.centros_nombres = [c.nombre for c in centros]
            except Exception as e:
                print(f"⚠️ Error procesando centros: {e}")
                v.centros_nombres = []
        else:
            v.centros_nombres = []
    
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

@router.post("/", response_model=VisitaResponse, summary="Crear nueva visita")
async def crear_visita(
    request: Request,
    payload: VisitaCreate,
    current_user=Depends(require_operator_or_above),
    db: Session = Depends(get_db),
):
    """Crear nueva visita con información completa, PDF y notificaciones"""
    
    persona_id = payload.persona_id
    centro_datos_id = payload.centro_datos_id
    centro_datos_ids = payload.centro_datos_id or []
    area_ids = payload.area_id or []
    
    # Validar IDs
    _ensure_fk_visita(
        db,
        persona_id=persona_id,
        centro_datos_id=centro_datos_id,
        estado_id=getattr(payload, "estado_id", None),
        tipo_actividad_id=getattr(payload, "tipo_actividad_id", None),
    )
    
    try:
        # Obtener información COMPLETA de persona
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        
        # Obtener información COMPLETA del centro principal
        centro_datos = db.query(CentroDatos).filter(CentroDatos.id == centro_datos_id).first()
        if not centro_datos:
            raise HTTPException(status_code=404, detail="Centro de datos no encontrado")
        
        # Obtener todas las áreas si existen
        areas = []
        if area_ids:
            areas = db.query(Area).filter(Area.id.in_(area_ids)).all()
        
        # Obtener tipo de actividad
        tipo_actividad = None
        if payload.tipo_actividad_id:
            tipo_actividad = db.query(TipoActividad).filter(
                TipoActividad.id_tipo_actividad == payload.tipo_actividad_id
            ).first()
        
        # Obtener estado
        estado = None
        if payload.estado_id:
            estado = db.query(EstadoVisita).filter(
                EstadoVisita.id_estado == payload.estado_id
            ).first()
        
        # Generar código único
        codigo_visita = _generar_codigo_9d_unico(db)
        
        # Crear visita
        visita = Visita(
            codigo_visita=codigo_visita,
            persona_id=persona_id,
            centro_datos_id=centro_datos_id,
            estado_id=payload.estado_id or 1,
            tipo_actividad_id=payload.tipo_actividad_id,
            area_id=area_ids[0] if area_ids else None,
            descripcion_actividad=payload.descripcion_actividad,
            fecha_programada=payload.fecha_programada,
            duracion_estimada=payload.duracion_estimada,
            autorizado_por=payload.autorizado_por,
            motivo_autorizacion=payload.motivo_autorizacion,
            observaciones=payload.observaciones,
            centros_datos_ids=centro_datos_ids,
            areas_ids=area_ids,
        )
        
        db.add(visita)
        db.flush()
        db.commit()
        db.refresh(visita)
        
        # ✅ PREPARAR DATOS COMPLETOS PARA PDF
        visita_pdf_data = {
            'id': visita.id,
            'codigo_visita': visita.codigo_visita,
            'persona_id': persona_id,
            'persona_nombre': f"{persona.nombre} {persona.apellido}",
            'persona_cedula': persona.documento_identidad,
            'persona_email': persona.email,
            'persona_empresa': persona.empresa,
            'persona_cargo': persona.cargo or 'N/A',
            'foto_data': None,  # ← Cambio: BASE64, no URL
            'centro_id': centro_datos_id,
            'centro_nombre': centro_datos.nombre,
            'centro_direccion': centro_datos.direccion,
            'centro_ciudad': centro_datos.ciudad,
            'centro_codigo': centro_datos.codigo,
            'tipo_actividad': tipo_actividad.nombre_actividad if tipo_actividad else 'N/A',
            'descripcion_actividad': visita.descripcion_actividad,
            'areas_nombres': [area.nombre for area in areas],
            'estado': estado.nombre_estado if estado else 'N/A',
            'autorizado_por': visita.autorizado_por or 'N/A',
            'motivo_autorizacion': visita.motivo_autorizacion or 'N/A',
            'equipos_ingresados': visita.equipos_ingresados or 'N/A',
            'equipos_retirados': visita.equipos_retirados or 'N/A',
            'observaciones': visita.observaciones or 'N/A',
            'fecha_programada': visita.fecha_programada.strftime('%d/%m/%Y %H:%M') if visita.fecha_programada else 'N/A',
        }

        # ✅ AGREGAR FOTO EN BASE64 SI EXISTE
        if persona.foto:
            try:
                from pathlib import Path
                import base64
                
                # Construir ruta a la foto
                foto_path = Path(f"app/files/images/personas/{persona.foto}")
                
                if foto_path.exists():
                    with open(foto_path, 'rb') as f:
                        foto_bytes = f.read()
                        foto_base64 = base64.b64encode(foto_bytes).decode('utf-8')
                        visita_pdf_data['foto_data'] = foto_base64
                        print(f"✅ Foto cargada en BASE64: {len(foto_base64)} caracteres")
                else:
                    print(f"⚠️ Foto no encontrada en ruta: {foto_path}")
                    visita_pdf_data['foto_data'] = None
            except Exception as e:
                print(f"⚠️ Error leyendo foto: {e}")
                visita_pdf_data['foto_data'] = None
        else:
            print("⚠️ Persona sin foto (foto_url es None)")
        
        # 📄 Generar PDF
        try:
            pdf_bytes = generar_pdf_visita(visita_pdf_data)
            print(f"✅ PDF generado: {len(pdf_bytes)} bytes")
        except Exception as pdf_error:
            print(f"⚠️ Error generando PDF: {pdf_error}")
            pdf_bytes = None
        
        # 💬 Enviar a Telegram COMPLETO con PDF
        try:
            persona_nombre = f"{persona.nombre} {persona.apellido}"
            await enviar_notificacion_telegram(
                visita_data=visita_pdf_data,
                persona_nombre=persona_nombre,
                pdf_bytes=pdf_bytes
            )
            print("✅ Notificación Telegram enviada con PDF")
        except Exception as telegram_error:
            print(f"⚠️ Error en Telegram: {telegram_error}")
        
        # 📧 Enviar email con PDF
        try:
            from app.services.email_service import EmailService
            email_service = EmailService()
            
            email_persona = persona.email
            
            if email_persona:
                cuerpo_email = f"""
Estimado/a {persona.nombre} {persona.apellido},

✅ Se ha registrado exitosamente su visita al sistema SENIAT.

DETALLES DE LA VISITA:

• Código: {visita.codigo_visita}
• Centro: {centro_datos.nombre}
• Ubicación: {centro_datos.ciudad}
• Fecha/Hora: {visita_pdf_data['fecha_programada']}
• Tipo de Actividad: {visita_pdf_data['tipo_actividad']}
• Áreas Autorizadas: {', '.join(visita_pdf_data['areas_nombres']) if visita_pdf_data['areas_nombres'] else 'N/A'}
• Estado: {visita_pdf_data['estado']}

📎 Adjunto encontrará la Constancia Oficial en PDF con toda la información de su visita.

Saludos cordiales,
Sistema de Control de Accesos SENIAT
"""
                
                await email_service.send_email(
                    email=email_persona,
                    subject=f"Constancia de Visita SENIAT - {visita.codigo_visita}",
                    body=cuerpo_email,
                    attachment_bytes=pdf_bytes,
                    attachment_name=f"constancia_visita_{visita.codigo_visita}.pdf"
                )
                
                print(f"✅ Email+PDF enviado a {email_persona}")
                
                # 📲 Notificar a Telegram que el email fue enviado
                try:
                    await enviar_email_a_telegram(
                        correo_destinatario=email_persona,
                        asunto=f"Constancia de Visita SENIAT - {visita.codigo_visita}",
                        cuerpo=cuerpo_email,
                        pdf_bytes=pdf_bytes
                    )
                except Exception as e:
                    print(f"⚠️ No se pudo notificar email en Telegram: {e}")
            else:
                print("⚠️ Persona sin email - PDF no enviado por correo")
                
        except Exception as email_error:
            print(f"⚠️ Error en email/PDF: {email_error}")
        
        # 📝 LOGGING
        await log_action(
            "crear_visita",
            "visitas",
            {
                "visita_id": visita.id,
                "codigo": visita.codigo_visita,
                "persona_id": persona_id,
                "persona": f"{persona.nombre} {persona.apellido}",
                "centro_id": centro_datos_id,
                "centro": centro_datos.nombre,
                "areas": [a.nombre for a in areas],
                "pdf_generado": pdf_bytes is not None,
            },
            request,
            db,
            current_user
        )
        
        return visita
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error creando visita: {str(e)}")


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


# ===== NUEVO ENDPOINT: DESCARGAR PDF =====

@router.get("/{visita_id}/download-pdf", summary="Descargar PDF de visita")
async def download_pdf_visita(
    request: Request,
    visita_id: int,
    current_user = Depends(require_operator_or_above),
    db: Session = Depends(get_db)
):
    """Descargar PDF de una visita - Solo OPERADOR o ADMIN"""
    
    try:
        # Obtener visita
        visita = _get_visita_or_404(db, visita_id)
        
        # ✅ VALIDAR PERMISOS: Solo admin o creador
        if current_user.rol_id != 1 and getattr(visita, 'creado_por_id', None) != current_user.id:
            await log_action(
                accion="intento_descarga_pdf_sin_permiso",
                tabla_afectada="visitas",
                registro_id=visita_id,
                detalles={"usuario_id": current_user.id},
                request=request,
                db=db,
                current_user=current_user
            )
            raise HTTPException(status_code=403, detail="No tienes permiso para descargar este PDF")
        
        # Obtener información completa
        persona = db.query(Persona).filter(Persona.id == visita.persona_id).first()
        centro = db.query(CentroDatos).filter(CentroDatos.id == visita.centro_datos_id).first()
        tipo_actividad = db.query(TipoActividad).filter(TipoActividad.id_tipo_actividad == visita.tipo_actividad_id).first()

        if not persona or not centro:
            raise HTTPException(status_code=404, detail="Información incompleta de visita")
        
        # Preparar datos para PDF
        visita_pdf_data = {
            'codigo_visita': visita.codigo_visita,
            'persona_nombre': f"{persona.nombre} {persona.apellido}",
            'persona_cedula': persona.documento_identidad,
            'persona_email': persona.email,
            'persona_empresa': persona.empresa,
            'centro_nombre': centro.nombre,
            'centro_ciudad': centro.ciudad,
            'tipo_actividad': tipo_actividad.nombre_actividad,
            'descripcion_actividad': visita.descripcion_actividad,
            'areas_nombres': [a.nombre for a in visita.area] if visita.area else [],
            'autorizado_por': visita.autorizado_por or 'N/A',
            'fecha_programada': visita.fecha_programada.strftime('%d/%m/%Y %H:%M') if visita.fecha_programada else 'N/A',
            'foto_data': None
        }
        
        # ✅ Cargar foto en Base64 si existe
        if persona.foto:
            try:
                foto_path = Path(f"app/files/images/personas/{persona.foto}")
                
                if foto_path.exists():
                    with open(foto_path, 'rb') as f:
                        foto_bytes = f.read()
                        foto_base64 = base64.b64encode(foto_bytes).decode('utf-8')
                        visita_pdf_data['foto_data'] = foto_base64
                        print(f"✅ Foto cargada en Base64: {len(foto_base64)} caracteres")
                else:
                    print(f"⚠️ Foto no encontrada en ruta: {foto_path}")
                    visita_pdf_data['foto_data'] = None
                    
            except Exception as e:
                print(f"⚠️ Error leyendo foto: {e}")
                visita_pdf_data['foto_data'] = None
        else:
            print("⚠️ Persona sin foto registrada")
            visita_pdf_data['foto_data'] = None
        
        # Generar PDF
        pdf_bytes = generar_pdf_visita(visita_pdf_data)
        
        # Logging
        await log_action(
            accion="descargar_pdf_visita",
            tabla_afectada="visitas",
            registro_id=visita_id,
            detalles={"codigo": visita.codigo_visita},
            request=request,
            db=db,
            current_user=current_user
        )
        
        # Retornar PDF
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=constancia_{visita.codigo_visita}.pdf"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en download_pdf: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")