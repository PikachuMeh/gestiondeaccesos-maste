<<<<<<< HEAD
# Sistema de Gestión de Accesos a Centros de Datos

API REST desarrollada con FastAPI para la gestión de accesos de visitantes a centros de datos.

## 🏗️ Arquitectura

El sistema está diseñado con una arquitectura limpia y escalable:

```
gestiondeaccesos/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Punto de entrada de FastAPI
│   ├── config.py              # Configuración del sistema
│   ├── database.py            # Configuración de base de datos
│   ├── models/                # Modelos SQLAlchemy
│   ├── schemas/               # Esquemas Pydantic
│   ├── services/              # Lógica de negocio
│   ├── api/                   # Endpoints de la API
│   ├── auth/                  # Autenticación y autorización
│   └── middleware/            # Middleware personalizado
├── tests/                     # Pruebas unitarias e integración
├── migrations/                # Migraciones de Alembic
├── docker-compose.yml         # Configuración Docker
├── Dockerfile                 # Imagen Docker
├── requirements.txt           # Dependencias Python
└── README.md                  # Documentación
```

## 🚀 Características Principales

### Gestión de Entidades
- **Personas**: Registro y administración de visitantes
- **Centros de Datos**: Administración de centros de datos físicos
- **Áreas**: Gestión de áreas específicas (servidores, telecomunicaciones, cross connect)
- **Visitas**: Control de acceso y registro de visitas

### Seguridad
- **Autenticación JWT**: Sistema de tokens seguros
- **Autorización por Roles**: Administrador, Supervisor, Operador, Auditor
- **Rate Limiting**: Protección contra abuso de la API
- **CORS**: Configuración de acceso cross-origin
- **Validación de Datos**: Esquemas Pydantic para validación robusta

### Funcionalidades Avanzadas
- **Paginación**: Listados eficientes con paginación
- **Filtros y Búsqueda**: Búsqueda avanzada en múltiples campos
- **Estadísticas**: Reportes y métricas del sistema
- **Logging Estructurado**: Registro detallado de actividades
- **Documentación Automática**: OpenAPI/Swagger integrado

## 🛠️ Tecnologías Utilizadas

- **FastAPI**: Framework web moderno y rápido
- **SQLAlchemy**: ORM para Python
- **PostgreSQL**: Base de datos relacional
- **Alembic**: Migraciones de base de datos
- **Pydantic**: Validación de datos
- **JWT**: Autenticación basada en tokens
- **Docker**: Containerización
- **pytest**: Framework de pruebas

## 📋 Requisitos del Sistema

- Python 3.11+
- PostgreSQL 13+
- Docker (opcional)
- Git

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd gestiondeaccesos
```

### 2. Configurar Entorno Virtual

```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar Dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar Variables de Entorno

```bash
cp env.example .env
# Editar .env con tus configuraciones
```

### 5. Configurar Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb gestion_accesos

# Ejecutar migraciones
alembic upgrade head
```

### 6. Ejecutar la Aplicación

```bash
uvicorn app.main:app --reload
```

La API estará disponible en: `http://localhost:8000`

## 🐳 Instalación con Docker

### 1. Usar Docker Compose

```bash
docker-compose up -d
```

### 2. Verificar Servicios

```bash
docker-compose ps
```

### 3. Ver Logs

```bash
docker-compose logs -f app
```

## 📚 Documentación de la API

Una vez que la aplicación esté ejecutándose, puedes acceder a:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/v1/openapi.json`

## 🔐 Autenticación

### 1. Crear Usuario Administrador

```python
from app.services.usuario_service import UsuarioService
from app.models.usuario import RolUsuario

# Crear usuario administrador inicial
user_data = {
    "username": "admin",
    "email": "admin@empresa.com",
    "nombre_completo": "Administrador",
    "password": "AdminPassword123!",
    "rol": RolUsuario.ADMINISTRADOR
}

usuario_service = UsuarioService(db)
admin_user = usuario_service.create_user(user_data)
```

### 2. Obtener Token de Acceso

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin&password=AdminPassword123!"
```

### 3. Usar Token en Requests

```bash
curl -X GET "http://localhost:8000/api/v1/personas/" \
     -H "Authorization: Bearer <tu_token_aqui>"
```

## 🧪 Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
pytest

# Ejecutar con cobertura
pytest --cov=app --cov-report=html

# Ejecutar pruebas específicas
pytest tests/test_auth.py -v
```

## 📊 Endpoints Principales

### Autenticación
- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/auth/me` - Obtener usuario actual
- `POST /api/v1/auth/refresh` - Renovar token

### Personas
- `GET /api/v1/personas/` - Listar personas
- `POST /api/v1/personas/` - Crear persona
- `GET /api/v1/personas/{id}` - Obtener persona
- `PUT /api/v1/personas/{id}` - Actualizar persona
- `DELETE /api/v1/personas/{id}` - Eliminar persona

### Centros de Datos
- `GET /api/v1/centros-datos/` - Listar centros
- `POST /api/v1/centros-datos/` - Crear centro (Admin)
- `GET /api/v1/centros-datos/{id}` - Obtener centro
- `PUT /api/v1/centros-datos/{id}` - Actualizar centro (Admin)

### Áreas
- `GET /api/v1/areas/` - Listar áreas
- `POST /api/v1/areas/` - Crear área (Admin)
- `GET /api/v1/areas/{id}` - Obtener área
- `PUT /api/v1/areas/{id}` - Actualizar área (Admin)

### Visitas
- `GET /api/v1/visitas/` - Listar visitas
- `POST /api/v1/visitas/` - Crear visita
- `GET /api/v1/visitas/{id}` - Obtener visita
- `POST /api/v1/visitas/{id}/ingreso` - Registrar ingreso
- `POST /api/v1/visitas/{id}/salida` - Registrar salida

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Configuración de la aplicación
APP_NAME="Sistema de Gestión de Accesos"
DEBUG=false

# Base de datos
DATABASE_URL=postgresql://user:password@localhost/gestion_accesos

# Autenticación
SECRET_KEY=tu-clave-secreta-super-segura
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=["https://tu-frontend.com"]

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### Migraciones de Base de Datos

```bash
# Crear nueva migración
alembic revision --autogenerate -m "Descripción del cambio"

# Aplicar migraciones
alembic upgrade head

# Revertir migración
alembic downgrade -1
```

## 🚀 Despliegue en Producción

### 1. Configurar Variables de Entorno

```bash
# Configuración de producción
DEBUG=false
SECRET_KEY=clave-super-segura-de-produccion
DATABASE_URL=postgresql://user:password@prod-db:5432/gestion_accesos
```

### 2. Usar HTTPS

```bash
# Configurar certificados SSL
# Actualizar nginx.conf con configuración HTTPS
```

### 3. Configurar Backup de Base de Datos

```bash
# Script de backup automático
pg_dump gestion_accesos > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:

- Email: soporte@empresa.com
- Documentación: [Wiki del Proyecto](link-to-wiki)
- Issues: [GitHub Issues](link-to-issues)

## 🎯 Roadmap

- [ ] Integración con sistemas de videovigilancia
- [ ] Notificaciones en tiempo real
- [ ] Dashboard de métricas avanzadas
- [ ] API móvil nativa
- [ ] Integración con sistemas de identificación biométrica
- [ ] Reportes automáticos por email
- [ ] Sistema de alertas inteligentes

---

**Desarrollado con ❤️ para la gestión eficiente de accesos a centros de datos**
=======
# gestiondeaccesos
Sistema completo de gestión de accesos a centros de datos
>>>>>>> edd383fab7c2e08878afbaf93545ab822ea334d9
