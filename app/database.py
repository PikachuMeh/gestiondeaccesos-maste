"""
Configuración de la base de datos SQLAlchemy.
Maneja la conexión y sesiones de base de datos.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

SCHEMA = "sistema_gestiones"

# Crear el motor SIN pool de conexiones (igual que el test que funcionó)
engine = create_engine(
    settings.database_url,
    poolclass=NullPool,
    connect_args={
        "options": f"-c search_path={SCHEMA},public"
    },
    echo=False  # Cambiar a True si quieres ver los queries
)

# Crear la sesión de base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para los modelos
Base = declarative_base()

def get_db():
    """
    Generador de dependencia para obtener sesión de base de datos.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Crea todas las tablas en la base de datos.
    El schema ya existe, no intentar crearlo.
    """
    # Verificar conexión y permisos
    print("Verificando conexión...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT current_user, current_database();"))
        user_db = result.fetchone()
        print(f"✓ Conectado como: {user_db[0]} en base de datos: {user_db[1]}")
        
        result = conn.execute(text("SELECT has_schema_privilege('admin01', 'sistema_gestiones', 'CREATE');"))
        has_perm = result.fetchone()
        print(f"✓ Tiene permiso CREATE: {has_perm[0]}")
    
    # Crear tablas
    print("Creando tablas...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tablas creadas/verificadas exitosamente")
