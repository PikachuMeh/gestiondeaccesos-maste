"""
Endpoints de autenticación.
Maneja el login, logout y gestión de tokens JWT.
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.auth import jwt_handler, get_current_active_user
from app.services.usuario_service import UsuarioService
from app.services.persona_service import PersonaService
from app.schemas import Token, UsuarioLogin, UsuarioResponse
from app.schemas.esquema_usuario import PerfilResponse
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def _raise_404_user_not_found():
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Usuario no encontrado"
    )


def _raise_401_bad_credentials():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/login", response_model=Token, summary="Iniciar sesión")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Inicia sesión con username y contraseña.
    - 404 si el usuario no existe.
    - 401 si la contraseña es incorrecta o el usuario está inactivo.
    """
    if not form_data.username or not form_data.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario y contraseña son requeridos")

    usuario_service = UsuarioService(db)

    # Buscar usuario por username
    user = usuario_service.get_by_username(form_data.username)
    # ← ELIMINAR: return user
    if not user:
        _raise_404_user_not_found()

    # Validar credenciales y estado
    if not usuario_service.verify_password(form_data.password, user.hashed_password):
        _raise_401_bad_credentials()
    if hasattr(user, "activo") and user.activo is False:
        _raise_401_bad_credentials()

    # Actualizar último acceso
    user.ultimo_acceso = datetime.now()
    db.commit()

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = jwt_handler.create_token_for_user(
        user_id=user.id,
        username=user.username,
        rol=user.rol if hasattr(user, "rol") else None
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }


@router.post("/login-json", response_model=Token, summary="Iniciar sesión (JSON)")
async def login_json(
    login_data: UsuarioLogin,
    db: Session = Depends(get_db)
):
    """Inicia sesión con JSON."""
    if not login_data.username or not login_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Usuario y contraseña son requeridos"
        )

    usuario_service = UsuarioService(db)

    user = usuario_service.get_by_username(login_data.username)
    # ← ELIMINAR: return {"coso" : user}
    if not user:
        _raise_404_user_not_found()

    # Verificar contraseña y estado
    if not usuario_service.verify_password(login_data.password, user.hashed_password):
        _raise_401_bad_credentials()
    
    if not user.activo:
        _raise_401_bad_credentials()

    # Actualizar último acceso
    user.ultimo_acceso = datetime.now()
    db.commit()

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = jwt_handler.create_token_for_user(
        user_id=user.id,
        username=user.username,
        rol=user.rol
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }


@router.get("/me", response_model=PerfilResponse, summary="Obtener usuario y perfil actual")
async def get_current_user_info(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Obtener el Usuario (asumiendo que carga la relación 'rol' para UsuarioResponse)
    usuario_service = UsuarioService(db)
    user = usuario_service.get(current_user["id"])
    if not user:
        _raise_404_user_not_found()

    # 2. Buscar Persona
    persona_service = PersonaService(db) 
    persona = persona_service.get_by_documento(user.cedula) 

    # 3. CONSTRUIR EL OBJETO COMBINADO (Solución clave)
    
    # Convierte el modelo SQLAlchemy de Usuario a un diccionario
    combined_data = user.__dict__.copy() 
    
    # Si hay una Persona asociada, fusionamos sus datos, priorizando los de Persona
    if persona:
        persona_data = persona.__dict__.copy()
        
        # Eliminar campos que pueden causar conflictos (ej. SQLAlchemy metadata)
        persona_data.pop('_sa_instance_state', None)
        combined_data.pop('_sa_instance_state', None)

        # Fusionar datos de Persona, sobrescribiendo si hay duplicados
        combined_data.update(persona_data) 
        
        # Aseguramos que el nombre del campo para el frontend sea 'documento_identidad'
        combined_data['documento_identidad'] = persona.documento_identidad
        
    else:
        # Rellenar campos obligatorios de PerfilResponse si no hay Persona asociada
        combined_data['documento_identidad'] = str(user.cedula) # Usar la cédula del usuario
        combined_data['empresa'] = "N/A"
        combined_data['direccion'] = "N/A"
        combined_data['foto'] = "/src/img/default-profile.png"
        combined_data['unidad'] = None
        combined_data['cargo'] = None
        # Si 'apellidos' está como 'apellido' en Persona, asegúrate de la coherencia.
        # Aquí asumimos que los campos de Usuario son el fallback.

    # Pydantic validará y convertirá el diccionario combinado al PerfilResponse
    # Nota: Necesitarás un 'UsuarioService.get' que cargue eagermente el rol para pasar la validación de Pydantic.
    return combined_data

@router.post("/refresh", response_model=Token, summary="Renovar token")
async def refresh_token(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Renueva el token de acceso del usuario actual.
    """
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = jwt_handler.create_token_for_user(
        user_id=current_user["id"],
        username=current_user["username"],
        rol=current_user.get("rol")
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }


@router.post("/logout", summary="Cerrar sesión")
async def logout(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Cierra la sesión del usuario actual (lado cliente).
    """
    return {"message": "Sesión cerrada exitosamente"}
