# test_sqlalchemy.py
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

SCHEMA = "sistema_gestiones"
DATABASE_URL = "postgresql://admin01:123456@localhost/gestion_accesos"

# Crear engine sin pool
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={
        "options": f"-c search_path={SCHEMA},public"
    },
    echo=True  # Ver todos los queries
)

print("=" * 50)
print("PROBANDO CONEXIÓN CON SQLALCHEMY")
print("=" * 50)

try:
    with engine.connect() as conn:
        # Ver usuario actual
        result = conn.execute(text("SELECT current_user, current_database();"))
        user_db = result.fetchone()
        print(f"✓ Usuario: {user_db[0]}, Base de datos: {user_db[1]}")
        
        # Ver search_path
        result = conn.execute(text("SHOW search_path;"))
        path = result.fetchone()
        print(f"✓ Search path: {path[0]}")
        
        # Verificar permisos en el schema
        result = conn.execute(text("""
            SELECT has_schema_privilege('admin01', 'sistema_gestiones', 'CREATE');
        """))
        has_perm = result.fetchone()
        print(f"✓ Tiene permiso CREATE: {has_perm[0]}")
        
        # Intentar crear una tabla de prueba
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sistema_gestiones.test_tabla (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100)
            );
        """))
        conn.commit()
        print("✓ Tabla de prueba creada exitosamente")
        
        # Limpiar
        conn.execute(text("DROP TABLE IF EXISTS sistema_gestiones.test_tabla;"))
        conn.commit()
        print("✓ Tabla de prueba eliminada")
        
    print("\n✓ SQLAlchemy funciona correctamente")
    
except Exception as e:
    print(f"\n✗ ERROR CON SQLALCHEMY: {e}")
    import traceback
    traceback.print_exc()
