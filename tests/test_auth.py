"""
Pruebas unitarias para el módulo de autenticación.
"""

import pytest
from fastapi.testclient import TestClient
from app.models.model_usuario import RolUsuario


class TestAuth:
    """Pruebas para el módulo de autenticación."""
    
    def test_login_success(self, client: TestClient, operator_user):
        """
        Prueba el login exitoso con credenciales válidas.
        """
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "operator_test",
                "password": "TestPassword123!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
    
    def test_login_invalid_credentials(self, client: TestClient):
        """
        Prueba el login con credenciales inválidas.
        """
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "invalid_user",
                "password": "invalid_password"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "incorrectos" in data["detail"]
    
    def test_login_json_success(self, client: TestClient, operator_user):
        """
        Prueba el login exitoso con datos JSON.
        """
        response = client.post(
            "/api/v1/auth/login-json",
            json={
                "username": "operator_test",
                "password": "TestPassword123!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_get_current_user(self, client: TestClient, auth_headers_operator):
        """
        Prueba obtener información del usuario actual.
        """
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "operator_test"
        assert data["email"] == "operator@test.com"
        assert data["rol"] == RolUsuario.OPERADOR.value
    
    def test_get_current_user_invalid_token(self, client: TestClient):
        """
        Prueba obtener información del usuario con token inválido.
        """
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
    
    def test_refresh_token(self, client: TestClient, auth_headers_operator):
        """
        Prueba la renovación de token.
        """
        response = client.post(
            "/api/v1/auth/refresh",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_logout(self, client: TestClient, auth_headers_operator):
        """
        Prueba el logout.
        """
        response = client.post(
            "/api/v1/auth/logout",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "cerrada" in data["message"]
    
    def test_protected_endpoint_without_auth(self, client: TestClient):
        """
        Prueba acceder a un endpoint protegido sin autenticación.
        """
        response = client.get("/api/v1/personas/")
        
        assert response.status_code == 401
    
    def test_protected_endpoint_with_auth(self, client: TestClient, auth_headers_operator):
        """
        Prueba acceder a un endpoint protegido con autenticación.
        """
        response = client.get(
            "/api/v1/personas/",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
    
    def test_admin_endpoint_with_operator(self, client: TestClient, auth_headers_operator):
        """
        Prueba acceder a un endpoint de administrador con rol de operador.
        """
        response = client.post(
            "/api/v1/centros-datos/",
            json={
                "nombre": "Test Center",
                "codigo": "TC001",
                "direccion": "Test Address",
                "ciudad": "Test City",
                "departamento": "Test Department"
            },
            headers=auth_headers_operator
        )
        
        assert response.status_code == 403
    
    def test_admin_endpoint_with_admin(self, client: TestClient, auth_headers_admin):
        """
        Prueba acceder a un endpoint de administrador con rol de administrador.
        """
        response = client.post(
            "/api/v1/centros-datos/",
            json={
                "nombre": "Test Center",
                "codigo": "TC001",
                "direccion": "Test Address",
                "ciudad": "Test City",
                "departamento": "Test Department"
            },
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
