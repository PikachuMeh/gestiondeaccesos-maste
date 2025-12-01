"""

Aplicación principal FastAPI para el sistema de gestión de accesos.

Punto de entrada de la API REST.

"""

from contextlib import asynccontextmanager

from pathlib import Path

import structlog

from fastapi import FastAPI, HTTPException, Request, status

from fastapi.middleware.cors import CORSMiddleware

from fastapi.middleware.trustedhost import TrustedHostMiddleware

from fastapi.responses import JSONResponse

from fastapi.staticfiles import StaticFiles

from slowapi import Limiter, _rate_limit_exceeded_handler

from slowapi.errors import RateLimitExceeded

from slowapi.util import get_remote_address

from app.api import api_auth, api_centros_datos, api_personas, api_visitas, api_usuarios, api_audit

from app.config import settings

from app.database import create_tables

# Logging estructurado

structlog.configure(

    processors=[

        structlog.stdlib.filter_by_level,

        structlog.stdlib.add_logger_name,

        structlog.stdlib.add_log_level,

        structlog.stdlib.PositionalArgumentsFormatter(),

        structlog.processors.TimeStamper(fmt="iso"),

        structlog.processors.StackInfoRenderer(),

        structlog.processors.format_exc_info,

        structlog.processors.UnicodeDecoder(),

        structlog.processors.JSONRenderer(),

    ],

    context_class=dict,

    logger_factory=structlog.stdlib.LoggerFactory(),

    wrapper_class=structlog.stdlib.BoundLogger,

    cache_logger_on_first_use=True,

)



logger = structlog.get_logger()

# Rate limiting

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager

async def lifespan(app: FastAPI):

    # Startup

    logger.info("Iniciando aplicación de gestión de accesos")

    create_tables()

    logger.info("Tablas de base de datos creadas/verificadas")

    yield

    # Shutdown

    logger.info("Cerrando aplicación de gestión de accesos")

# ✅ PRIMERO: Crea la app

app = FastAPI(

    title=settings.app_name,

    version=settings.app_version,

    description="""

    ## Sistema de Gestión de Accesos a Centros de Datos

    API REST para la gestión de accesos de visitantes a centros de datos.

    - Gestión de Personas

    - Centros de Datos

    - Áreas

    - Visitas

    - Autenticación JWT con roles

    - Seguridad: Rate limiting, CORS, validación

    """,

    openapi_url="/api/v1/openapi.json",

    docs_url="/docs",

    redoc_url="/redoc",

    lifespan=lifespan,

)



# Rate limit handler

app.state.limiter = limiter

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS

app.add_middleware(

    CORSMiddleware,

    allow_origins=settings.allowed_origins,

    allow_credentials=True,

    allow_methods=settings.allowed_methods,

    allow_headers=settings.allowed_headers,

)



# Trusted hosts

app.add_middleware(

    TrustedHostMiddleware,

    allowed_hosts=["*"],

)



# ✅ SEGUNDO: Monta archivos estáticos con manejo de errores (WINDOWS/LOCAL COMPATIBLE)

try:
    # Intenta crear la carpeta /src si no existe
    src_dir = Path(__file__).parent.parent / "static" / "src"
    src_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/src", StaticFiles(directory=str(src_dir)), name="static")
    logger.info(f"✓ Montada carpeta estática src: {src_dir}")
except Exception as e:
    logger.warning(f"⚠ Error montando /src (opcional): {e}")

# ✅ TERCERO: Monta carpetas de imágenes como archivos estáticos

base_img_path = Path(__file__).parent.parent / "html" / "mi-app" / "src" / "img"

try:

    app.mount("/imagenes/operadores", StaticFiles(directory=base_img_path / "operadores"), name="operadores")

    logger.info(f"✓ Montada carpeta operadores: {base_img_path / 'operadores'}")

except Exception as e:

    logger.warning(f"⚠ Error montando operadores: {e}")

try:

    app.mount("/imagenes/personas", StaticFiles(directory=base_img_path / "personas"), name="personas")

    logger.info(f"✓ Montada carpeta personas: {base_img_path / 'personas'}")

except Exception as e:

    logger.warning(f"⚠ Error montando personas: {e}")

try:

    app.mount("/imagenes/capturas", StaticFiles(directory=base_img_path / "capturas"), name="capturas")

    logger.info(f"✓ Montada carpeta capturas: {base_img_path / 'capturas'}")

except Exception as e:

    logger.warning(f"⚠ Error montando capturas: {e}")

@app.get("/", summary="Información de la API")

async def root():

    return {

        "message": "Sistema de Gestión de Accesos a Centros de Datos",

        "version": settings.app_version,

        "docs": "/docs",

        "redoc": "/redoc",

        "openapi": "/api/v1/openapi.json",

    }



@app.get("/health", summary="Estado de salud de la API")

async def health_check():

    return {

        "status": "healthy",

        "version": settings.app_version,

        "environment": "development" if settings.debug else "production",

    }



# ✅ CUARTO: Routers (después de mounts)

app.include_router(api_auth.router, prefix="/api/v1")

app.include_router(api_personas.router, prefix="/api/v1")

app.include_router(api_centros_datos.router, prefix="/api/v1")

app.include_router(api_visitas.router, prefix="/api/v1")

app.include_router(api_usuarios.router, prefix="/api/v1")

app.include_router(api_audit.router, prefix="/api/v1")

# Handlers de error globales

@app.exception_handler(HTTPException)

async def http_exception_handler(request: Request, exc: HTTPException):

    logger.error(

        "HTTP Exception",

        status_code=exc.status_code,

        detail=exc.detail,

        path=str(request.url),

        method=request.method,

    )



    return JSONResponse(

        status_code=exc.status_code,

        content={

            "error": {

                "status_code": exc.status_code,

                "detail": exc.detail,

                "path": request.url.path,

                "method": request.method,

            }

        },

    )



@app.exception_handler(Exception)

async def general_exception_handler(request: Request, exc: Exception):

    logger.error(

        "Unhandled Exception",

        error=str(exc),

        path=str(request.url),

        method=request.method,

        exc_info=True,

    )



    return JSONResponse(

        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,

        content={

            "error": {

                "status_code": 500,

                "detail": "Error interno del servidor",

                "path": request.url.path,

                "method": request.method,

            }

        },

    )



if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        "app.main:app",

        host="0.0.0.0",

        port=5050,

        reload=settings.debug,

        log_level=settings.log_level.lower(),

    )
