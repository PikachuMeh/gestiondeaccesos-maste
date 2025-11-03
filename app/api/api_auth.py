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
from app.auth import jwt_handler, get_current_active_user,get_current_user
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

@router.post("/login", response_model=Token, summary="Autenticar usuario")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Autentica un usuario y retorna un token JWT.
    Usa username y password en body (form-data).
    """
    usuario_service = UsuarioService(db)
    user = usuario_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Genera token usando user.rol (objeto RolUsuario, compatible con original)
    access_token = jwt_handler.create_token_for_user(user.id, user.username, user.rol)
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
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

@router.get("/perfil", response_model=PerfilResponse, summary="Obtener usuario y perfil actual (Alias de /me)")
async def obtener_info_usuario(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene la información combinada del Usuario y la Persona asociada.
    Este endpoint es un alias de /me.
    """
    # Reutiliza la lógica de /me para evitar inconsistencias
    return await get_current_user_info(current_user=current_user, db=db)


@router.get("/me", response_model=PerfilResponse, summary="Obtener usuario y perfil actual")
async def get_current_user_info(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Obtener el Usuario con rol cargado
    usuario_service = UsuarioService(db)
    user = usuario_service.get(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Buscar Persona por cédula (asumiendo documento_identidad == cedula como string)
    persona_service = PersonaService(db)
    persona = persona_service.get_by_documento(str(user.cedula))

    # 3. Construir objeto combinado usando to_dict para serialización segura
    user_data = usuario_service.to_dict(user)
    
    if persona:
        # Fusionar datos de Persona, priorizando sus valores (coincide con models.py)
        persona_data = persona_service.to_dict(persona)  # Asumir que PersonaService tiene to_dict
        # Sobrescribir campos específicos de Persona
        user_data.update({
            'documento_identidad': persona.documento_identidad,
            'empresa': persona.empresa,
            'direccion': persona.direccion,
            'foto': persona.foto or '/src/img/default-profile.png',
            'unidad': persona.unidad,
            'cargo': persona.cargo,
            'nombre': persona.nombre,  # Priorizar si difiere de Usuario
            'apellidos': persona.apellido,  # 'apellido' en Persona -> 'apellidos' en Usuario
        })
    else:
        # Defaults si no hay Persona
        user_data.update({
            'documento_identidad': str(user.cedula),
            'empresa': 'N/A',
            'direccion': 'N/A',
            'foto': '/src/img/default-profile.png',
            'unidad': None,
            'cargo': None,
        })

    # Pydantic validará user_data al modelo PerfilResponse
    return user_data

@router.post("/refresh", response_model=Token, summary="Renovar token")
async def refresh_token(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Renueva el token de acceso del usuario actual.
    """
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    # Usa rol_id de current_user (compatible)
    access_token = jwt_handler.create_token_for_user(current_user["id"], current_user["username"], current_user["rol_id"])
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
