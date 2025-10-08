"""
Pruebas unitarias para el módulo de centros de datos.
"""

import pytest
from fastapi.testclient import TestClient


class TestCentrosDatos:
    """Pruebas para el módulo de centros de datos."""
    
    def test_create_centro_datos_success(self, client: TestClient, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba la creación exitosa de un centro de datos.
        """
        response = client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == sample_centro_datos_data["nombre"]
        assert data["codigo"] == sample_centro_datos_data["codigo"]
        assert data["ciudad"] == sample_centro_datos_data["ciudad"]
        assert data["activo"] is True
    
    def test_create_centro_datos_duplicate_code(self, client: TestClient, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba la creación de un centro de datos con código duplicado.
        """
        # Crear primer centro de datos
        client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        # Intentar crear segundo centro con mismo código
        response = client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Ya existe un centro de datos con este código" in data["detail"]
    
    def test_create_centro_datos_operator_forbidden(self, client: TestClient, auth_headers_operator, sample_centro_datos_data):
        """
        Prueba que un operador no puede crear centros de datos.
        """
        response = client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_operator
        )
        
        assert response.status_code == 403
    
    def test_list_centros_datos(self, client: TestClient, auth_headers_operator, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba la listación de centros de datos.
        """
        # Crear un centro de datos
        client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        # Listar centros de datos
        response = client.get(
            "/api/v1/centros-datos/",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) == 1
    
    def test_get_centro_datos_by_id(self, client: TestClient, auth_headers_operator, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba obtener un centro de datos por ID.
        """
        # Crear un centro de datos
        create_response = client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        centro_id = create_response.json()["id"]
        
        # Obtener el centro de datos
        response = client.get(
            f"/api/v1/centros-datos/{centro_id}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == centro_id
        assert data["nombre"] == sample_centro_datos_data["nombre"]
    
    def test_get_centro_datos_not_found(self, client: TestClient, auth_headers_operator):
        """
        Prueba obtener un centro de datos que no existe.
        """
        response = client.get(
            "/api/v1/centros-datos/999",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "no encontrado" in data["detail"]
    
    def test_update_centro_datos(self, client: TestClient, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba la actualización de un centro de datos.
        """
        # Crear un centro de datos
        create_response = client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        centro_id = create_response.json()["id"]
        
        # Actualizar el centro de datos
        update_data = {
            "nombre": "Centro de Datos Actualizado",
            "telefono_contacto": "6012345679"
        }
        
        response = client.put(
            f"/api/v1/centros-datos/{centro_id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "Centro de Datos Actualizado"
        assert data["telefono_contacto"] == "6012345679"
    
    def test_delete_centro_datos(self, client: TestClient, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba la eliminación (soft delete) de un centro de datos.
        """
        # Crear un centro de datos
        create_response = client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        centro_id = create_response.json()["id"]
        
        # Eliminar el centro de datos
        response = client.delete(
            f"/api/v1/centros-datos/{centro_id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "eliminado exitosamente" in data["message"]
    
    def test_get_centro_datos_by_code(self, client: TestClient, auth_headers_operator, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba buscar un centro de datos por código.
        """
        # Crear un centro de datos
        client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        # Buscar por código
        response = client.get(
            f"/api/v1/centros-datos/codigo/{sample_centro_datos_data['codigo']}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["codigo"] == sample_centro_datos_data["codigo"]
    
    def test_get_centros_datos_by_ciudad(self, client: TestClient, auth_headers_operator, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba buscar centros de datos por ciudad.
        """
        # Crear un centro de datos
        client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        # Buscar por ciudad
        response = client.get(
            f"/api/v1/centros-datos/ciudad/{sample_centro_datos_data['ciudad']}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["ciudad"] == sample_centro_datos_data["ciudad"]
    
    def test_get_centros_datos_by_departamento(self, client: TestClient, auth_headers_operator, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba buscar centros de datos por departamento.
        """
        # Crear un centro de datos
        client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        # Buscar por departamento
        response = client.get(
            f"/api/v1/centros-datos/departamento/{sample_centro_datos_data['departamento']}",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["departamento"] == sample_centro_datos_data["departamento"]
    
    def test_centro_datos_stats(self, client: TestClient, auth_headers_operator, auth_headers_admin, sample_centro_datos_data):
        """
        Prueba obtener estadísticas de centros de datos.
        """
        # Crear un centro de datos
        client.post(
            "/api/v1/centros-datos/",
            json=sample_centro_datos_data,
            headers=auth_headers_admin
        )
        
        # Obtener estadísticas
        response = client.get(
            "/api/v1/centros-datos/stats/estadisticas",
            headers=auth_headers_operator
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_centros" in data
        assert "centros_activos" in data
        assert "centros_inactivos" in data
        assert data["total_centros"] == 1
        assert data["centros_activos"] == 1
