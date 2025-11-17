# app/services/control_service.py
from sqlalchemy import and_, or_, func, desc, String
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime
from app.models import Control, Usuario
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
        control = Control(
            realizado=realizado,
            fecha=date.today(),
            hora=datetime.now().strftime("%H:%M:%S"),
            usuario_id=usuario_id,
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
        """
        Obtiene logs filtrados y paginados.
        Soporta filtros:
          - usuario_id (int)
          - usuario_username (str, búsqueda parcial)
          - fecha_desde / fecha_hasta (date)
          - realizado (str, búsqueda parcial)
          - tabla_afectada (str, búsqueda parcial)
        """
        # Hacemos join con Usuario para poder filtrar por username
        query = (
            self.db.query(Control)
            .join(Usuario, Control.usuario_id == Usuario.id)
            .options(joinedload(Control.usuario))
        )

        usuario_id = filters.get("usuario_id")
        usuario_username = filters.get("usuario_username")
        fecha_desde = filters.get("fecha_desde")
        fecha_hasta = filters.get("fecha_hasta")
        realizado = filters.get("realizado")
        tabla_afectada = filters.get("tabla_afectada")

        if usuario_id:
            query = query.filter(Control.usuario_id == usuario_id)

        # Filtro por username del actor (búsqueda parcial, case-insensitive)
        if usuario_username:
            like_value = f"%{usuario_username}%"
            query = query.filter(Usuario.username.ilike(like_value))

        # Acción realizada: búsqueda parcial (ej: "crear", "borrar")
        if realizado:
            like_value = f"%{realizado}%"
            query = query.filter(Control.realizado.ilike(like_value))

        # Entidad afectada: búsqueda parcial
        if tabla_afectada:
            like_value = f"%{tabla_afectada}%"
            query = query.filter(Control.tabla_afectada.ilike(like_value))

        # Rango de fechas
        if fecha_desde:
            query = query.filter(Control.fecha >= fecha_desde)
        if fecha_hasta:
            query = query.filter(Control.fecha <= fecha_hasta)

        # Orden: Fecha DESC, luego hora DESC
        query = query.order_by(
            desc(Control.fecha),
            desc(func.cast(Control.hora, String))
        )

        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        return logs, total

    def get_control_stats(
        self,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        query = self.db.query(
            Control.realizado,
            Control.tabla_afectada,
            func.count(Control.id).label("count")
        )
        if fecha_desde:
            query = query.filter(Control.fecha >= fecha_desde)
        if fecha_hasta:
            query = query.filter(Control.fecha <= fecha_hasta)
        query = query.group_by(
            Control.realizado,
            Control.tabla_afectada
        ).order_by(desc(func.count(Control.id)))
        stats = [row._asdict() for row in query.all()]
        return {"stats": stats}

    def search_logs(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Control], int]:
        query = (
            self.db.query(Control)
            .options(joinedload(Control.usuario))
            .join(Control.usuario)
        )

        if search_term:
            search_like = f"%{search_term}%"
            query = query.filter(
                or_(
                    Control.realizado.like(search_like),
                    Control.detalles.like(search_like),
                    Control.tabla_afectada.like(search_like),
                    Usuario.username.like(search_like),
                    Usuario.nombre.like(search_like),
                )
            )

        query = query.order_by(desc(Control.fecha))
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        return logs, total
