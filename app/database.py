"""
Configuración de la base de datos SQLAlchemy.
Maneja la conexión y sesiones de base de datos.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

SCHEMA = "sistema_gestiones"

# Crear el motor de base de datos con search_path
engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"options": f"-c search_path={SCHEMA},public"},
)

# Crear la sesión de base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para los modelos
Base = declarative_base()

def get_db():
    """
    Generador de dependencia para obtener sesión de base de datos.
    Se usa como dependencia en FastAPI para inyección de dependencias.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Crea el esquema si no existe y luego todas las tablas en la base de datos.
    Se ejecuta al inicializar la aplicación.
    """
    # Crear esquema si no existe
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))

    # Crear tablas (usarán el esquema fijado en __table_args__)
    Base.metadata.create_all(bind=engine)
