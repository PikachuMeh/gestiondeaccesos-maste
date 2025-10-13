"""
Servicio para gestión de visitas.
Proporciona operaciones CRUD y lógica de negocio para visitas.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta
from app.models.models import Visita, EstadoVisita, TipoActividad
from app.models.models import Persona
from app.models.models import CentroDatos
from app.schemas.esquema_visita import VisitaCreate, VisitaUpdate, VisitaIngreso, VisitaSalida
from app.services.base import BaseService


class VisitaService(BaseService[Visita, VisitaCreate, VisitaUpdate]):
    """
    Servicio para gestión de visitas.
    
    Extiende BaseService con funcionalidad específica para visitas.
    """
    
    def __init__(self, db: Session):
        super().__init__(Visita, db)
    
    def generate_codigo_visita(self) -> str:
        """
        Genera un código único para la visita.
        
        Returns:
            Código único de visita
        """
        # Formato: VIS-YYYYMMDD-HHMMSS-XXX
        now = datetime.now()
        fecha_str = now.strftime("%Y%m%d")
        hora_str = now.strftime("%H%M%S")
        
        # Buscar el último número secuencial del día
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        ultima_visita = self.db.query(Visita).filter(
            and_(
                Visita.fecha_creacion >= today_start,
                Visita.fecha_creacion < today_end
            )
        ).order_by(desc(Visita.id)).first()
        
        if ultima_visita and ultima_visita.codigo_visita:
            # Extraer el número secuencial del código existente
            try:
                partes = ultima_visita.codigo_visita.split('-')
                if len(partes) >= 4:
                    ultimo_numero = int(partes[-1])
                    siguiente_numero = ultimo_numero + 1
                else:
                    siguiente_numero = 1
            except (ValueError, IndexError):
                siguiente_numero = 1
        else:
            siguiente_numero = 1
        
        return f"VIS-{fecha_str}-{hora_str}-{siguiente_numero:03d}"
    
    def get_by_codigo(self, codigo: str) -> Optional[Visita]:
        """
        Obtiene una visita por su código.
        
        Args:
            codigo: Código de la visita
            
        Returns:
            Visita encontrada o None
        """
        return self.db.query(Visita).filter(
            and_(
                Visita.codigo_visita == codigo,
                Visita.activo == True
            )
        ).first()
    
    def get_visitas_activas(self) -> List[Visita]:
        """
        Obtiene todas las visitas activas (en curso).
        
        Returns:
            Lista de visitas activas
        """
        return self.db.query(Visita).filter(
            and_(
                Visita.estado == EstadoVisita.EN_CURSO,
                Visita.activo == True
            )
        ).order_by(Visita.fecha_ingreso).all()
    
    def get_visitas_programadas(self, fecha_desde: Optional[datetime] = None, fecha_hasta: Optional[datetime] = None) -> List[Visita]:
        """
        Obtiene visitas programadas en un rango de fechas.
        
        Args:
            fecha_desde: Fecha de inicio (opcional)
            fecha_hasta: Fecha de fin (opcional)
            
        Returns:
            Lista de visitas programadas
        """
        query = self.db.query(Visita).filter(
            and_(
                Visita.estado == EstadoVisita.PROGRAMADA,
                Visita.activo == True
            )
        )
        
        if fecha_desde:
            query = query.filter(Visita.fecha_programada >= fecha_desde)
        
        if fecha_hasta:
            query = query.filter(Visita.fecha_programada <= fecha_hasta)
        
        return query.order_by(Visita.fecha_programada).all()
    
    def get_visitas_by_persona(self, persona_id: int) -> List[Visita]:
        """
        Obtiene todas las visitas de una persona.
        
        Args:
            persona_id: ID de la persona
            
        Returns:
            Lista de visitas de la persona
        """
        return self.db.query(Visita).filter(
            and_(
                Visita.persona_id == persona_id,
                Visita.activo == True
            )
        ).order_by(desc(Visita.fecha_programada)).all()
    
    def get_visitas_by_centro_datos(self, centro_datos_id: int, fecha_desde: Optional[datetime] = None, fecha_hasta: Optional[datetime] = None) -> List[Visita]:
        """
        Obtiene visitas de un centro de datos en un rango de fechas.
        
        Args:
            centro_datos_id: ID del centro de datos
            fecha_desde: Fecha de inicio (opcional)
            fecha_hasta: Fecha de fin (opcional)
            
        Returns:
            Lista de visitas del centro de datos
        """
        query = self.db.query(Visita).filter(
            and_(
                Visita.centro_datos_id == centro_datos_id,
                Visita.activo == True
            )
        )
        
        if fecha_desde:
            query = query.filter(Visita.fecha_programada >= fecha_desde)
        
        if fecha_hasta:
            query = query.filter(Visita.fecha_programada <= fecha_hasta)
        
        return query.order_by(desc(Visita.fecha_programada)).all()
    
    def create_visita(self, visita_data: VisitaCreate) -> Visita:
        """
        Crea una nueva visita.
        
        Args:
            visita_data: Datos de la visita
            
        Returns:
            Visita creada
        """
        # Generar código único
        codigo_visita = self.generate_codigo_visita()
        
        # Crear la visita
        visita_dict = visita_data.dict()
        visita_dict['codigo_visita'] = codigo_visita
        visita_dict['estado'] = EstadoVisita.PROGRAMADA
        
        db_visita = Visita(**visita_dict)
        self.db.add(db_visita)
        self.db.commit()
        self.db.refresh(db_visita)
        
        return db_visita
    
    def registrar_ingreso(self, visita_id: int, ingreso_data: VisitaIngreso) -> Optional[Visita]:
        """
        Registra el ingreso de una visita.
        
        Args:
            visita_id: ID de la visita
            ingreso_data: Datos del ingreso
            
        Returns:
            Visita actualizada o None si no existe
        """
        visita = self.get(visita_id)
        if not visita:
            return None
        
        if visita.estado != EstadoVisita.PROGRAMADA:
            raise ValueError("Solo se puede registrar ingreso en visitas programadas")
        
        visita.estado = EstadoVisita.EN_CURSO
        visita.fecha_ingreso = ingreso_data.fecha_ingreso or datetime.now()
        
        if ingreso_data.observaciones_ingreso:
            observaciones_actuales = visita.observaciones or ""
            visita.observaciones = f"{observaciones_actuales}\n[INGRESO] {ingreso_data.observaciones_ingreso}".strip()
        
        self.db.commit()
        self.db.refresh(visita)
        
        return visita
    
    def registrar_salida(self, visita_id: int, salida_data: VisitaSalida) -> Optional[Visita]:
        """
        Registra la salida de una visita.
        
        Args:
            visita_id: ID de la visita
            salida_data: Datos de la salida
            
        Returns:
            Visita actualizada o None si no existe
        """
        visita = self.get(visita_id)
        if not visita:
            return None
        
        if visita.estado != EstadoVisita.EN_CURSO:
            raise ValueError("Solo se puede registrar salida en visitas en curso")
        
        visita.estado = EstadoVisita.COMPLETADA
        visita.fecha_salida = salida_data.fecha_salida or datetime.now()
        
        if salida_data.equipos_retirados:
            visita.equipos_retirados = salida_data.equipos_retirados
        
        if salida_data.observaciones_salida:
            observaciones_actuales = visita.observaciones or ""
            visita.observaciones = f"{observaciones_actuales}\n[SALIDA] {salida_data.observaciones_salida}".strip()
        
        if salida_data.notas_finales:
            visita.notas_finales = salida_data.notas_finales
        
        self.db.commit()
        self.db.refresh(visita)
        
        return visita
    
    def cancelar_visita(self, visita_id: int, motivo: str) -> Optional[Visita]:
        """
        Cancela una visita.
        
        Args:
            visita_id: ID de la visita
            motivo: Motivo de la cancelación
            
        Returns:
            Visita cancelada o None si no existe
        """
        visita = self.get(visita_id)
        if not visita:
            return None
        
        if visita.estado in [EstadoVisita.COMPLETADA, EstadoVisita.CANCELADA]:
            raise ValueError("No se puede cancelar una visita completada o ya cancelada")
        
        visita.estado = EstadoVisita.CANCELADA
        observaciones_actuales = visita.observaciones or ""
        visita.observaciones = f"{observaciones_actuales}\n[CANCELADA] {motivo}".strip()
        
        self.db.commit()
        self.db.refresh(visita)
        
        return visita
    
    def get_visita_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas generales de visitas.
        
        Returns:
            Diccionario con estadísticas de visitas
        """
        total_visitas = self.count()
        
        # Contar por estado
        estados = self.db.query(Visita.estado, func.count(Visita.id)).filter(
            Visita.activo == True
        ).group_by(Visita.estado).all()
        
        visitas_por_estado = {estado.value: count for estado, count in estados}
        
        # Contar por tipo de actividad
        actividades = self.db.query(Visita.actividad, func.count(Visita.id)).filter(
            Visita.activo == True
        ).group_by(Visita.actividad).all()
        
        visitas_por_actividad = {actividad.value: count for actividad, count in actividades}
        
        # Calcular duración promedio
        duracion_promedio = self.db.query(func.avg(Visita.duracion_real)).filter(
            and_(
                Visita.estado == EstadoVisita.COMPLETADA,
                Visita.duracion_real.isnot(None),
                Visita.activo == True
            )
        ).scalar()
        
        return {
            'total_visitas': total_visitas,
            'visitas_por_estado': visitas_por_estado,
            'visitas_por_actividad': visitas_por_actividad,
            'duracion_promedio_minutos': round(duracion_promedio, 2) if duracion_promedio else None
        }
    
    def get_visitas_por_periodo(self, fecha_desde: datetime, fecha_hasta: datetime) -> Dict[str, Any]:
        """
        Obtiene estadísticas de visitas en un período específico.
        
        Args:
            fecha_desde: Fecha de inicio
            fecha_hasta: Fecha de fin
            
        Returns:
            Diccionario con estadísticas del período
        """
        visitas_periodo = self.db.query(Visita).filter(
            and_(
                Visita.fecha_programada >= fecha_desde,
                Visita.fecha_programada <= fecha_hasta,
                Visita.activo == True
            )
        ).all()
        
        total_visitas = len(visitas_periodo)
        visitas_completadas = len([v for v in visitas_periodo if v.estado == EstadoVisita.COMPLETADA])
        visitas_canceladas = len([v for v in visitas_periodo if v.estado == EstadoVisita.CANCELADA])
        
        return {
            'periodo': {
                'fecha_desde': fecha_desde,
                'fecha_hasta': fecha_hasta
            },
            'total_visitas': total_visitas,
            'visitas_completadas': visitas_completadas,
            'visitas_canceladas': visitas_canceladas,
            'tasa_completitud': round((visitas_completadas / total_visitas * 100), 2) if total_visitas > 0 else 0
        }
