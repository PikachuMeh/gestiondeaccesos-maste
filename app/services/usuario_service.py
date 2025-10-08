"""
Servicio para gestión de usuarios del sistema.
Proporciona operaciones CRUD y lógica de negocio para usuarios.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from passlib.context import CryptContext
from datetime import datetime
from app.models.models import Usuario, RolUsuario
from app.schemas.esquema_usuario import UsuarioCreate, UsuarioUpdate, UsuarioChangePassword
from app.services.base import BaseService

# Contexto para hashing de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UsuarioService(BaseService[Usuario, UsuarioCreate, UsuarioUpdate]):
    """
    Servicio para gestión de usuarios del sistema.
    
    Extiende BaseService con funcionalidad específica para usuarios.
    """
    
    def __init__(self, db: Session):
        super().__init__(Usuario, db)
    
    def get_by_username(self, username: str) -> Optional[Usuario]:
        """
        Obtiene un usuario por su nombre de usuario.
        
        Args:
            username: Nombre de usuario
            
        Returns:
            Usuario encontrado o None
        """
        return self.db.query(Usuario).filter(
            and_(
                Usuario.username == username.lower(),
                Usuario.activo == True
            )
        ).first()
    
    def get_by_email(self, email: str) -> Optional[Usuario]:
        """
        Obtiene un usuario por su email.
        
        Args:
            email: Email del usuario
            
        Returns:
            Usuario encontrado o None
        """
        return self.db.query(Usuario).filter(
            and_(
                Usuario.email == email.lower(),
                Usuario.activo == True
            )
        ).first()
    
    def get_usuarios_by_rol(self, rol: RolUsuario) -> List[Usuario]:
        """
        Obtiene usuarios por rol.
        
        Args:
            rol: Rol de usuario
            
        Returns:
            Lista de usuarios con el rol especificado
        """
        return self.db.query(Usuario).filter(
            and_(
                Usuario.rol == rol,
                Usuario.activo == True
            )
        ).order_by(Usuario.nombre_completo).all()
    
    def get_usuarios_activos(self, skip: int = 0, limit: int = 100) -> List[Usuario]:
        """
        Obtiene todos los usuarios activos.
        
        Args:
            skip: Número de registros a omitir
            limit: Número máximo de registros a retornar
            
        Returns:
            Lista de usuarios activos
        """
        return self.get_multi(
            skip=skip, 
            limit=limit, 
            filters={'activo': True},
            order_by='nombre_completo'
        )
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verifica una contraseña contra su hash.
        
        Args:
            plain_password: Contraseña en texto plano
            hashed_password: Hash de la contraseña
            
        Returns:
            True si la contraseña es correcta, False en caso contrario
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """
        Genera el hash de una contraseña.
        
        Args:
            password: Contraseña en texto plano
            
        Returns:
            Hash de la contraseña
        """
        return pwd_context.hash(password)
    
    def authenticate_user(self, username: str, password: str) -> Optional[Usuario]:
        """
        Autentica un usuario con username y contraseña.
        
        Args:
            username: Nombre de usuario
            password: Contraseña
            
        Returns:
            Usuario autenticado o None si las credenciales son incorrectas
        """
        user = self.get_by_username(username)
        if not user:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        # Actualizar último acceso
        user.ultimo_acceso = datetime.now()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def create_user(self, user_data: UsuarioCreate) -> Usuario:
        """
        Crea un nuevo usuario.
        
        Args:
            user_data: Datos del usuario
            
        Returns:
            Usuario creado
        """
        # Verificar que el username no exista
        if self.get_by_username(user_data.username):
            raise ValueError("El nombre de usuario ya existe")
        
        # Verificar que el email no exista
        if self.get_by_email(user_data.email):
            raise ValueError("El email ya está registrado")
        
        # Crear el usuario
        user_dict = user_data.dict()
        user_dict['hashed_password'] = self.get_password_hash(user_data.password)
        del user_dict['password']  # Remover la contraseña en texto plano
        user_dict['username'] = user_data.username.lower()
        user_dict['email'] = user_data.email.lower()
        
        db_user = Usuario(**user_dict)
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user
    
    def update_user(self, user_id: int, user_data: UsuarioUpdate) -> Optional[Usuario]:
        """
        Actualiza un usuario existente.
        
        Args:
            user_id: ID del usuario
            user_data: Datos a actualizar
            
        Returns:
            Usuario actualizado o None si no existe
        """
        user = self.get(user_id)
        if not user:
            return None
        
        # Verificar username único si se está actualizando
        if user_data.username and user_data.username != user.username:
            if self.get_by_username(user_data.username):
                raise ValueError("El nombre de usuario ya existe")
            user_data.username = user_data.username.lower()
        
        # Verificar email único si se está actualizando
        if user_data.email and user_data.email != user.email:
            if self.get_by_email(user_data.email):
                raise ValueError("El email ya está registrado")
            user_data.email = user_data.email.lower()
        
        return self.update(user, user_data)
    
    def change_password(self, user_id: int, password_data: UsuarioChangePassword) -> Optional[Usuario]:
        """
        Cambia la contraseña de un usuario.
        
        Args:
            user_id: ID del usuario
            password_data: Datos del cambio de contraseña
            
        Returns:
            Usuario actualizado o None si no existe
        """
        user = self.get(user_id)
        if not user:
            return None
        
        # Verificar contraseña actual
        if not self.verify_password(password_data.current_password, user.hashed_password):
            raise ValueError("La contraseña actual es incorrecta")
        
        # Actualizar contraseña
        user.hashed_password = self.get_password_hash(password_data.new_password)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def reset_password(self, user_id: int, new_password: str) -> Optional[Usuario]:
        """
        Resetea la contraseña de un usuario (para administradores).
        
        Args:
            user_id: ID del usuario
            new_password: Nueva contraseña
            
        Returns:
            Usuario actualizado o None si no existe
        """
        user = self.get(user_id)
        if not user:
            return None
        
        user.hashed_password = self.get_password_hash(new_password)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def deactivate_user(self, user_id: int) -> Optional[Usuario]:
        """
        Desactiva un usuario (soft delete).
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Usuario desactivado o None si no existe
        """
        user = self.get(user_id)
        if not user:
            return None
        
        user.activo = False
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def get_user_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas de usuarios.
        
        Returns:
            Diccionario con estadísticas
        """
        total_usuarios = self.count()
        usuarios_activos = self.count({'activo': True})
        usuarios_inactivos = total_usuarios - usuarios_activos
        
        # Contar por rol
        roles = self.db.query(Usuario.rol).filter(
            Usuario.activo == True
        ).distinct().all()
        
        usuarios_por_rol = {}
        for rol in roles:
            rol_value = rol[0]
            count = self.count({'rol': rol_value, 'activo': True})
            usuarios_por_rol[rol_value.value] = count
        
        return {
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'usuarios_inactivos': usuarios_inactivos,
            'usuarios_por_rol': usuarios_por_rol
        }
    
    def search_usuarios(self, search_term: str) -> List[Usuario]:
        """
        Busca usuarios por nombre, username o email.
        
        Args:
            search_term: Término de búsqueda
            
        Returns:
            Lista de usuarios encontrados
        """
        return self.search(search_term, ['nombre_completo', 'username', 'email'])
    
    def get_usuarios_by_departamento(self, departamento: str) -> List[Usuario]:
        """
        Obtiene usuarios por departamento.
        
        Args:
            departamento: Nombre del departamento
            
        Returns:
            Lista de usuarios del departamento
        """
        return self.db.query(Usuario).filter(
            and_(
                Usuario.departamento.ilike(f"%{departamento}%"),
                Usuario.activo == True
            )
        ).order_by(Usuario.nombre_completo).all()
