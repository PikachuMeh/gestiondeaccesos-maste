# app/api/api_auth.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.auth import jwt_handler, get_current_active_user
from app.services.usuario_service import UsuarioService
from app.services.persona_service import PersonaService
from app.schemas import Token, UsuarioLogin, UsuarioResponse
from app.schemas.esquema_usuario import PerfilResponse, SolicitudRecuperacionPassword, ResetPasswordRequest
from app.config import settings
from app.services.email_service import email_service
from app.utils.log_utils import log_action

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# ... existing helper functions (_raise_404, _raise_401) ...
def _raise_404_user_not_found():
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

def _raise_401_bad_credentials():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/login", response_model=Token, summary="Autenticar usuario")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)
    user = usuario_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # CAMBIO: Definir duración de 4 días
    access_token_expires = timedelta(days=4)
    
    # CAMBIO: Pasar la duración al handler
    access_token = jwt_handler.create_token_for_user(
        user.id, 
        user.username, 
        user.rol, 
        expires_delta=access_token_expires
    )

    # Logging para login (current_user=None pre-auth)
    ip = request.client.host
    await log_action(
        accion="login_exitoso",
        tabla_afectada="auth",
        detalles={"username": form_data.username, "ip": ip},
        request=request,
        db=db,
        current_user=None
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }

@router.post("/login-json", response_model=Token, summary="Iniciar sesión (JSON)")
async def login_json(
    request: Request,
    login_data: UsuarioLogin,
    db: Session = Depends(get_db)
):
    if not login_data.username or not login_data.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario y contraseña son requeridos")

    usuario_service = UsuarioService(db)
    user = usuario_service.get_by_username(login_data.username)
    if not user:
        _raise_404_user_not_found()

    if not usuario_service.verify_password(login_data.password, user.hashed_password):
        _raise_401_bad_credentials()
    if not user.activo:
        _raise_401_bad_credentials()

    user.ultimo_acceso = datetime.now()
    db.commit()

    # CAMBIO: Definir duración de 4 días aquí también
    access_token_expires = timedelta(days=4)
    
    # CAMBIO: Pasar la duración al handler
    access_token = jwt_handler.create_token_for_user(
        user_id=user.id, 
        username=user.username, 
        rol=user.rol,
        expires_delta=access_token_expires
    )

    # Logging similar a login
    ip = request.client.host
    await log_action(
        accion="login_exitoso_json",
        tabla_afectada="auth",
        detalles={"username": login_data.username, "ip": ip},
        request=request,
        db=db,
        current_user=None
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }

# ... rest of the existing code (endpoints: solicitar_recuperacion, test-email, etc) ...
# Asegúrate de incluir todo el resto del código original aquí sin cambios
@router.post("/solicitar_recuperacion", summary="Solicitar recuperación de contraseña")
async def solicitar_recuperacion_password(
    request: Request,
    solicitud: SolicitudRecuperacionPassword,
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)
    user = usuario_service.get_by_email(solicitud.email)
    response_message = {
        "message": "Si el correo existe en nuestro sistema, recibirás instrucciones para recuperar tu contraseña"
    }
    if not user:
        return response_message

    try:
        reset_token = jwt_handler.create_password_reset_token(user.id, user.username, user.hashed_password)
        email_sent = await email_service.send_password_reset_email(
            email=solicitud.email,
            username=user.username,
            reset_token=reset_token
        )
        if email_sent:
            print(f"✓ Email de recuperación enviado a {solicitud.email}")
        else:
            print(f"✗ Error al enviar email a {solicitud.email}")

        # Logging para solicitud recuperación
        await log_action(
            accion="solicitar_recuperacion_password",
            tabla_afectada="auth",
            detalles={"email": solicitud.email},
            request=request,
            db=db,
            current_user=None
        )
        return response_message
    except Exception as e:
        print(f"Error en solicitud de recuperación: {str(e)}")
        return response_message

@router.post("/test-email", summary="Probar envío de email (solo desarrollo)")
async def test_email(
    request: Request,
    email: str,
    current_user = Depends(get_current_active_user)  # Requiere auth para test
):
    try:
        result = await email_service.send_test_email(email)
        if result:
            await log_action(
                accion="test_email_enviado",
                tabla_afectada="auth",
                detalles={"email": email},
                request=request,
                db=Depends(get_db),
                current_user=current_user
            )
            return {"message": "Email de prueba enviado exitosamente", "email": email}
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al enviar email de prueba")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")

