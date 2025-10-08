"""
Middleware de seguridad personalizado.
Proporciona funcionalidades adicionales de seguridad para la API.
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import structlog
from typing import Dict, Any

logger = structlog.get_logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware para agregar headers de seguridad HTTP.
    
    Agrega headers de seguridad estándar a todas las respuestas.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
    
    async def dispatch(self, request: Request, call_next):
        """
        Procesa la request y agrega headers de seguridad.
        
        Args:
            request: Request HTTP
            call_next: Función para procesar la request
            
        Returns:
            Response con headers de seguridad
        """
        response = await call_next(request)
        
        # Agregar headers de seguridad
        for header, value in self.security_headers.items():
            response.headers[header] = value
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para logging de requests HTTP.
    
    Registra información detallada de todas las requests.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        """
        Procesa la request y registra información de logging.
        
        Args:
            request: Request HTTP
            call_next: Función para procesar la request
            
        Returns:
            Response procesada
        """
        start_time = time.time()
        
        # Información de la request
        request_info = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "content_type": request.headers.get("content-type"),
            "content_length": request.headers.get("content-length")
        }
        
        # Procesar la request
        response = await call_next(request)
        
        # Calcular tiempo de procesamiento
        process_time = time.time() - start_time
        
        # Información de la response
        response_info = {
            "status_code": response.status_code,
            "process_time": round(process_time, 4)
        }
        
        # Log de la request
        log_data = {**request_info, **response_info}
        
        if response.status_code >= 400:
            logger.warning("HTTP Request", **log_data)
        else:
            logger.info("HTTP Request", **log_data)
        
        # Agregar header de tiempo de procesamiento
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware básico de rate limiting.
    
    Implementa rate limiting simple basado en IP.
    """
    
    def __init__(self, app: ASGIApp, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = {}
    
    async def dispatch(self, request: Request, call_next):
        """
        Procesa la request y aplica rate limiting.
        
        Args:
            request: Request HTTP
            call_next: Función para procesar la request
            
        Returns:
            Response procesada o error de rate limit
        """
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        # Limpiar requests antiguos
        if client_ip in self.requests:
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if current_time - req_time < 60  # Último minuto
            ]
        else:
            self.requests[client_ip] = []
        
        # Verificar rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            logger.warning(
                "Rate limit exceeded",
                client_ip=client_ip,
                requests_count=len(self.requests[client_ip]),
                limit=self.requests_per_minute
            )
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "status_code": 429,
                        "detail": "Rate limit exceeded. Too many requests.",
                        "retry_after": 60
                    }
                },
                headers={"Retry-After": "60"}
            )
        
        # Registrar la request
        self.requests[client_ip].append(current_time)
        
        # Procesar la request
        response = await call_next(request)
        
        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para manejo centralizado de errores.
    
    Captura y formatea errores no manejados.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        """
        Procesa la request y maneja errores.
        
        Args:
            request: Request HTTP
            call_next: Función para procesar la request
            
        Returns:
            Response procesada o error formateado
        """
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            logger.error(
                "Unhandled exception in middleware",
                error=str(exc),
                path=request.url.path,
                method=request.method,
                exc_info=True
            )
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "status_code": 500,
                        "detail": "Error interno del servidor",
                        "path": request.url.path,
                        "method": request.method
                    }
                }
            )


class CORSCustomMiddleware(BaseHTTPMiddleware):
    """
    Middleware personalizado de CORS.
    
    Proporciona control granular de CORS.
    """
    
    def __init__(self, app: ASGIApp, allowed_origins: list = None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or ["*"]
    
    async def dispatch(self, request: Request, call_next):
        """
        Procesa la request y maneja CORS.
        
        Args:
            request: Request HTTP
            call_next: Función para procesar la request
            
        Returns:
            Response con headers CORS
        """
        origin = request.headers.get("origin")
        
        # Verificar origen permitido
        if origin and origin not in self.allowed_origins and "*" not in self.allowed_origins:
            return JSONResponse(
                status_code=403,
                content={"error": "Origin not allowed"}
            )
        
        response = await call_next(request)
        
        # Agregar headers CORS
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response
