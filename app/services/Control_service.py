# app/services/control_service.py - Servicio para modelo Control (auditoría)
from sqlalchemy import and_, or_, func, desc,String
from sqlalchemy.orm import Session, joinedload  # AGREGADO: joinedload para eager load
from datetime import date, datetime
from app.models import Control, Usuario  # Modelos SQLAlchemy
from typing import Dict, Tuple, List, Any, Optional

class ControlService:
    def __init__(self, db: Session):
        self.db = db

    def create_control_log(
        self,
        realizado: str,
        usuario_id: int,
        tabla_afectada: Optional[str] = None,
        registro_id: Optional[int] = None,
        detalles: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Control:
        """Crea un nuevo log en tabla 'control' usando modelo SQLAlchemy."""
        control = Control(
            realizado=realizado,
            fecha=date.today(),
            hora=datetime.now().strftime("%H:%M:%S"),
            usuario_id=usuario_id,  # FK directo
            tabla_afectada=tabla_afectada,
            registro_id=registro_id,
            detalles=detalles,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(control)
        self.db.commit()
        self.db.refresh(control)
        return control

    def get_control_logs(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Control], int]:
        """Obtiene logs filtrados y paginados (eager load Usuario en Control)."""
        # CORREGIDO: Options con path desde root (Control): joinedload(Control.usuario)
        # No joinedload(Usuario.rol) - no usado en response
        query = self.db.query(Control).options(joinedload(Control.usuario))
        
        # Filtros en Control (no necesita join explícito)
        if filters.get('usuario_id'):
            query = query.filter(Control.usuario_id == filters['usuario_id'])
        if filters.get('fecha_desde'):
            query = query.filter(Control.fecha >= filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            query = query.filter(Control.fecha <= filters['fecha_hasta'])
        if filters.get('realizado'):
            query = query.filter(Control.realizado == filters['realizado'])
        if filters.get('tabla_afectada'):
            query = query.filter(Control.tabla_afectada == filters['tabla_afectada'])
        
        # Orden: Fecha DESC, luego hora (cast a String para orden lexicográfico HH:MM:SS)
        query = query.order_by(desc(Control.fecha), desc(func.cast(Control.hora, String)))
        
        total = query.count()  # Cuenta Controls (filtros aplicados)
        logs = query.offset(skip).limit(limit).all()  # CORREGIDO: Ahora compila sin error
        return logs, total

    def get_control_stats(
        self,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Stats: Conteos por realizado y tabla_afectada (sin join Usuario - innecesario)."""
        # CORREGIDO: Remueve join(Usuario) - no filtra/user en stats
        query = self.db.query(
            Control.realizado,
            Control.tabla_afectada,
            func.count(Control.id).label('count')
        )
        if fecha_desde:
            query = query.filter(Control.fecha >= fecha_desde)
        if fecha_hasta:
            query = query.filter(Control.fecha <= fecha_hasta)
        query = query.group_by(Control.realizado, Control.tabla_afectada).order_by(desc(func.count(Control.id)))
        stats = [row._asdict() for row in query.all()]
        return {"stats": stats}

    def search_logs(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Control], int]:
        """Búsqueda en realizado, detalles, tabla_afectada, username (join + path joinedload)."""
        # CORREGIDO: Join via relación (Control.usuario); joinedload con path Control.usuario
        query = self.db.query(Control).options(joinedload(Control.usuario)).join(Control.usuario)
        
        if search_term:
            search_like = f"%{search_term}%"
            query = query.filter(
                or_(
                    Control.realizado.like(search_like),
                    Control.detalles.like(search_like),
                    Control.tabla_afectada.like(search_like),
                    # Filtros en Usuario (post-join)
                    Usuario.username.like(search_like),
                    Usuario.nombre.like(search_like)
                )
            )
        
        query = query.order_by(desc(Control.fecha))
        total = query.count()
        logs = query.offset(skip).limit(limit).all()  # CORREGIDO: Compila OK
        return logs, total
