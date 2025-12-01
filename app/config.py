# app/config.py - CORREGIDO PARA LEER DEL .env

from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """Configuración principal de la aplicación"""

    # Configuración de la aplicación
    app_name: str = "Sistema de Gestión de Accesos"
    app_version: str = "1.0.0"
    debug: bool = False

    # Configuración de la base de datos
    database_url: str = "postgresql://postgres:123456@gestion_accesos:5432/gestion_accesos"
    database_echo: bool = False

    # Configuración de autenticación JWT
    secret_key: str = "tu-clave-secreta-super-segura-aqui"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Email (opcional)
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None
    mail_from: Optional[str] = None
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"
    mail_from_name: str = "Sistema SENIAT"
    mail_tls: bool = True
    mail_ssl: bool = False

    # Frontend URL
    frontend_url: str = "http://localhost:5173"

    # CORS
    allowed_origins: list = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    allowed_methods: list = ["*"]
    allowed_headers: list = ["*"]

    # Telegram
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # ✅ FOTOS - Lee directamente del .env (LOCAL)
    upload_personas_path: str = "./html/mi-app/src/img/personas/"
    upload_operadores_path: str = "./src/img/operadores/"
    upload_capturas_path: str = "./src/img/capturas/"
    
    upload_personas_url: str = "http://localhost:5050/imagenes/personas/"
    upload_operadores_url: str = "http://localhost:5050/imagenes/operadores/"
    upload_capturas_url: str = "http://localhost:5050/imagenes/capturas/"
    
    upload_max_size_mb: int = 5
    upload_allowed_extensions: str = "jpg,jpeg,png,gif,webp"

    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global
settings = Settings()

# Debug: Mostrar rutas cargadas
print("\n" + "="*60)
print("🔍 CONFIGURACIÓN DE FOTOS CARGADA:")
print("="*60)
print(f"Guardar en:  {settings.upload_personas_path}")
print(f"Servir desde: {settings.upload_personas_url}")
print("="*60 + "\n")
