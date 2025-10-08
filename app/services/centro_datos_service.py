"""
Servicio para gestión de centros de datos.
Proporciona operaciones CRUD y lógica de negocio para centros de datos.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.models import CentroDatos
from app.models.models import Area
from app.schemas.esquema_centro_datos import CentroDatosCreate, CentroDatosUpdate
from app.services.base import BaseService


class CentroDatosService(BaseService[CentroDatos, CentroDatosCreate, CentroDatosUpdate]):
    """
    Servicio para gestión de centros de datos.
    
    Extiende BaseService con funcionalidad específica para centros de datos.
    """
    
    def __init__(self, db: Session):
        super().__init__(CentroDatos, db)
    
    def get_by_codigo(self, codigo: str) -> Optional[CentroDatos]:
        """
        Obtiene un centro de datos por su código.
        
        Args:
            codigo: Código del centro de datos
            
        Returns:
            Centro de datos encontrado o None
        """
        return self.db.query(CentroDatos).filter(
            and_(
                CentroDatos.codigo == codigo.upper(),
                CentroDatos.activo == True
            )
        ).first()
    
    def get_centros_activos(self, skip: int = 0, limit: int = 100) -> List[CentroDatos]:
        """
        Obtiene todos los centros de datos activos.
        
        Args:
            skip: Número de registros a omitir
            limit: Número máximo de registros a retornar
            
        Returns:
            Lista de centros de datos activos
        """
        return self.get_multi(
            skip=skip, 
            limit=limit, 
            filters={'activo': True},
            order_by='nombre'
        )
    
    def get_centros_by_ciudad(self, ciudad: str) -> List[CentroDatos]:
        """
        Obtiene centros de datos por ciudad.
        
        Args:
            ciudad: Nombre de la ciudad
            
        Returns:
            Lista de centros de datos en la ciudad
        """
        return self.db.query(CentroDatos).filter(
            and_(
                CentroDatos.ciudad.ilike(f"%{ciudad}%"),
                CentroDatos.activo == True
            )
        ).order_by(CentroDatos.nombre).all()
    
    def get_centros_by_departamento(self, departamento: str) -> List[CentroDatos]:
        """
        Obtiene centros de datos por departamento.
        
        Args:
            departamento: Nombre del departamento
            
        Returns:
            Lista de centros de datos en el departamento
        """
        return self.db.query(CentroDatos).filter(
            and_(
                CentroDatos.departamento.ilike(f"%{departamento}%"),
                CentroDatos.activo == True
            )
        ).order_by(CentroDatos.nombre).all()
    
    def get_centro_with_areas(self, centro_id: int) -> Optional[CentroDatos]:
        """
        Obtiene un centro de datos con todas sus áreas.
        
        Args:
            centro_id: ID del centro de datos
            
        Returns:
            Centro de datos con áreas o None
        """
        return self.db.query(CentroDatos).filter(
            and_(
                CentroDatos.id == centro_id,
                CentroDatos.activo == True
            )
        ).first()
    
    def get_areas_by_centro(self, centro_id: int) -> List[Area]:
        """
        Obtiene todas las áreas de un centro de datos.
        
        Args:
            centro_id: ID del centro de datos
            
        Returns:
            Lista de áreas del centro de datos
        """
        return self.db.query(Area).filter(
            and_(
                Area.centro_datos_id == centro_id,
                Area.activo == True
            )
        ).order_by(Area.tipo, Area.nombre).all()
    
    def get_areas_by_tipo(self, centro_id: int, tipo_area: str) -> List[Area]:
        """
        Obtiene áreas de un centro de datos por tipo.
        
        Args:
            centro_id: ID del centro de datos
            tipo_area: Tipo de área (servidores, telecomunicaciones, cross_connect)
            
        Returns:
            Lista de áreas del tipo especificado
        """
        return self.db.query(Area).filter(
            and_(
                Area.centro_datos_id == centro_id,
                Area.tipo == tipo_area,
                Area.activo == True
            )
        ).order_by(Area.nombre).all()
    
    def create_centro_datos(self, centro_data: CentroDatosCreate) -> CentroDatos:
        """
        Crea un nuevo centro de datos.
        
        Args:
            centro_data: Datos del centro de datos
            
        Returns:
            Centro de datos creado
        """
        return self.create(centro_data)
    
    def update_centro_datos(self, centro_id: int, centro_data: CentroDatosUpdate) -> Optional[CentroDatos]:
        """
        Actualiza un centro de datos existente.
        
        Args:
            centro_id: ID del centro de datos
            centro_data: Datos a actualizar
            
        Returns:
            Centro de datos actualizado o None si no existe
        """
        centro = self.get(centro_id)
        if not centro:
            return None
        
        return self.update(centro, centro_data)
    
    def deactivate_centro_datos(self, centro_id: int) -> Optional[CentroDatos]:
        """
        Desactiva un centro de datos (soft delete).
        
        Args:
            centro_id: ID del centro de datos
            
        Returns:
            Centro de datos desactivado o None si no existe
        """
        centro = self.get(centro_id)
        if not centro:
            return None
        
        # Desactivar también todas las áreas del centro
        areas = self.get_areas_by_centro(centro_id)
        for area in areas:
            area.activo = False
        
        centro.activo = False
        self.db.commit()
        self.db.refresh(centro)
        return centro
    
    def get_centro_stats(self, centro_id: int) -> Dict[str, Any]:
        """
        Obtiene estadísticas de un centro de datos.
        
        Args:
            centro_id: ID del centro de datos
            
        Returns:
            Diccionario con estadísticas del centro
        """
        centro = self.get(centro_id)
        if not centro:
            return {}
        
        areas = self.get_areas_by_centro(centro_id)
        
        # Contar áreas por tipo
        areas_por_tipo = {}
        for area in areas:
            tipo = area.tipo.value
            if tipo not in areas_por_tipo:
                areas_por_tipo[tipo] = 0
            areas_por_tipo[tipo] += 1
        
        return {
            'centro_id': centro_id,
            'nombre_centro': centro.nombre,
            'total_areas': len(areas),
            'areas_por_tipo': areas_por_tipo,
            'capacidad_servidores': centro.capacidad_servidores,
            'capacidad_telecomunicaciones': centro.capacidad_telecomunicaciones,
            'capacidad_cross_connect': centro.capacidad_cross_connect
        }
    
    def get_all_centros_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas de todos los centros de datos.
        
        Returns:
            Diccionario con estadísticas generales
        """
        total_centros = self.count()
        centros_activos = self.count({'activo': True})
        centros_inactivos = total_centros - centros_activos
        
        # Contar por departamento
        departamentos = self.db.query(CentroDatos.departamento).filter(
            CentroDatos.activo == True
        ).distinct().all()
        
        return {
            'total_centros': total_centros,
            'centros_activos': centros_activos,
            'centros_inactivos': centros_inactivos,
            'departamentos': [d[0] for d in departamentos]
        }
