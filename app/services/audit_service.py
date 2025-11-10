"""
Servicio de auditoría para registrar todas las acciones del sistema.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func,or_
from datetime import datetime, date
from app.models.models import Control, Usuario
from app.database import SCHEMA

class AuditService:
    """
    Servicio para manejar el registro de auditoría de acciones del sistema.
    """

    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        usuario_id: int,
        accion: str,
        detalles: Optional[str] = None,
        tabla_afectada: Optional[str] = None,
        registro_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Control:
        """
        Registra una acción en el sistema de auditoría.

        Args:
            usuario_id: ID del usuario que realizó la acción
            accion: Descripción de la acción (ej: 'crear_visita', 'borrar_persona')
            detalles: Detalles adicionales de la acción
            tabla_afectada: Nombre de la tabla afectada
            registro_id: ID del registro afectado
            ip_address: Dirección IP del usuario
            user_agent: Información del navegador/dispositivo

        Returns:
            Registro de control creado
        """
        now = datetime.now()

        control = Control(
            realizado=accion,
            fecha=now.date(),
            hora=now.strftime('%H:%M:%S'),
            usuario_id=usuario_id,
            detalles=detalles,
            ip_address=ip_address,
            user_agent=user_agent,
            tabla_afectada=tabla_afectada,
            registro_id=registro_id
        )

        self.db.add(control)
        self.db.commit()
        self.db.refresh(control)

        return control

    def get_audit_logs(
        self,
        usuario_id: Optional[int] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        accion: Optional[str] = None,
        tabla_afectada: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Control]:
        """
        Obtiene registros de auditoría con filtros opcionales.

        Args:
            usuario_id: Filtrar por usuario específico
            fecha_desde: Fecha desde (inclusive)
            fecha_hasta: Fecha hasta (inclusive)
            accion: Filtrar por tipo de acción
            tabla_afectada: Filtrar por tabla afectada
            skip: Número de registros a omitir
            limit: Número máximo de registros a retornar

        Returns:
            Lista de registros de control
        """
        query = self.db.query(Control).options(
            # Cargar información del usuario
            self.db.query(Control).options.joinedload(Control.usuario)
        )

        # Aplicar filtros
        if usuario_id:
            query = query.filter(Control.usuario_id == usuario_id)

        if fecha_desde:
            query = query.filter(Control.fecha >= fecha_desde)

        if fecha_hasta:
            query = query.filter(Control.fecha <= fecha_hasta)

        if accion:
            query = query.filter(Control.realizado.ilike(f"%{accion}%"))

        if tabla_afectada:
            query = query.filter(Control.tabla_afectada == tabla_afectada)

        # Ordenar por fecha y hora descendente
        query = query.order_by(desc(Control.fecha), desc(Control.hora))

        return query.offset(skip).limit(limit).all()

    def get_audit_stats(
        self,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Obtiene estadísticas de auditoría.

        Args:
            fecha_desde: Fecha desde para las estadísticas
            fecha_hasta: Fecha hasta para las estadísticas

        Returns:
            Diccionario con estadísticas
        """
        query = self.db.query(Control)

        if fecha_desde:
            query = query.filter(Control.fecha >= fecha_desde)

        if fecha_hasta:
            query = query.filter(Control.fecha <= fecha_hasta)

        # Total de acciones
        total_acciones = query.count()

        # Acciones por usuario
        acciones_por_usuario = self.db.query(
            Usuario.nombre,
            Usuario.apellidos,
            func.count(Control.id).label('total_acciones')
        ).join(Control.usuario).group_by(
            Usuario.id, Usuario.nombre, Usuario.apellidos
        ).all()

        # Acciones por tipo
        acciones_por_tipo = query.with_entities(
            Control.realizado,
            func.count(Control.id).label('cantidad')
        ).group_by(Control.realizado).all()

        # Acciones por tabla
        acciones_por_tabla = query.with_entities(
            Control.tabla_afectada,
            func.count(Control.id).label('cantidad')
        ).filter(Control.tabla_afectada.isnot(None)).group_by(Control.tabla_afectada).all()

        return {
            'total_acciones': total_acciones,
            'acciones_por_usuario': [
                {
                    'usuario': f"{u.nombre} {u.apellidos}",
                    'total_acciones': u.total_acciones
                } for u in acciones_por_usuario
            ],
            'acciones_por_tipo': [
                {'accion': a.realizado, 'cantidad': a.cantidad}
                for a in acciones_por_tipo
            ],
            'acciones_por_tabla': [
                {'tabla': t.tabla_afectada, 'cantidad': t.cantidad}
                for t in acciones_por_tabla
            ]
        }

    def get_user_activity(self, usuario_id: int, limit: int = 50) -> List[Control]:
        """
        Obtiene la actividad reciente de un usuario específico.

        Args:
            usuario_id: ID del usuario
            limit: Número máximo de registros a retornar

        Returns:
            Lista de acciones del usuario
        """
        return self.db.query(Control).options(
            self.db.query(Control).options.joinedload(Control.usuario)
        ).filter(
            Control.usuario_id == usuario_id
        ).order_by(
            desc(Control.fecha), desc(Control.hora)
        ).limit(limit).all()

    def search_audit_logs(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Control]:
        """
        Busca en los registros de auditoría por término de búsqueda.

        Args:
            search_term: Término a buscar en detalles y acciones
            skip: Número de registros a omitir
            limit: Número máximo de registros a retornar

        Returns:
            Lista de registros que coinciden con la búsqueda
        """
        return self.db.query(Control).options(
            self.db.query(Control).options.joinedload(Control.usuario)
        ).filter(
            or_(
                Control.realizado.ilike(f"%{search_term}%"),
                Control.detalles.ilike(f"%{search_term}%"),
                Control.tabla_afectada.ilike(f"%{search_term}%")
            )
        ).order_by(
            desc(Control.fecha), desc(Control.hora)
        ).offset(skip).limit(limit).all()