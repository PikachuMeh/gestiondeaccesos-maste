"""
Servicio para gestión de personas.
Proporciona operaciones CRUD y lógica de negocio para personas.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.models import Persona
from app.schemas.esquema_persona import PersonaCreate, PersonaUpdate
from app.services.base import BaseService


class PersonaService(BaseService[Persona, PersonaCreate, PersonaUpdate]):
    """
    Servicio para gestión de personas.
    
    Extiende BaseService con funcionalidad específica para personas.
    """
    
    def __init__(self, db: Session):
        super().__init__(Persona, db)
    
    def get_by_documento(self, documento: str) -> Optional[Persona]:
        """
        Obtiene una persona por su número de documento.
        
        Args:
            documento: Número de documento de identidad
            
        Returns:
            Persona encontrada o None
        """
        return self.db.query(Persona).filter(
            and_(
                Persona.documento_identidad == documento,
                Persona.activo == True
            )
        ).first()
    
    def get_by_email(self, email: str) -> Optional[Persona]:
        """
        Obtiene una persona por su email.
        
        Args:
            email: Email de la persona
            
        Returns:
            Persona encontrada o None
        """
        return self.db.query(Persona).filter(
            and_(
                Persona.email == email,
                Persona.activo == True
            )
        ).first()
    
    def search_personas(self, search_term: str) -> List[Persona]:
        """
        Busca personas por nombre, apellido, documento o empresa.
        
        Args:
            search_term: Término de búsqueda
            
        Returns:
            Lista de personas encontradas
        """
        return self.search(search_term, ['nombre', 'apellido', 'documento_identidad', 'empresa'])
    
    def get_personas_activas(self, skip: int = 0, limit: int = 100) -> List[Persona]:
        """
        Obtiene todas las personas activas.
        
        Args:
            skip: Número de registros a omitir
            limit: Número máximo de registros a retornar
            
        Returns:
            Lista de personas activas
        """
        return self.get_multi(
            skip=skip, 
            limit=limit, 
            filters={'activo': True},
            order_by='nombre'
        )
    
    def get_personas_by_empresa(self, empresa: str) -> List[Persona]:
        """
        Obtiene personas por empresa.
        
        Args:
            empresa: Nombre de la empresa
            
        Returns:
            Lista de personas de la empresa
        """
        return self.db.query(Persona).filter(
            and_(
                Persona.empresa.ilike(f"%{empresa}%"),
                Persona.activo == True
            )
        ).order_by(Persona.nombre).all()
    
    def create_or_get_persona(self, persona_data: PersonaCreate) -> Persona:
        """
        Crea una nueva persona o retorna la existente si ya está registrada.
        
        Args:
            persona_data: Datos de la persona
            
        Returns:
            Persona creada o existente
        """
        # Buscar por documento primero
        existing_persona = self.get_by_documento(persona_data.documento_identidad)
        if existing_persona:
            return existing_persona
        
        # Si no existe, crear nueva
        return self.create(persona_data)
    
    def update_persona(self, persona_id: int, persona_data: PersonaUpdate) -> Optional[Persona]:
        """
        Actualiza una persona existente.
        
        Args:
            persona_id: ID de la persona
            persona_data: Datos a actualizar
            
        Returns:
            Persona actualizada o None si no existe
        """
        persona = self.get(persona_id)
        if not persona:
            return None
        
        return self.update(persona, persona_data)
    
    def deactivate_persona(self, persona_id: int) -> Optional[Persona]:
        """
        Desactiva una persona (soft delete).
        
        Args:
            persona_id: ID de la persona
            
        Returns:
            Persona desactivada o None si no existe
        """
        persona = self.get(persona_id)
        if not persona:
            return None
        
        persona.activo = False
        self.db.commit()
        self.db.refresh(persona)
        return persona
    
    def get_persona_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas de personas.
        
        Returns:
            Diccionario con estadísticas
        """
        total_personas = self.count()
        personas_activas = self.count({'activo': True})
        personas_inactivas = total_personas - personas_activas
        
        # Contar por tipo de documento
        tipos_documento = self.db.query(Persona.tipo_documento).filter(
            Persona.activo == True
        ).distinct().all()
        
        return {
            'total_personas': total_personas,
            'personas_activas': personas_activas,
            'personas_inactivas': personas_inactivas,
            'tipos_documento': [t[0] for t in tipos_documento]
        }
