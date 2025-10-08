"""
Servicio base con operaciones CRUD comunes.
Proporciona funcionalidad base para todos los servicios.
"""

from typing import Type, TypeVar, Generic, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from pydantic import BaseModel
from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Servicio base que proporciona operaciones CRUD comunes.
    
    Args:
        model: Modelo SQLAlchemy
        db: Sesión de base de datos
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db
    
    def get(self, id: int) -> Optional[ModelType]:
        """
        Obtiene un registro por su ID.
        
        Args:
            id: ID del registro
            
        Returns:
            Registro encontrado o None
        """
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_multi(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_direction: str = "asc"
    ) -> List[ModelType]:
        """
        Obtiene múltiples registros con paginación y filtros.
        
        Args:
            skip: Número de registros a omitir
            limit: Número máximo de registros a retornar
            filters: Diccionario de filtros a aplicar
            order_by: Campo por el cual ordenar
            order_direction: Dirección del ordenamiento (asc/desc)
            
        Returns:
            Lista de registros
        """
        query = self.db.query(self.model)
        
        # Aplicar filtros
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    if isinstance(value, str):
                        # Búsqueda parcial para strings
                        query = query.filter(getattr(self.model, field).ilike(f"%{value}%"))
                    else:
                        query = query.filter(getattr(self.model, field) == value)
        
        # Aplicar ordenamiento
        if order_by and hasattr(self.model, order_by):
            if order_direction.lower() == "desc":
                query = query.order_by(desc(getattr(self.model, order_by)))
            else:
                query = query.order_by(asc(getattr(self.model, order_by)))
        
        return query.offset(skip).limit(limit).all()
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Cuenta el número total de registros con filtros opcionales.
        
        Args:
            filters: Diccionario de filtros a aplicar
            
        Returns:
            Número total de registros
        """
        query = self.db.query(self.model)
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    if isinstance(value, str):
                        query = query.filter(getattr(self.model, field).ilike(f"%{value}%"))
                    else:
                        query = query.filter(getattr(self.model, field) == value)
        
        return query.count()
    
    def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Crea un nuevo registro.
        
        Args:
            obj_in: Datos del objeto a crear
            
        Returns:
            Registro creado
        """
        obj_data = obj_in.dict() if hasattr(obj_in, 'dict') else obj_in
        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def update(self, db_obj: ModelType, obj_in: UpdateSchemaType) -> ModelType:
        """
        Actualiza un registro existente.
        
        Args:
            db_obj: Objeto existente en la base de datos
            obj_in: Datos a actualizar
            
        Returns:
            Registro actualizado
        """
        obj_data = obj_in.dict(exclude_unset=True) if hasattr(obj_in, 'dict') else obj_in
        
        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def delete(self, id: int) -> Optional[ModelType]:
        """
        Elimina un registro por su ID (soft delete).
        
        Args:
            id: ID del registro a eliminar
            
        Returns:
            Registro eliminado o None
        """
        obj = self.get(id)
        if obj:
            if hasattr(obj, 'activo'):
                obj.activo = False
                self.db.commit()
                self.db.refresh(obj)
            else:
                self.db.delete(obj)
                self.db.commit()
        return obj
    
    def hard_delete(self, id: int) -> Optional[ModelType]:
        """
        Elimina permanentemente un registro por su ID.
        
        Args:
            id: ID del registro a eliminar
            
        Returns:
            Registro eliminado o None
        """
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
        return obj
    
    def exists(self, id: int) -> bool:
        """
        Verifica si un registro existe por su ID.
        
        Args:
            id: ID del registro
            
        Returns:
            True si existe, False en caso contrario
        """
        return self.db.query(self.model).filter(self.model.id == id).first() is not None
    
    def search(self, search_term: str, fields: List[str]) -> List[ModelType]:
        """
        Busca registros en múltiples campos.
        
        Args:
            search_term: Término de búsqueda
            fields: Lista de campos donde buscar
            
        Returns:
            Lista de registros encontrados
        """
        query = self.db.query(self.model)
        conditions = []
        
        for field in fields:
            if hasattr(self.model, field):
                conditions.append(getattr(self.model, field).ilike(f"%{search_term}%"))
        
        if conditions:
            query = query.filter(or_(*conditions))
        
        return query.all()
