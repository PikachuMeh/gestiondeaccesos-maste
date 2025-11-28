"""
Configuración del sistema de gestión de accesos.
Maneja todas las variables de entorno y configuraciones del sistema.
"""

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
    
    # ✅ CORREGIDO: Campos de email opcionales con valores por defecto
    mail_username: Optional[str] = None  # Se lee de variable de entorno MAIL_USERNAME
    mail_password: Optional[str] = None  # Se lee de variable de entorno MAIL_PASSWORD
    mail_from: Optional[str] = None      # Se lee de variable de entorno MAIL_FROM
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"
    mail_from_name: str = "Sistema SENIAT"
    mail_tls: bool = True
    mail_ssl: bool = False
    
    # ✅ NUEVO: URL del frontend para links de recuperación
    frontend_url: str = "http://localhost:5173"
    
    # Configuración de CORS
    allowed_origins: list = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://172.16.56.102:3000",
        "http://172.16.56.102:8080",
    ]
    allowed_methods: list = ["*"]
    allowed_headers: list = ["*"]
    
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    
    # Configuración de rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # segundos
    
    # Configuración de logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # ========== CONFIGURACIÓN DE UPLOADS DE OPERADORES (NUEVO) ==========
    upload_operadores_path: str = "../html/mi-app/src/img/operadores/"
    upload_operadores_url: str = "http://localhost:5173/src/img/operadores/"
    upload_max_size_mb: int = 5
    upload_allowed_extensions: str = "jpg,jpeg,png,gif,webp"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # IMPORTANTE: Ignora variables extra para evitar errores


# Instancia global de configuración
settings = Settings()

# ✅ AGREGAR ESTO TEMPORALMENTE PARA DEBUG
print("\n" + "="*60)
print("🔍 DIAGNÓSTICO: Valores cargados en settings")
print("="*60)
print(f"MAIL_USERNAME: {settings.mail_username}")
print(f"MAIL_PASSWORD: {settings.mail_password}")
print(f"MAIL_FROM: {settings.mail_from}")
print(f"DATABASE_URL: {settings.database_url}")
print(f"FRONTEND_URL: {settings.frontend_url}")
print(f"UPLOAD_OPERADORES_PATH: {settings.upload_operadores_path}")
print(f"UPLOAD_OPERADORES_URL: {settings.upload_operadores_url}")
print(f"UPLOAD_MAX_SIZE_MB: {settings.upload_max_size_mb}")
print(f"UPLOAD_ALLOWED_EXTENSIONS: {settings.upload_allowed_extensions}")
print("="*60)

# Ruta donde debería estar el .env
env_path = Path(__file__).parent.parent / ".env"
print(f"\n📂 Buscando archivo .env en: {env_path}")
print(f"¿Existe el archivo?: {env_path.exists()}")

if env_path.exists():
    print(f"Tamaño del archivo: {env_path.stat().st_size} bytes")
    print("\n📄 Contenido del archivo .env:")
    print("-" * 60)
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Mostrar solo las primeras líneas (sin contraseñas completas)
        for line in content.split('\n')[:20]:
            if 'PASSWORD' in line:
                print(f"{line[:30]}... (oculto)")
            else:
                print(line)
    print("-" * 60)
else:
    print("❌ El archivo .env NO existe en esa ubicación")

print("\n📍 Directorio actual de trabajo:")
print(f" {os.getcwd()}")
print("\n📍 Ubicación del archivo config.py:")
print(f" {Path(__file__).absolute()}")
print("="*60 + "\n")