@router.get("/verificar-token-reset", summary="Verificar token de recuperación")
async def verificar_token_reset(
    token: str,
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)
    try:
        from jose import jwt
        unverified = jwt.get_unverified_claims(token)
        user_id = unverified.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido")

        user = usuario_service.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        payload = jwt_handler.verify_password_reset_token(token, user.hashed_password)
        if not payload:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El token es inválido o ha expirado")

        return {"valid": True, "username": payload["username"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido")

@router.post("/reset-password", summary="Resetear contraseña con token")
async def reset_password(
    request: Request,
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    if reset_data.nueva_password != reset_data.confirmar_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Las contraseñas no coinciden")
    if len(reset_data.nueva_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña debe tener al menos 6 caracteres")

    usuario_service = UsuarioService(db)
    try:
        from jose import jwt
        unverified = jwt.get_unverified_claims(reset_data.token)
        user_id = unverified.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido")

        user = usuario_service.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        payload = jwt_handler.verify_password_reset_token(reset_data.token, user.hashed_password)
        if not payload:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o expirado. Solicita uno nuevo.")

        new_hashed = usuario_service.get_password_hash(reset_data.nueva_password)
        user.hashed_password = new_hashed
        user.fecha_actualizacion = datetime.now()
        db.commit()

        await log_action(
            accion="reset_password_exitoso",
            tabla_afectada="auth",
            detalles={"user_id": user_id, "username": user.username},
            request=request,
            db=db,
            current_user=None
        )
        return {"message": "Contraseña actualizada exitosamente", "username": user.username}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al procesar el token")

@router.get("/perfil", response_model=PerfilResponse, summary="Obtener usuario y perfil actual (Alias de /me)")
async def obtener_info_usuario(
    request: Request,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    response = await get_current_user_info(current_user=current_user, db=db, request=request)
    return response

async def get_current_user_info(
    request: Request,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    usuario_service = UsuarioService(db)
    user = usuario_service.get(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    persona_service = PersonaService(db)
    persona = persona_service.get_by_documento(str(user.cedula))

    user_data = usuario_service.to_dict(user)
    if persona:
        persona_data = persona_service.to_dict(persona)
        user_data.update({
            'documento_identidad': persona.documento_identidad,
            'empresa': persona.empresa,
            'direccion': persona.direccion,
            'foto': persona.foto or '/src/img/default-profile.png',
            'unidad': persona.unidad,
            'cargo': persona.cargo,
            'nombre': persona.nombre,
            'apellidos': persona.apellido,
        })
    else:
        user_data.update({
            'documento_identidad': str(user.cedula),
            'empresa': 'N/A',
            'direccion': 'N/A',
            'foto': '/src/img/default-profile.png',
            'unidad': None,
            'cargo': None,
        })

    await log_action(
        accion="consultar_perfil_usuario",
        tabla_afectada="usuarios",
        detalles={"user_id": current_user["id"]},
        request=request,
        db=db,
        current_user=current_user
    )
    return user_data

@router.get("/me", response_model=PerfilResponse, summary="Obtener usuario y perfil actual")
async def get_current_user_info_main(
    request: Request,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return await get_current_user_info(request=request, current_user=current_user, db=db)

@router.post("/refresh", response_model=Token, summary="Renovar token")
async def refresh_token(
    request: Request,
    current_user: dict = Depends(get_current_active_user)
):
    # CAMBIO: Definir duración de 4 días también en el refresh
    access_token_expires = timedelta(days=4)
    
    access_token = jwt_handler.create_token_for_user(
        current_user["id"], 
        current_user["username"], 
        current_user["rol_id"],
        expires_delta=access_token_expires # Pasamos el tiempo
    )

    await log_action(
        accion="refresh_token",
        tabla_afectada="auth",
        detalles={"user_id": current_user["id"], "ip": request.client.host},
        request=request,
        db=Depends(get_db),
        current_user=current_user
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }

@router.post("/logout", summary="Cerrar sesión")
async def logout(
    request: Request,
    current_user: dict = Depends(get_current_active_user)
):
    await log_action(
        accion="logout_exitoso",
        tabla_afectada="auth",
        detalles={"user_id": current_user["id"], "ip": request.client.host},
        request=request,
        db=Depends(get_db),
        current_user=current_user
    )
    return {"message": "Sesión cerrada exitosamente"}