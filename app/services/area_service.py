"""
Servicio para gestión de áreas.
Proporciona operaciones CRUD y lógica de negocio para áreas.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.models import Area, TipoArea
from app.schemas.esquema_area import AreaCreate, AreaUpdate
from app.services.base import BaseService


class AreaService(BaseService[Area, AreaCreate, AreaUpdate]):
    """
    Servicio para gestión de áreas.
    
    Extiende BaseService con funcionalidad específica para áreas.
    """
    
    def __init__(self, db: Session):
        super().__init__(Area, db)
    
    def get_by_codigo(self, codigo: str, centro_datos_id: int) -> Optional[Area]:
        """
        Obtiene un área por su código dentro de un centro de datos.
        
        Args:
            codigo: Código del área
            centro_datos_id: ID del centro de datos
            
        Returns:
            Área encontrada o None
        """
        return self.db.query(Area).filter(
            and_(
                Area.codigo == codigo.upper(),
                Area.centro_datos_id == centro_datos_id,
                Area.activo == True
            )
        ).first()
    
    def get_areas_by_centro(self, centro_datos_id: int) -> List[Area]:
        """
        Obtiene todas las áreas de un centro de datos.
        
        Args:
            centro_datos_id: ID del centro de datos
            
        Returns:
            Lista de áreas del centro de datos
        """
        return self.db.query(Area).filter(
            and_(
                Area.centro_datos_id == centro_datos_id,
                Area.activo == True
            )
        ).order_by(Area.tipo, Area.nombre).all()
    
    def get_areas_by_tipo(self, tipo_area: TipoArea, centro_datos_id: Optional[int] = None) -> List[Area]:
        """
        Obtiene áreas por tipo, opcionalmente filtradas por centro de datos.
        
        Args:
            tipo_area: Tipo de área
            centro_datos_id: ID del centro de datos (opcional)
            
        Returns:
            Lista de áreas del tipo especificado
        """
        query = self.db.query(Area).filter(
            and_(
                Area.tipo == tipo_area,
                Area.activo == True
            )
        )
        
        if centro_datos_id:
            query = query.filter(Area.centro_datos_id == centro_datos_id)
        
        return query.order_by(Area.nombre).all()
    
    def get_areas_servidores(self, centro_datos_id: Optional[int] = None) -> List[Area]:
        """
        Obtiene todas las áreas de servidores.
        
        Args:
            centro_datos_id: ID del centro de datos (opcional)
            
        Returns:
            Lista de áreas de servidores
        """
        return self.get_areas_by_tipo(TipoArea.SERVIDORES, centro_datos_id)
    
    def get_areas_telecomunicaciones(self, centro_datos_id: Optional[int] = None) -> List[Area]:
        """
        Obtiene todas las áreas de telecomunicaciones.
        
        Args:
            centro_datos_id: ID del centro de datos (opcional)
            
        Returns:
            Lista de áreas de telecomunicaciones
        """
        return self.get_areas_by_tipo(TipoArea.TELECOMUNICACIONES, centro_datos_id)
    
    def get_areas_cross_connect(self, centro_datos_id: Optional[int] = None) -> List[Area]:
        """
        Obtiene todas las áreas de cross connect.
        
        Args:
            centro_datos_id: ID del centro de datos (opcional)
            
        Returns:
            Lista de áreas de cross connect
        """
        return self.get_areas_by_tipo(TipoArea.CROSS_CONNECT, centro_datos_id)
    
    def get_areas_disponibles(self, centro_datos_id: int) -> List[Area]:
        """
        Obtiene áreas con disponibilidad en un centro de datos.
        
        Args:
            centro_datos_id: ID del centro de datos
            
        Returns:
            Lista de áreas con disponibilidad
        """
        return self.db.query(Area).filter(
            and_(
                Area.centro_datos_id == centro_datos_id,
                Area.activo == True,
                Area.capacidad_actual < Area.capacidad_maxima
            )
        ).order_by(Area.tipo, Area.nombre).all()
    
    def get_areas_por_nivel_seguridad(self, nivel_seguridad: str, centro_datos_id: Optional[int] = None) -> List[Area]:
        """
        Obtiene áreas por nivel de seguridad.
        
        Args:
            nivel_seguridad: Nivel de seguridad (normal, alto, critico)
            centro_datos_id: ID del centro de datos (opcional)
            
        Returns:
            Lista de áreas con el nivel de seguridad especificado
        """
        query = self.db.query(Area).filter(
            and_(
                Area.nivel_seguridad == nivel_seguridad.lower(),
                Area.activo == True
            )
        )
        
        if centro_datos_id:
            query = query.filter(Area.centro_datos_id == centro_datos_id)
        
        return query.order_by(Area.nombre).all()
    
    def create_area(self, area_data: AreaCreate) -> Area:
        """
        Crea una nueva área.
        
        Args:
            area_data: Datos del área
            
        Returns:
            Área creada
        """
        return self.create(area_data)
    
    def update_area(self, area_id: int, area_data: AreaUpdate) -> Optional[Area]:
        """
        Actualiza un área existente.
        
        Args:
            area_id: ID del área
            area_data: Datos a actualizar
            
        Returns:
            Área actualizada o None si no existe
        """
        area = self.get(area_id)
        if not area:
            return None
        
        return self.update(area, area_data)
    
    def update_capacidad_actual(self, area_id: int, nueva_capacidad: int) -> Optional[Area]:
        """
        Actualiza la capacidad actual de un área.
        
        Args:
            area_id: ID del área
            nueva_capacidad: Nueva capacidad actual
            
        Returns:
            Área actualizada o None si no existe
        """
        area = self.get(area_id)
        if not area:
            return None
        
        if area.capacidad_maxima and nueva_capacidad > area.capacidad_maxima:
            raise ValueError("La capacidad actual no puede exceder la capacidad máxima")
        
        area.capacidad_actual = nueva_capacidad
        self.db.commit()
        self.db.refresh(area)
        return area
    
    def incrementar_capacidad(self, area_id: int, incremento: int = 1) -> Optional[Area]:
        """
        Incrementa la capacidad actual de un área.
        
        Args:
            area_id: ID del área
            incremento: Cantidad a incrementar
            
        Returns:
            Área actualizada o None si no existe
        """
        area = self.get(area_id)
        if not area:
            return None
        
        nueva_capacidad = area.capacidad_actual + incremento
        return self.update_capacidad_actual(area_id, nueva_capacidad)
    
    def decrementar_capacidad(self, area_id: int, decremento: int = 1) -> Optional[Area]:
        """
        Decrementa la capacidad actual de un área.
        
        Args:
            area_id: ID del área
            decremento: Cantidad a decrementar
            
        Returns:
            Área actualizada o None si no existe
        """
        area = self.get(area_id)
        if not area:
            return None
        
        nueva_capacidad = max(0, area.capacidad_actual - decremento)
        return self.update_capacidad_actual(area_id, nueva_capacidad)
    
    def deactivate_area(self, area_id: int) -> Optional[Area]:
        """
        Desactiva un área (soft delete).
        
        Args:
            area_id: ID del área
            
        Returns:
            Área desactivada o None si no existe
        """
        area = self.get(area_id)
        if not area:
            return None
        
        area.activo = False
        self.db.commit()
        self.db.refresh(area)
        return area
    
    def get_area_stats(self, area_id: int) -> Dict[str, Any]:
        """
        Obtiene estadísticas de un área.
        
        Args:
            area_id: ID del área
            
        Returns:
            Diccionario con estadísticas del área
        """
        area = self.get(area_id)
        if not area:
            return {}
        
        disponibilidad = None
        if area.capacidad_maxima is not None:
            disponibilidad = area.capacidad_maxima - area.capacidad_actual
        
        return {
            'area_id': area_id,
            'nombre_area': area.nombre,
            'tipo': area.tipo.value,
            'capacidad_maxima': area.capacidad_maxima,
            'capacidad_actual': area.capacidad_actual,
            'disponibilidad': disponibilidad,
            'nivel_seguridad': area.nivel_seguridad,
            'requiere_autorizacion_especial': area.requiere_autorizacion_especial
        }
    
    def get_areas_stats_by_centro(self, centro_datos_id: int) -> Dict[str, Any]:
        """
        Obtiene estadísticas de todas las áreas de un centro de datos.
        
        Args:
            centro_datos_id: ID del centro de datos
            
        Returns:
            Diccionario con estadísticas de las áreas
        """
        areas = self.get_areas_by_centro(centro_datos_id)
        
        stats = {
            'total_areas': len(areas),
            'areas_por_tipo': {},
            'areas_por_nivel_seguridad': {},
            'capacidad_total': 0,
            'capacidad_ocupada': 0
        }
        
        for area in areas:
            # Contar por tipo
            tipo = area.tipo.value
            if tipo not in stats['areas_por_tipo']:
                stats['areas_por_tipo'][tipo] = 0
            stats['areas_por_tipo'][tipo] += 1
            
            # Contar por nivel de seguridad
            nivel = area.nivel_seguridad
            if nivel not in stats['areas_por_nivel_seguridad']:
                stats['areas_por_nivel_seguridad'][nivel] = 0
            stats['areas_por_nivel_seguridad'][nivel] += 1
            
            # Sumar capacidades
            if area.capacidad_maxima:
                stats['capacidad_total'] += area.capacidad_maxima
            stats['capacidad_ocupada'] += area.capacidad_actual
        
        return stats
