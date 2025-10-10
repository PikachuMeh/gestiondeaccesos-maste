"""
Configuración del sistema de gestión de accesos.
Maneja todas las variables de entorno y configuraciones del sistema.
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Configuración principal de la aplicación"""
    
    # Configuración de la aplicación
    app_name: str = "Sistema de Gestión de Accesos"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Configuración de la base de datos
    database_url: str = "postgresql://admin01:123456@localhost/gestion_accesos"
    database_echo: bool = False
    
    # Configuración de autenticación JWT
    secret_key: str = "tu-clave-secreta-super-segura-aqui"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Configuración de CORS
    allowed_origins: list = ["http://localhost:3000", 
                             "http://localhost:8080", 
                             "http://localhost:5173",
                             "http://127.0.0.1:5173"]
    allowed_methods: list = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    allowed_headers: list = ["*"]
    
    # Configuración de rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # segundos
    
    # Configuración de logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Instancia global de configuración
settings = Settings()
