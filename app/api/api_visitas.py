# app/api/api_visitas.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request,APIRouter, Depends, HTTPException, Query, status,Request, Form, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, cast, String, func
from typing import Optional, List, Annotated
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
import shutil
import os
import json
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

def obtener_imagen_persona_base64(foto_nombre: str) -> str:
    """
    Busca la imagen en la carpeta del frontend y la retorna en Base64.
    """
    if not foto_nombre:
        return None

    # Limpiamos el nombre (ej: "foto.png" en lugar de "rutas/foto.png")
    filename = os.path.basename(foto_nombre)

    # ✅ LISTA DE RUTAS DONDE BUSCAR LA FOTO
    # La primera es la ruta específica que me indicaste
    base_dirs = [
        # Ruta prioritaria (Frontend)
        Path("html/mi-app/src/img/personas"),
        
        # Rutas de respaldo (por si mueves carpetas en el futuro)
        Path("app/files/images/personas"),
        Path("static/images/personas"),
    ]

    foto_path = None
    
    # Recorremos las rutas hasta encontrar el archivo
    for directory in base_dirs:
        # .resolve() convierte la ruta relativa en absoluta para evitar errores
        possible_path = (directory / filename).resolve()
        
        if possible_path.exists():
            foto_path = possible_path
            break
    
    # Si encontramos la foto, la convertimos a Base64
    if foto_path:
        try:
            with open(foto_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                print(f"✅ Imagen encontrada: {foto_path}")
                return encoded_string
        except Exception as e:
            print(f"⚠️ Error leyendo archivo de imagen: {e}")
            return None
    else:
        print(f"⚠️ Imagen no encontrada en: {[str(p) for p in base_dirs]}")
        return None

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
    search: Optional[str] = Query(None),  # nombre o cédula
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
    """
    Listar visitas con filtros.

    Búsqueda (search):
    - Si es numérico (>=3 dígitos) => documento_identidad (cédula) que empieza por esos dígitos.
    - Si no => nombre de la persona que contenga el texto.
    """

    query = db.query(Visita).options(
        joinedload(Visita.persona),
        joinedload(Visita.centro_datos),
        joinedload(Visita.actividad),
        joinedload(Visita.estado),
    )

    # Filtro de búsqueda por cédula/nombre (NO código)
    if search:
        search_clean = search.strip()
        is_numeric = search_clean.replace(" ", "").isdigit()

        query = query.join(Persona)

        if is_numeric and len(search_clean) >= 3:
            query = query.filter(Persona.documento_identidad.ilike(f"{search_clean}%"))
        

    # Filtros específicos
    if persona_id:
        query = query.filter(Visita.persona_id == persona_id)
    if centro_datos_id:
        query = query.filter(Visita.centro_datos_id == centro_datos_id)
    if area_id:
        query = query.filter(Visita.area_id == area_id)
    if tipo_actividad_id:
        query = query.filter(Visita.tipo_actividad_id == tipo_actividad_id)
    if estado_id:
        query = query.filter(Visita.estado_id == estado_id)

    # Filtros de fecha
    if fecha_desde:
        fecha_desde_dt = datetime.combine(fecha_desde, datetime.min.time())
        query = query.filter(Visita.fecha_programada >= fecha_desde_dt)
    if fecha_hasta:
        fecha_hasta_dt = datetime.combine(fecha_hasta, datetime.max.time())
        query = query.filter(Visita.fecha_programada <= fecha_hasta_dt)

    # Conteo y paginación
    total = query.count()
    visitas = (
        query.order_by(Visita.fecha_programada.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Procesar nombres de áreas/centros (arrays JSON)
    for v in visitas:
        if (
            hasattr(v, "areas_ids")
            and v.areas_ids
            and isinstance(v.areas_ids, list)
            and len(v.areas_ids) > 0
        ):
            try:
                areas = db.query(Area).filter(Area.id.in_(v.areas_ids)).all()
                v.areas_nombres = [a.nombre for a in areas]
            except Exception as e:
                print(f"⚠️ Error procesando áreas: {e}")
                v.areas_nombres = []
        else:
            v.areas_nombres = []

        if (
            hasattr(v, "centros_datos_ids")
            and v.centros_datos_ids
            and isinstance(v.centros_datos_ids, list)
            and len(v.centros_datos_ids) > 0
        ):
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

    filtros_detalles = {
        "search": search,
        "persona_id": persona_id,
        "centro_datos_id": centro_datos_id,
        "area_id": area_id,
        "estado_id": estado_id,
        "tipo_actividad_id": tipo_actividad_id,
        "fecha_desde": str(fecha_desde) if fecha_desde else None,
        "fecha_hasta": str(fecha_hasta) if fecha_hasta else None,
        "page": current_page,
        "total": total,
    }

    await log_action(
        accion="consultar_visitas",
        tabla_afectada="visitas",
        detalles=filtros_detalles,
        db=db,
        request=request,
        current_user=current_user,
    )

    return VisitaListResponse(
        items=visitas,
        total=total,
        page=current_page,
        size=limit,
        pages=pages,
    )

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

@router.get("/areas/{centro_datos_id}", response_model=List[dict])
async def obtener_areas_por_centro(centro_datos_id: int, db: Session = Depends(get_db)):
    areas = db.query(Area).filter(Area.id_centro_datos == centro_datos_id).all()
    return [{"id": a.id, "nombre": a.nombre} for a in areas]



@router.post("/", response_model=VisitaResponse, summary="Crear nueva visita")
async def crear_visita(
    request: Request,
    payload: Annotated[VisitaCreate, Depends(VisitaCreate.as_form)],
    centro_datos_ids: Optional[str] = Form(None),
    area_ids: Optional[str] = Form(None),
    foto: Optional[UploadFile] = File(None),  # <--- Recibimos el archivo
    current_user=Depends(require_operator_or_above),
    db: Session = Depends(get_db),
):
    """Crear nueva visita con foto actualizada, PDF y notificaciones"""
    
    persona_id = payload.persona_id
    centro_datos_id = payload.centro_datos_id
    
    # 1. Validaciones y Parsing de JSONs (Igual que antes)
    try:
        centros_ids_list = json.loads(centro_datos_ids) if centro_datos_ids else [centro_datos_id]
    except Exception:
        centros_ids_list = [centro_datos_id]
    
    try:
        areas_ids_list = json.loads(area_ids) if area_ids else ([payload.area_id] if payload.area_id else [])
    except Exception:
        areas_ids_list = ([payload.area_id] if payload.area_id else [])

    _ensure_fk_visita(db, persona_id=persona_id, centro_datos_id=centro_datos_id, 
                      estado_id=payload.estado_id, tipo_actividad_id=payload.tipo_actividad_id)
    
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona: raise HTTPException(404, "Persona no encontrada")
    
    centro_datos = db.query(CentroDatos).filter(CentroDatos.id == centro_datos_id).first()
    if not centro_datos: raise HTTPException(404, "Centro no encontrado")

    # =======================================================================
    # 📸 PASO NUEVO: PROCESAR Y GUARDAR LA FOTO SUBIDA (SI EXISTE)
    # =======================================================================
    foto_base64 = None
    
    if foto:
        try:
            # 1. Crear directorio si no existe
            base_path = Path("app/files/images/personas")
            base_path.mkdir(parents=True, exist_ok=True)
            
            # 2. Generar nombre de archivo (Usamos la cédula para estandarizar)
            # Extensión original o .jpg por defecto
            ext = foto.filename.split('.')[-1] if '.' in foto.filename else "jpg"
            nuevo_nombre = f"{persona.documento_identidad}.{ext}"
            file_path = base_path / nuevo_nombre
            
            # 3. Guardar archivo en disco
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            
            print(f"✅ Nueva foto guardada: {file_path}")
            
            # 4. Actualizar BD
            persona.foto = nuevo_nombre
            db.add(persona)
            db.commit()
            db.refresh(persona)
            
            # 5. Leer bytes para el PDF (inmediato)
            with open(file_path, "rb") as f:
                foto_bytes = f.read()
                foto_base64 = base64.b64encode(foto_bytes).decode('utf-8')
                
        except Exception as e:
            print(f"⚠️ Error guardando nueva foto: {e}")
            # Si falla, intentamos seguir sin foto nueva
            foto_base64 = None
            
    # Si no se subió foto nueva, intentamos cargar la que ya tenía
    if not foto_base64 and persona.foto:
        foto_base64 = obtener_imagen_persona_base64(persona.foto)

    # =======================================================================
    # FIN PROCESO FOTO - CONTINUA CREACIÓN DE VISITA
    # =======================================================================

    codigo_visita = _generar_codigo_9d_unico(db)
    
    # Obtener objetos relacionados
    areas = db.query(Area).filter(Area.id.in_(areas_ids_list)).all() if areas_ids_list else []
    
    tipo_actividad = None
    if payload.tipo_actividad_id:
        tipo_actividad = db.query(TipoActividad).filter(TipoActividad.id_tipo_actividad == payload.tipo_actividad_id).first()
        
    estado = None
    if payload.estado_id:
        estado = db.query(EstadoVisita).filter(EstadoVisita.id_estado == payload.estado_id).first()

    visita = Visita(
        codigo_visita=codigo_visita,
        persona_id=persona_id,
        centro_datos_id=centro_datos_id,
        estado_id=payload.estado_id or 1,
        tipo_actividad_id=payload.tipo_actividad_id,
        area_id=areas_ids_list[0] if areas_ids_list else None,
        descripcion_actividad=payload.descripcion_actividad,
        fecha_programada=payload.fecha_programada,
        duracion_estimada=payload.duracion_estimada,
        autorizado_por=payload.autorizado_por,
        motivo_autorizacion=payload.motivo_autorizacion,
        observaciones=payload.observaciones,
        centros_datos_ids=centros_ids_list,
        areas_ids=areas_ids_list,
        equipos_ingresados=payload.equipos_ingresados,
        equipos_retirados=payload.equipos_retirados,
    )
    
    db.add(visita)
    db.flush()
    db.commit()
    db.refresh(visita)
    
    # ✅ PREPARAR DATOS PARA PDF (Con la foto ya procesada)
    visita_pdf_data = {
        'id': visita.id,
        'codigo_visita': visita.codigo_visita,
        'persona_id': persona_id,
        'persona_nombre': f"{persona.nombre} {persona.apellido}",
        'persona_cedula': persona.documento_identidad,
        'persona_email': persona.email,
        'persona_empresa': persona.empresa,
        'persona_cargo': persona.cargo or 'N/A',
        'foto_data': foto_base64,  # <--- Aquí va la foto (nueva o vieja)
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
    
    # 📄 Generar PDF
    pdf_bytes = None
    try:
        pdf_bytes = generar_pdf_visita(visita_pdf_data)
        print(f"✅ PDF generado: {len(pdf_bytes)} bytes")
    except Exception as pdf_error:
        print(f"⚠️ Error generando PDF: {pdf_error}")

    # 💬 Enviar a Telegram
    try:
        persona_nombre = f"{persona.nombre} {persona.apellido}"
        await enviar_notificacion_telegram(
            visita_data=visita_pdf_data,
            persona_nombre=persona_nombre,
            pdf_bytes=pdf_bytes
        )
    except Exception as e:
        print(f"⚠️ Error Telegram: {e}")

    # 📧 Email (lógica existente)
    try:
        from app.services.email_service import EmailService
        email_service = EmailService()
        if persona.email:
            cuerpo_email = f"""
            Estimado/a {persona.nombre} {persona.apellido},
            ✅ Visita registrada: {visita.codigo_visita}
            Centro: {centro_datos.nombre}
            Fecha: {visita_pdf_data['fecha_programada']}
            """
            await email_service.send_email(
                email=persona.email,
                subject=f"Constancia Visita - {visita.codigo_visita}",
                body=cuerpo_email,
                attachment_bytes=pdf_bytes,
                attachment_name=f"constancia_{visita.codigo_visita}.pdf"
            )
    except Exception as e:
        print(f"⚠️ Error Email: {e}")

    # Log
    await log_action(
        "crear_visita", "visitas", registro_id=visita.id,
        detalles={"codigo": visita.codigo_visita, "con_foto": bool(foto_base64)},
        request=request, db=db, current_user=current_user
    )
    
    return visita

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


@router.get("/{visita_id}/download-pdf", summary="Descargar PDF de visita")
async def download_pdf_visita(
    request: Request,
    visita_id: int,
    current_user = Depends(require_operator_or_above), # Asumido
    db: Session = Depends(get_db)
):
    """
    Genera y descarga el PDF de la visita incluyendo la foto de la persona.
    """
    try:
        # ---------------------------------------------------------
        # PASO 1: Obtener datos completos con JOIN (SQLAlchemy)
        # ---------------------------------------------------------
        visita = (
            db.query(Visita)
            .options(
                joinedload(Visita.persona),      
                joinedload(Visita.centro_datos),  
                joinedload(Visita.actividad),     
                joinedload(Visita.estado)        
            )
            .filter(Visita.id == visita_id)
            .first()
        )
        
        if not visita:
            raise HTTPException(status_code=404, detail="Visita no encontrada")

        persona = visita.persona
        centro = visita.centro_datos

        # ---------------------------------------------------------
        # PASO 2: Procesar la FOTO
        # ---------------------------------------------------------
        foto_base64 = None
        if persona and persona.foto:
            # Llama a la función que busca y codifica la imagen
            foto_base64 = obtener_imagen_persona_base64(persona.foto)

        # ---------------------------------------------------------
        # PASO 3: Procesar Áreas (Manejo de JSON de IDs - Asumido)
        # ---------------------------------------------------------
        areas_nombres = []
        # Asumo que visita.areas_ids es una lista de IDs (JSON o similar)
        if hasattr(visita, 'areas_ids') and visita.areas_ids and isinstance(visita.areas_ids, list):
            areas_db = db.query(Area).filter(Area.id.in_(visita.areas_ids)).all()
            areas_nombres = [a.nombre for a in areas_db]
        # O si la relación es directa
        elif hasattr(visita, 'area') and visita.area: 
             areas_nombres = [visita.area.nombre]


        # ---------------------------------------------------------
        # PASO 4: Preparar Diccionario para el Generador PDF
        # ---------------------------------------------------------
        visita_pdf_data = {
            # ... otros datos
            'codigo_visita': visita.codigo_visita,
            'fecha_programada': visita.fecha_programada.strftime('%d/%m/%Y %H:%M') if visita.fecha_programada else 'N/A',
            'estado': visita.estado.nombre_estado if visita.estado else 'N/A',
            
            # Datos Persona
            'persona_nombre': f"{persona.nombre} {persona.apellido}",
            'persona_cedula': persona.documento_identidad,
            'persona_email': persona.email,
            'persona_empresa': persona.empresa,
            'persona_cargo': persona.cargo or 'N/A',
            'foto_data': foto_base64,  # <--- FOTO EN BASE64
            
            # Datos Centro
            'centro_nombre': centro.nombre,
            'centro_ciudad': centro.ciudad,
            
            # Detalles
            'tipo_actividad': visita.actividad.nombre_actividad if visita.actividad else 'N/A',
            'descripcion_actividad': visita.descripcion_actividad,
            'areas_nombres': areas_nombres,
            'autorizado_por': visita.autorizado_por or 'N/A',
            'equipos_ingresados': visita.equipos_ingresados or 'N/A',
            'observaciones': visita.observaciones or 'N/A',
        }
        
        # ---------------------------------------------------------
        # PASO 5: Generar Bytes del PDF
        # ---------------------------------------------------------
        pdf_bytes = generar_pdf_visita(visita_pdf_data)
        
        # ---------------------------------------------------------
        # PASO 6 & 7: Log y Retorno
        # ---------------------------------------------------------
        await log_action(
            accion="descargar_pdf_visita",
            tabla_afectada="visitas",
            registro_id=visita_id,
            detalles={"codigo": visita.codigo_visita, "tiene_foto": bool(foto_base64)},
            request=request,
            db=db,
            current_user=current_user
        )
        
        filename = f"constancia_{visita.codigo_visita}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error crítico generando PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")