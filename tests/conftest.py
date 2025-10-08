"""
Configuración de pytest para las pruebas.
Proporciona fixtures comunes para todas las pruebas.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db, Base
from app.auth.jwt_handler import jwt_handler
from app.models.model_usuario import Usuario, RolUsuario
from app.services.usuario_service import UsuarioService

# Base de datos de prueba en memoria
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    """
    Fixture para el motor de base de datos de prueba.
    """
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """
    Fixture para la sesión de base de datos de prueba.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """
    Fixture para el cliente de prueba de FastAPI.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin_user(db_session):
    """
    Fixture para crear un usuario administrador de prueba.
    """
    usuario_service = UsuarioService(db_session)
    
    user_data = {
        "username": "admin_test",
        "email": "admin@test.com",
        "nombre_completo": "Administrador Test",
        "password": "TestPassword123!",
        "rol": RolUsuario.ADMINISTRADOR
    }
    
    user = usuario_service.create_user(user_data)
    return user


@pytest.fixture(scope="function")
def operator_user(db_session):
    """
    Fixture para crear un usuario operador de prueba.
    """
    usuario_service = UsuarioService(db_session)
    
    user_data = {
        "username": "operator_test",
        "email": "operator@test.com",
        "nombre_completo": "Operador Test",
        "password": "TestPassword123!",
        "rol": RolUsuario.OPERADOR
    }
    
    user = usuario_service.create_user(user_data)
    return user


@pytest.fixture(scope="function")
def admin_token(admin_user):
    """
    Fixture para crear un token JWT de administrador.
    """
    token = jwt_handler.create_token_for_user(
        user_id=admin_user.id,
        username=admin_user.username,
        rol=admin_user.rol
    )
    return token


@pytest.fixture(scope="function")
def operator_token(operator_user):
    """
    Fixture para crear un token JWT de operador.
    """
    token = jwt_handler.create_token_for_user(
        user_id=operator_user.id,
        username=operator_user.username,
        rol=operator_user.rol
    )
    return token


@pytest.fixture(scope="function")
def auth_headers_admin(admin_token):
    """
    Fixture para headers de autenticación de administrador.
    """
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def auth_headers_operator(operator_token):
    """
    Fixture para headers de autenticación de operador.
    """
    return {"Authorization": f"Bearer {operator_token}"}


@pytest.fixture(scope="function")
def sample_persona_data():
    """
    Fixture para datos de persona de prueba.
    """
    return {
        "nombre": "Juan",
        "apellido": "Pérez",
        "documento_identidad": "12345678",
        "tipo_documento": "CC",
        "email": "juan.perez@test.com",
        "telefono": "3001234567",
        "empresa": "Empresa Test",
        "cargo": "Técnico"
    }


@pytest.fixture(scope="function")
def sample_centro_datos_data():
    """
    Fixture para datos de centro de datos de prueba.
    """
    return {
        "nombre": "Centro de Datos Test",
        "codigo": "CDT001",
        "direccion": "Calle 123 #45-67",
        "ciudad": "Bogotá",
        "departamento": "Cundinamarca",
        "pais": "Colombia",
        "telefono_contacto": "6012345678",
        "email_contacto": "contacto@centrotest.com",
        "responsable": "Responsable Test"
    }


@pytest.fixture(scope="function")
def sample_area_data():
    """
    Fixture para datos de área de prueba.
    """
    return {
        "nombre": "Área de Servidores A",
        "codigo": "ASA001",
        "tipo": "servidores",
        "centro_datos_id": 1,
        "piso": "1",
        "sala": "A1",
        "capacidad_maxima": 10,
        "nivel_seguridad": "normal"
    }


@pytest.fixture(scope="function")
def sample_visita_data():
    """
    Fixture para datos de visita de prueba.
    """
    return {
        "persona_id": 1,
        "centro_datos_id": 1,
        "area_id": 1,
        "actividad": "mantenimiento",
        "descripcion_actividad": "Mantenimiento preventivo de servidores",
        "fecha_programada": "2024-01-15T10:00:00",
        "duracion_estimada": 120
    }
