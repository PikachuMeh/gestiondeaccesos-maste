"""
Pruebas unitarias para el módulo de personas.
"""

import pytest
from fastapi.testclient import TestClient


class TestPersonas:
    """Pruebas para el módulo de personas."""
    
    def test_create_persona_success(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba la creación exitosa de una persona.
        """
        response = client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == sample_persona_data["nombre"]
        assert data["apellido"] == sample_persona_data["apellido"]
        assert data["documento_identidad"] == sample_persona_data["documento_identidad"]
        assert data["activo"] is True
    
    def test_create_persona_duplicate_document(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba la creación de una persona con documento duplicado.
        """
        # Crear primera persona
        client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        
        # Intentar crear segunda persona con mismo documento
        response = client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Ya existe una persona con este número de documento" in data["detail"]
    
    def test_create_persona_invalid_data(self, client: TestClient, auth_headers_operator):
        """
        Prueba la creación de una persona con datos inválidos.
        """
        invalid_data = {
            "nombre": "",  # Nombre vacío
            "apellido": "Pérez",
            "documento_identidad": "123",
            "tipo_documento": "INVALID"
        }
        
        response = client.post(
            "/api/v1/personas/",
            json=invalid_data,
            headers=auth_headers_operator
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_list_personas(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba la listación de personas.
        """
        # Crear una persona
        client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        
        # Listar personas
        response = client.get(
            "/api/v1/personas/",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data
        assert len(data["items"]) == 1
    
    def test_get_persona_by_id(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba obtener una persona por ID.
        """
        # Crear una persona
        create_response = client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        persona_id = create_response.json()["id"]
        
        # Obtener la persona
        response = client.get(
            f"/api/v1/personas/{persona_id}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == persona_id
        assert data["nombre"] == sample_persona_data["nombre"]
    
    def test_get_persona_not_found(self, client: TestClient, auth_headers_operator):
        """
        Prueba obtener una persona que no existe.
        """
        response = client.get(
            "/api/v1/personas/999",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "no encontrada" in data["detail"]
    
    def test_update_persona(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba la actualización de una persona.
        """
        # Crear una persona
        create_response = client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        persona_id = create_response.json()["id"]
        
        # Actualizar la persona
        update_data = {
            "nombre": "Juan Carlos",
            "telefono": "3009876543"
        }
        
        response = client.put(
            f"/api/v1/personas/{persona_id}",
            json=update_data,
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "Juan Carlos"
        assert data["telefono"] == "3009876543"
    
    def test_delete_persona(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba la eliminación (soft delete) de una persona.
        """
        # Crear una persona
        create_response = client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        persona_id = create_response.json()["id"]
        
        # Eliminar la persona
        response = client.delete(
            f"/api/v1/personas/{persona_id}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "eliminada exitosamente" in data["message"]
        
        # Verificar que la persona ya no se puede obtener
        get_response = client.get(
            f"/api/v1/personas/{persona_id}",
            headers=auth_headers_operator
        )
        assert get_response.status_code == 404
    
    def test_get_persona_by_document(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba buscar una persona por documento.
        """
        # Crear una persona
        client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        
        # Buscar por documento
        response = client.get(
            f"/api/v1/personas/documento/{sample_persona_data['documento_identidad']}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["documento_identidad"] == sample_persona_data["documento_identidad"]
    
    def test_get_personas_by_empresa(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba buscar personas por empresa.
        """
        # Crear una persona
        client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        
        # Buscar por empresa
        response = client.get(
            f"/api/v1/personas/empresa/{sample_persona_data['empresa']}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["empresa"] == sample_persona_data["empresa"]
    
    def test_persona_stats(self, client: TestClient, auth_headers_operator, sample_persona_data):
        """
        Prueba obtener estadísticas de personas.
        """
        # Crear una persona
        client.post(
            "/api/v1/personas/",
            json=sample_persona_data,
            headers=auth_headers_operator
        )
        
        # Obtener estadísticas
        response = client.get(
            "/api/v1/personas/stats/estadisticas",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_personas" in data
        assert "personas_activas" in data
        assert "personas_inactivas" in data
        assert data["total_personas"] == 1
        assert data["personas_activas"] == 1
