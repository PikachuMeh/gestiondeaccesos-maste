# 📋 Manual Técnico: Sistema de Gestión de Accesos a Centros de Datos

**Fecha:** Diciembre 2025  
**Versión:** 1.0  
**Autor:** Equipo de Desarrollo - SENIAT  
**Estado:** En Producción (Parcial)

---

## 📑 Tabla de Contenidos

1. [Descripción General del Sistema](#descripción-general)
2. [Arquitectura y Componentes](#arquitectura)
3. [Requisitos Previos](#requisitos-previos)
4. [Despliegue con Docker Compose](#despliegue)
5. [Configuración de Variables de Entorno](#configuración)
6. [Estructura de Base de Datos](#estructura-base-datos)
7. [Documentación de Endpoints](#endpoints)
8. [Notificaciones y Integraciones](#notificaciones)
9. [Instrucciones de Uso](#instrucciones)
10. [Scripts de Inicialización](#scripts)

---

## 🎯 Descripción General del Sistema {#descripción-general}

El **Sistema de Gestión de Accesos a Centros de Datos** es una aplicación empresarial desarrollada para la gestión integral de visitantes, control de acceso y auditoría en centros de datos. Permite registrar personas, planificar visitas, validar ingresos/egresos y generar reportes con trazabilidad completa.

### Características Principales

- ✅ **Gestión CRUD** de Personas, Centros de Datos, Áreas y Visitas
- ✅ **Autenticación JWT** con roles (Admin, Supervisor, Operador, Auditor)
- ✅ **Control de Acceso** mediante check-in/check-out
- ✅ **Generación de PDFs** con fichas de visita
- ✅ **Notificaciones** por Correo y Telegram
- ✅ **Auditoría Completa** de todas las acciones
- ✅ **Búsqueda y Filtrados** avanzados
- ⚠️ **No incluye:** Reconocimiento facial y reconocimiento dactilar (Futuros)

### Stack Tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| **Backend** | FastAPI + Python | 3.11+ |
| **Base de Datos** | PostgreSQL | 13+ |
| **Frontend** | React + Vite | Latest |
| **ORM** | SQLAlchemy | 2.x |
| **Autenticación** | JWT (HS256) | - |
| **Containerización** | Docker + Docker Compose | Latest |
| **Proxy Reverso** | Nginx | Alpine |
| **Cache** | Redis | 7-Alpine |

---

## 🏗️ Arquitectura y Componentes {#arquitectura}

### Diagrama de Servicios

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cliente Web (React + Vite)                   │
│                    http://172.16.56.102:3000                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx (Proxy Reverso)                        │
│                    Puerto 8080/8443                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                              │
│                    Puerto 5050 (Interno: 8000)                  │
│  ┌──────────────┬──────────────────┬──────────────┐             │
│  │ api_auth.py  │ api_visitas.py   │ api_personas │ ...         │
│  └──────────────┴──────────────────┴──────────────┘             │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴──────┐  ┌──────────┴────────┐  ┌──────┴───────┐
│ PostgreSQL   │  │      Redis        │  │   Telegram   │
│ Puerto 5432  │  │   Puerto 6379     │  │   Bot API    │
└──────────────┘  └───────────────────┘  └──────────────┘
```

### Estructura de Directorios

```
gestiondeaccesos/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Punto de entrada
│   ├── config.py                  # Configuración
│   ├── database.py                # Conexión DB
│   ├── models/                    # SQLAlchemy Models
│   │   └── __init__.py
│   ├── schemas/                   # Pydantic Schemas
│   │   ├── __init__.py
│   │   └── esquema_*.py
│   ├── services/                  # Lógica de Negocio
│   │   ├── visita_service.py
│   │   ├── persona_service.py
│   │   └── usuario_service.py
│   ├── api/                       # Endpoints
│   │   ├── api_auth.py
│   │   ├── api_visitas.py
│   │   ├── api_personas.py
│   │   ├── api_usuarios.py
│   │   ├── api_centros_datos.py
│   │   └── api_audit.py
│   ├── auth/                      # Autenticación
│   │   ├── jwt_handler.py
│   │   └── api_permisos.py
│   ├── middleware/                # Middleware
│   │   └── __init__.py
│   └── utils/                     # Utilidades
│       ├── pdf_generator.py
│       ├── telegram.py
│       ├── email_service.py
│       └── log_utils.py
├── tests/
│   ├── test_auth.py
│   └── test_visitas.py
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.frontend
├── nginx.conf
├── nginx-frontend.conf
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚙️ Requisitos Previos {#requisitos-previos}

### Software Requerido

- **Docker** ≥ 20.10 ([Descarga](https://www.docker.com/))
- **Docker Compose** ≥ 1.29
- **PostgreSQL** 13+ (cliente psql opcional)
- **Git** (para clonar repositorio)

### Hardware Mínimo Recomendado

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4GB | 8GB |
| **Almacenamiento** | 20GB | 50GB |
| **Conexión** | 1Mbps | 10Mbps |

### Puertos a Disponibilizar

| Servicio | Puerto | Uso |
|----------|--------|-----|
| Frontend (Nginx) | 3000 | Interfaz Web |
| Backend (FastAPI) | 5050 | API REST |
| Proxy (Nginx) | 8080/8443 | Balanceo de Carga |
| PostgreSQL | 5432 | Base de Datos |
| Redis | 6379 | Cache |

---

## 🚀 Despliegue con Docker Compose {#despliegue}

### Paso 1: Preparación Inicial

```bash
# 1. Clonar el repositorio
git clone <URL_REPOSITORIO> gestiondeaccesos
cd gestiondeaccesos

# 2. Crear archivo .env desde el ejemplo
cp .env.example .env

# 3. Crear directorio para imágenes si no existe
mkdir -p html/mi-app/src/img/{personas,operadores,capturas}
mkdir -p app/files/images/{personas,operadores}
```

### Paso 2: Configuración de Variables de Entorno

**Editar `.env` con valores apropiados:**

```bash
nano .env  # o tu editor preferido
```

### Paso 3: Verificar Base de Datos

**⚠️ CRÍTICO: La BD debe estar corriendo localmente ANTES de iniciar Docker**

```bash
# Verificar que PostgreSQL está en ejecución
psql -U postgres -h localhost -c "SELECT version();"

# Crear BD si no existe (opcional, se puede hacer después)
createdb gestion_accesos
```

### Paso 4: Iniciar Servicios con Docker Compose

```bash
# Construir imágenes
docker-compose build

# Iniciar servicios en segundo plano
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f app

# Específico para un servicio
docker-compose logs -f app
docker-compose logs -f frontend
docker-compose logs -f redis
```

### Paso 5: Verificar Despliegue

```bash
# Probar Backend
curl -s http://localhost:5050/docs | head -20

# Probar Frontend
curl -s http://localhost:3000 | head -20

# Verificar conectividad de BD (dentro del contenedor)
docker-compose exec app psql -U postgres -h host.docker.internal -d gestion_accesos -c "SELECT 1;"
```

---

## 🔧 Configuración de Variables de Entorno {#configuración}

### .env Backend

```env
# ============================================================
# APLICACIÓN
# ============================================================
APP_NAME=Sistema de Gestión de Accesos
APP_VERSION=1.0.0
DEBUG=true

# ============================================================
# BASE DE DATOS (IMPORTANTE)
# ============================================================
# Formato: postgresql://usuario:contraseña@host:puerto/bd
DATABASE_URL=postgresql://postgres:123456@localhost:5432/gestion_accesos
DATABASE_ECHO=false

# ============================================================
# AUTENTICACIÓN JWT
# ============================================================
# ⚠️ CAMBIAR EN PRODUCCIÓN
SECRET_KEY=tu-clave-secreta-super-segura-aqui-cambiar-en-produccion
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ============================================================
# TELEGRAM (Notificaciones)
# ============================================================
TELEGRAM_BOT_TOKEN=8376318634:AAEzX5IeSScGbgbE
TELEGRAM_CHAT_ID=-5003259235

# ============================================================
# CORS (Origen Permitido)
# ============================================================
ALLOWED_ORIGINS='["http://localhost:5173","http://localhost:3000","http://localhost:8080","http://172.16.56.102:3000","http://172.16.56.102:5173"]'
ALLOWED_METHODS='["GET","POST","PUT","DELETE","PATCH"]'
ALLOWED_HEADERS='["*"]'

# ============================================================
# RATE LIMITING
# ============================================================
rate_limit_requests=100
rate_limit_window=60

# ============================================================
# LOGGING
# ============================================================
log_level=INFO
log_format=json

# ============================================================
# CORREO (Email Notifications)
# ============================================================
MAIL_USERNAME=operacionesseniat19@gmail.com
MAIL_PASSWORD=wohqrgukgncgjcet
MAIL_FROM=operacionesseniat19@gmail.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM_NAME=Sistema SENIAT
MAIL_TLS=true
MAIL_SSL=false

# ============================================================
# FRONTEND URL
# ============================================================
FRONTEND_URL=http://localhost:5173

# ============================================================
# RUTAS DE CARGA DE ARCHIVOS
# ============================================================
UPLOAD_OPERADORES_PATH=../html/mi-app/src/img/operadores/
UPLOAD_PERSONAS_PATH=../html/mi-app/src/img/personas/
UPLOAD_CAPTURAS_PATH=../html/mi-app/src/img/capturas/

# URLs públicas para acceso remoto
UPLOAD_OPERADORES_URL=http://172.16.56.102:5050/imagenes/operadores/
UPLOAD_PERSONAS_URL=http://172.16.56.102:5050/imagenes/personas/
UPLOAD_CAPTURAS_URL=http://172.16.56.102:5050/imagenes/capturas/

# ============================================================
# LÍMITE DE CARGA
# ============================================================
UPLOAD_MAX_SIZE_MB=5
UPLOAD_ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp
```

### .env Frontend

```env
VITE_API_BASE_URL=http://172.16.56.102:5050
VITE_OPERADORES_IMG_URL=http://172.16.56.102:5050/src/img/operadores/
```

### Consideraciones de Seguridad

- **Producción:** Cambiar `SECRET_KEY` a una cadena aleatoria y segura
- **CORS:** Ajustar `ALLOWED_ORIGINS` solo a dominios autorizados
- **Credenciales:** Nunca commitear `.env` a Git (usar `.env.example`)
- **HTTPS:** En producción, usar certificados SSL válidos con Nginx

---

## 🗄️ Estructura de Base de Datos {#estructura-base-datos}

### Schema: `sistema_gestiones`

El sistema utiliza un esquema dedicado para todas las tablas:

```sql
CREATE SCHEMA IF NOT EXISTS sistema_gestiones;
```

### Tablas Principales

#### 1. **personas** - Registro de Visitantes

```sql
CREATE TABLE sistema_gestiones.personas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    documento_identidad VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    empresa VARCHAR(200) NOT NULL,
    cargo VARCHAR(100),
    direccion TEXT NOT NULL,
    observaciones TEXT,
    foto VARCHAR(250) NOT NULL,
    departamento VARCHAR(100),
    unidad VARCHAR(100),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Relaciones:** 1 Persona → N Visitas

---

#### 2. **centro_datos** - Centros de Datos

```sql
CREATE TABLE sistema_gestiones.centro_datos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) UNIQUE NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    pais VARCHAR(100) DEFAULT 'Colombia',
    telefono_contacto VARCHAR(20),
    email_contacto VARCHAR(255),
    descripcion TEXT,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Relaciones:** 1 CentroDatos → N Áreas → N Visitas

---

#### 3. **area** - Áreas de Acceso

```sql
CREATE TABLE sistema_gestiones.area (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    id_centro_datos INTEGER NOT NULL REFERENCES sistema_gestiones.centro_datos(id)
);
```

**Tipos de Áreas:**
- Servidores
- Telecomunicaciones
- Cross Connect
- Otras

---

#### 4. **usuario** - Usuarios del Sistema

```sql
CREATE TABLE sistema_gestiones.usuario (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    apellidos VARCHAR(200) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES sistema_gestiones.roles(id_rol),
    telefono VARCHAR(20),
    departamento VARCHAR(100),
    observaciones TEXT,
    foto_path VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ
);
```

---

#### 5. **roles** - Control de Acceso

```sql
CREATE TABLE sistema_gestiones.roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(255) UNIQUE NOT NULL
);
```

**Roles Predefinidos:**
1. **Administrador** - Acceso total
2. **Supervisor** - Gestión de visitas
3. **Operador** - Registro check-in/out
4. **Auditor** - Solo lectura

---

#### 6. **visitas** - Registro de Visitas

```sql
CREATE TABLE sistema_gestiones.visitas (
    id SERIAL PRIMARY KEY,
    codigo_visita VARCHAR(20) UNIQUE NOT NULL,
    persona_id INTEGER NOT NULL REFERENCES sistema_gestiones.personas(id),
    centro_datos_id INTEGER NOT NULL REFERENCES sistema_gestiones.centro_datos(id),
    estado_id INTEGER NOT NULL REFERENCES sistema_gestiones.estado_visita(id_estado),
    tipo_actividad_id INTEGER NOT NULL REFERENCES sistema_gestiones.tipo_actividad(id_tipo_actividad),
    area_id INTEGER REFERENCES sistema_gestiones.area(id),
    descripcion_actividad TEXT NOT NULL,
    fecha_programada TIMESTAMPTZ NOT NULL,
    fecha_ingreso TIMESTAMPTZ,
    fecha_salida TIMESTAMPTZ,
    duracion_estimada INTEGER,
    autorizado_por VARCHAR(200),
    motivo_autorizacion TEXT,
    equipos_ingresados TEXT,
    equipos_retirados TEXT,
    observaciones TEXT,
    notas_finales TEXT,
    activo BOOLEAN DEFAULT TRUE,
    centros_datos_ids JSON,
    areas_ids JSON,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ
);
```

**Estados Válidos:**
- Pendiente
- En Progreso
- Completada
- Cancelada

**Tipos de Actividad:**
- Mantenimiento
- Consultoría
- Instalación
- Auditoría
- Capacitación

---

#### 7. **estado_visita** - Estados de Visita

```sql
CREATE TABLE sistema_gestiones.estado_visita (
    id_estado SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(255) UNIQUE NOT NULL
);
```

---

#### 8. **tipo_actividad** - Tipos de Actividad

```sql
CREATE TABLE sistema_gestiones.tipo_actividad (
    id_tipo_actividad SERIAL PRIMARY KEY,
    nombre_actividad VARCHAR(255) UNIQUE NOT NULL
);
```

---

#### 9. **control** - Auditoría

```sql
CREATE TABLE sistema_gestiones.control (
    id SERIAL PRIMARY KEY,
    realizado VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    hora VARCHAR(8) NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES sistema_gestiones.usuario(id),
    detalles TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    tabla_afectada VARCHAR(50),
    registro_id INTEGER
);
```

### Script de Inicialización de BD

```bash
# 1. Conectar a PostgreSQL
psql -U postgres

# 2. Ejecutar dentro de psql
CREATE DATABASE gestion_accesos;

\c gestion_accesos

-- Crear esquema
CREATE SCHEMA IF NOT EXISTS sistema_gestiones;

-- Crear roles
INSERT INTO sistema_gestiones.roles (nombre_rol) VALUES
('Administrador'),
('Supervisor'),
('Operador'),
('Auditor');

-- Crear estados de visita
INSERT INTO sistema_gestiones.estado_visita (nombre_estado) VALUES
('En Progreso'),
('Completada');


-- Crear tipos de actividad
INSERT INTO sistema_gestiones.tipo_actividad (nombre_actividad) VALUES
('Mantenimiento'),
('Consultoría'),
('Instalación'),
('Auditoría'),
('Capacitación'),
('Otro');
```

---

## 📡 Documentación de Endpoints {#endpoints}

### Base URL

```
http://172.16.56.102:5050
http://172.16.56.102:8080 (con Nginx)
```

### Documentación Interactiva

- **Swagger UI:** http://172.16.56.102:5050/docs
- **ReDoc:** http://172.16.56.102:5050/redoc

---

### 🔐 API Autenticación (`/auth`)

#### 1. Login (Form Data)

```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=operador1&password=123456
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 345600
}
```

---

#### 2. Login JSON

```http
POST /auth/login-json
Content-Type: application/json

{
  "username": "operador1",
  "password": "123456"
}
```

---

#### 3. Obtener Perfil Actual

```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "username": "operador1",
  "email": "operador@seniat.gob.ve",
  "nombre": "Carlos",
  "apellidos": "López",
  "rol_id": 3,
  "foto": "/src/img/operadores/operador1.jpg",
  "activo": true
}
```

---

#### 4. Renovar Token

```http
POST /auth/refresh
Authorization: Bearer <token>
```

---

#### 5. Cerrar Sesión

```http
POST /auth/logout
Authorization: Bearer <token>
```

---

### 👥 API Personas (`/personas`)

#### 1. Crear Persona

```http
POST /personas
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
  "nombre": "Juan",
  "apellido": "Pérez",
  "documento_identidad": "V-12345678",
  "email": "juan@empresa.com",
  "empresa": "TechCorp",
  "cargo": "Ingeniero",
  "direccion": "Calle Principal 123",
  "departamento": "TI",
  "unidad": "Infraestructura",
  "foto": <archivo_imagen>
}
```

**Response (201):**
```json
{
  "id": 1,
  "nombre": "Juan",
  "apellido": "Pérez",
  "documento_identidad": "V-12345678",
  "email": "juan@empresa.com",
  "empresa": "TechCorp",
  "foto": "juan_perez.jpg",
  "fecha_creacion": "2025-12-03T10:30:00Z"
}
```

---

#### 2. Listar Personas

```http
GET /personas?skip=0&limit=10&search=V-123&empresa=TechCorp
Authorization: Bearer <token>
```

**Parámetros:**
- `skip`: Saltar registros (pagination)
- `limit`: Cantidad máxima
- `search`: Búsqueda por nombre o cédula

**Response:**
```json
{
  "items": [...],
  "total": 25,
  "page": 1,
  "size": 10,
  "pages": 3
}
```

---

#### 3. Obtener Persona

```http
GET /personas/1
Authorization: Bearer <token>
```

---

#### 4. Actualizar Persona

```http
PUT /personas/1
Content-Type: application/json
Authorization: Bearer <token>

{
  "cargo": "Senior Ingeniero",
  "empresa": "TechCorp Plus"
}
```

---

#### 5. Eliminar Persona

```http
DELETE /personas/1
Authorization: Bearer <token>
```

---

### 🏢 API Centros de Datos (`/centros-datos`)

#### 1. Crear Centro de Datos

```http
POST /centros-datos
Content-Type: application/json
Authorization: Bearer <token>

{
  "nombre": "Centro SENIAT Caracas",
  "codigo": "CD-001",
  "direccion": "Av. Libertador 1000",
  "ciudad": "Caracas",
  "pais": "Venezuela",
  "telefono_contacto": "+58-212-111-2222",
  "email_contacto": "contacto@seniat.gob.ve",
  "descripcion": "Centro principal de datos"
}
```

---

#### 2. Listar Centros (con Paginación)

```http
GET /centros-datos?page=1&size=10&ciudad=Caracas
Authorization: Bearer <token>
```

---

#### 3. Obtener Centro

```http
GET /centros-datos/1
Authorization: Bearer <token>
```

---

#### 4. Actualizar Centro

```http
PUT /centros-datos/1
Content-Type: application/json
Authorization: Bearer <token>

{
  "telefono_contacto": "+58-212-333-4444",
  "activo": true
}
```

---

#### 5. Eliminar Centro

```http
DELETE /centros-datos/1
Authorization: Bearer <token>
```

---

### 📍 API Áreas (`/areas`)

#### 1. Crear Área

```http
POST /areas
Content-Type: application/json
Authorization: Bearer <token>

{
  "nombre": "Sala de Servidores",
  "id_centro_datos": 1
}
```

---

#### 2. Obtener Áreas por Centro

```http
GET /visitas/areas/1
```

**Response:**
```json
[
  {"id": 1, "nombre": "Sala de Servidores"},
  {"id": 2, "nombre": "Telecomunicaciones"}
]
```

---

### ✅ API Visitas (`/visitas`)

#### 1. Crear Visita

```http
POST /visitas
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
  "persona_id": 1,
  "centro_datos_id": 1,
  "area_id": 1,
  "estado_id": 1,
  "tipo_actividad_id": 1,
  "descripcion_actividad": "Mantenimiento de servidor principal",
  "fecha_programada": "2025-12-10T14:00:00Z",
  "autorizado_por": "Carlos López",
  "equipos_ingresados": "Laptop, herramientas",
  "foto": <archivo_imagen>,
  "centro_datos_ids": "[1, 2]",
  "area_ids": "[1, 2]"
}
```

---

#### 2. Listar Visitas

```http
GET /visitas?skip=0&limit=10&search=V-123&estado_id=1&fecha_desde=2025-12-01&fecha_hasta=2025-12-31
Authorization: Bearer <token>
```

**Filtros Disponibles:**
- `search`: Cédula o nombre de persona
- `persona_id`: ID de la persona
- `centro_datos_id`: ID del centro
- `area_id`: ID del área
- `estado_id`: ID del estado
- `tipo_actividad_id`: ID del tipo
- `fecha_desde`: Fecha inicio (YYYY-MM-DD)
- `fecha_hasta`: Fecha fin (YYYY-MM-DD)

---

#### 3. Obtener Visita

```http
GET /visitas/1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "codigo_visita": "123456789",
  "persona_id": 1,
  "centro_datos_id": 1,
  "estado_id": 1,
  "tipo_actividad_id": 1,
  "descripcion_actividad": "Mantenimiento...",
  "fecha_programada": "2025-12-10T14:00:00Z",
  "fecha_ingreso": null,
  "fecha_salida": null,
  "estado": {"nombre_estado": "Pendiente"},
  "actividad": {"nombre_actividad": "Mantenimiento"},
  "persona": {"nombre": "Juan", "apellido": "Pérez"},
  "centro_datos": {"nombre": "Centro SENIAT Caracas"}
}
```

---

#### 4. Obtener Historial de Persona

```http
GET /visitas/persona/1/historial
Authorization: Bearer <token>
```

---

#### 5. Descargar PDF de Visita

```http
GET /visitas/1/pdf
Authorization: Bearer <token>
```

**Response:** PDF stream
- Nombre: `constancia_<codigo_visita>.pdf`
- Contiene: Datos personales, foto, centros, áreas, detalles

---

#### 6. Obtener Tipos de Actividad

```http
GET /visitas/tipo_actividad
Authorization: Bearer <token>
```

**Response:**
```json
[
  {"id_tipo_actividad": 1, "nombre_actividad": "Mantenimiento"},
  {"id_tipo_actividad": 2, "nombre_actividad": "Consultoría"},
  {"id_tipo_actividad": 3, "nombre_actividad": "Instalación"},
  {"id_tipo_actividad": 4, "nombre_actividad": "Auditoría"},
  {"id_tipo_actividad": 5, "nombre_actividad": "Capacitación"}
]
```

---

#### 7. Obtener Centros de Datos (Rápido)

```http
GET /visitas/centros-datos
Authorization: Bearer <token>
```

---

### 👤 API Usuarios (`/usuarios`)

#### 1. Crear Usuario

```http
POST /usuarios
Content-Type: application/json
Authorization: Bearer <token_admin>

{
  "cedula": "V-98765432",
  "username": "carlos.lopez",
  "email": "carlos@seniat.gob.ve",
  "nombre": "Carlos",
  "apellidos": "López",
  "password": "SecurePassword123!",
  "rol_id": 3,
  "departamento": "Operaciones",
  "telefono": "+58-212-111-1111"
}
```

---

#### 2. Listar Usuarios

```http
GET /usuarios?page=1&size=10&rol_id=3
Authorization: Bearer <token_admin>
```

---

#### 3. Obtener Usuario

```http
GET /usuarios/1
Authorization: Bearer <token_admin>
```

---

#### 4. Actualizar Usuario

```http
PUT /usuarios/1
Content-Type: application/json
Authorization: Bearer <token_admin>

{
  "departamento": "Supervisión",
  "activo": true
}
```

---

#### 5. Cambiar Contraseña

```http
POST /usuarios/1/cambiar-password
Content-Type: application/json
Authorization: Bearer <token>

{
  "password_actual": "OldPassword123!",
  "password_nueva": "NewPassword456!"
}
```

---

### 📊 API Auditoría (`/audit`)

#### 1. Listar Logs de Auditoría

```http
GET /audit/logs?page=1&size=20&tabla_afectada=visitas&fecha_desde=2025-12-01
Authorization: Bearer <token_auditor>
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "realizado": "crear_visita",
      "fecha": "2025-12-03",
      "hora": "10:30:45",
      "usuario_id": 1,
      "tabla_afectada": "visitas",
      "registro_id": 1,
      "ip_address": "192.168.1.100",
      "detalles": {"codigo": "123456789"}
    }
  ],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

---

#### 2. Obtener Estadísticas de Auditoría

```http
GET /audit/stats?fecha_desde=2025-12-01&fecha_hasta=2025-12-31
Authorization: Bearer <token_auditor>
```

---

## 📨 Notificaciones e Integraciones {#notificaciones}

### Telegram Bot Notifications

Después de cada visita completada, el sistema envía un mensaje automático a un canal de Telegram.

#### Configuración

```python
# .env
TELEGRAM_BOT_TOKEN=8376318634:AAEzX5IeSScGbgbE
TELEGRAM_CHAT_ID=-5003259235  # Grupo o canal (negativo para grupos privados)
```

#### Implementación (`app/utils/telegram.py`)

```python
async def enviar_notificacion_telegram(visita_data: dict) -> bool:
    """
    Envía notificación a Telegram con datos de la visita.
    
    Args:
        visita_data: Diccionario con:
            - codigo_visita
            - persona_nombre
            - persona_cedula
            - centro_nombre
            - tipo_actividad
            - fecha_ingreso
    
    Returns:
        bool: True si se envió exitosamente
    """
    message = f"""
🔔 *NUEVA VISITA REGISTRADA*
━━━━━━━━━━━━━━━━━━━━━━━
📌 Código: `{visita_data['codigo_visita']}`
👤 Visitante: {visita_data['persona_nombre']} ({visita_data['persona_cedula']})
🏢 Centro: {visita_data['centro_nombre']}
🔧 Actividad: {visita_data['tipo_actividad']}
⏰ Ingreso: {visita_data['fecha_ingreso']}
    """
    # Envío vía Telegram API...
```

#### Mensajes Automáticos

- ✅ **Check-in completado:** Notificación inmediata
- ✅ **Check-out completado:** Resumen de duración
- ✅ **Visita aprobada:** Confirmación al operador
- ⚠️ **Intento fallido:** Alerta de seguridad

### Notificaciones por Correo

El sistema puede enviar fichas de visita por correo electrónico.

#### Configuración SMTP

```env
MAIL_USERNAME=operacionesseniat19@gmail.com
MAIL_PASSWORD=wohqrgukgncgjcet
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_TLS=true
MAIL_SSL=false
```

#### Generación de PDF

```python
# app/utils/pdf_generator.py
def generar_pdf_visita(visita_data: dict) -> bytes:
    """
    Genera PDF con datos de la visita.
    
    Incluye:
    - Datos personales del visitante
    - Foto del visitante
    - Centros y áreas autorizadas
    - Horarios de ingreso/egreso
    - Observaciones
    """
    # Retorna bytes del PDF...
```

---

## 📖 Instrucciones de Uso {#instrucciones}

### Flujo Típico de Visita

```
1. REGISTRAR PERSONA
   ├─ POST /personas
   └─ Cargar foto (obligatorio)

2. AGENDAR VISITA
   ├─ POST /visitas
   ├─ Asociar persona, centro, área
   └─ Fecha programada

3. APROBAR VISITA (Supervisor)
   ├─ GET /visitas/{id}
   └─ Validar autorización

4. CHECK-IN (Operador)
   ├─ POST /visitas/{id}/check-in
   ├─ Cargar foto de llegada
   ├─ Generar PDF
   └─ Enviar notificación Telegram

5. CHECK-OUT (Operador)
   ├─ POST /visitas/{id}/check-out
   ├─ Cargar foto de salida
   └─ Actualizar estado

6. DESCARGAR FICHA
   ├─ GET /visitas/{id}/pdf
   └─ Enviar por correo (opcional)

7. AUDITORÍA
   ├─ GET /audit/logs
   └─ Generar reportes
```

### Ejemplos de Uso Práctico

#### Ejemplo 1: Registrar Visitante Completo

```bash
#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIs..."
API="http://172.16.56.102:5050"

# Crear persona con foto
curl -X POST "$API/personas" \
  -H "Authorization: Bearer $TOKEN" \
  -F "nombre=Juan" \
  -F "apellido=Pérez" \
  -F "documento_identidad=V-12345678" \
  -F "email=juan@empresa.com" \
  -F "empresa=TechCorp" \
  -F "cargo=Ingeniero" \
  -F "direccion=Caracas" \
  -F "foto=@/path/to/juan.jpg"
```

#### Ejemplo 2: Agendar Visita Multi-Área

```bash
curl -X POST "$API/visitas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "persona_id": 1,
    "centro_datos_id": 1,
    "area_id": 1,
    "estado_id": 1,
    "tipo_actividad_id": 1,
    "descripcion_actividad": "Mantenimiento preventivo",
    "fecha_programada": "2025-12-10T14:00:00Z",
    "autorizado_por": "Carlos López",
    "centro_datos_ids": "[1, 2]",
    "area_ids": "[1, 2, 3]"
  }'
```

#### Ejemplo 3: Generar Reporte de Visitas

```bash
# Descargar PDF con todas las visitas del mes
curl -X GET "$API/visitas/1/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  -o constancia_visita_001.pdf
```

### Rutas de la Aplicación Frontend (React)

```
http://172.16.56.102:3000/
├── /login                   # Autenticación
├── /Accesos                 # Listado de visitas
├── /Personas                # Gestión de personas
├── /CentrosDatos            # Gestión de centros
├── /Usuarios                # Gestión de usuarios (Admin)
├── /Auditoría               # Registros de auditoría
└── /Reportes                # Reportes y exportaciones
```

---

## 🔧 Scripts de Inicialización {#scripts}

### Script 1: `init_database.sql`

```sql
-- Crear esquema
CREATE SCHEMA IF NOT EXISTS sistema_gestiones;

-- Crear tabla de roles
CREATE TABLE sistema_gestiones.roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(255) UNIQUE NOT NULL
);

-- Insertar roles predefinidos
INSERT INTO sistema_gestiones.roles (nombre_rol) VALUES
('Administrador'),
('Supervisor'),
('Operador'),
('Auditor');

-- Crear tabla de estados de visita
CREATE TABLE sistema_gestiones.estado_visita (
    id_estado SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(255) UNIQUE NOT NULL
);

-- Insertar estados
INSERT INTO sistema_gestiones.estado_visita (nombre_estado) VALUES
('En Progreso'),
('Completada');


-- Crear tabla de tipos de actividad
CREATE TABLE sistema_gestiones.tipo_actividad (
    id_tipo_actividad SERIAL PRIMARY KEY,
    nombre_actividad VARCHAR(255) UNIQUE NOT NULL
);

-- Insertar tipos
INSERT INTO sistema_gestiones.tipo_actividad (nombre_actividad) VALUES
('Mantenimiento'),
('Consultoría'),
('Instalación'),
('Auditoría'),
('Capacitación'),
('Otro');

-- Crear usuario administrador (contraseña: admin123)
INSERT INTO sistema_gestiones.usuario (
    cedula, username, email, nombre, apellidos,
    hashed_password, rol_id, telefono, departamento, activo
) VALUES (
    'V-00000001',
    'admin',
    'admin@seniat.gob.ve',
    'Administrador',
    'Sistema',
    '$2b$12$YOUR_HASHED_PASSWORD_HERE',
    1,
    '+58-212-000-0000',
    'TI',
    TRUE
);

PD: En caso de que ya hayan creado la BD y necesitan el usuario pueden ejecutar un archivo .py llamado generador_hash.py
se conecta de manera automatica a la BD y genera ese usuario admin con su respectiva clave hash
en caso de que de algun error, es necesario que verifiquen accediendo al mismo y cambiando las credenciales con las cuales acceden
-- Crear índices para optimización
CREATE INDEX idx_personas_documento ON sistema_gestiones.personas(documento_identidad);
CREATE INDEX idx_personas_email ON sistema_gestiones.personas(email);
CREATE INDEX idx_visitas_persona ON sistema_gestiones.visitas(persona_id);
CREATE INDEX idx_visitas_centro ON sistema_gestiones.visitas(centro_datos_id);
CREATE INDEX idx_visitas_fecha ON sistema_gestiones.visitas(fecha_programada);
CREATE INDEX idx_usuario_username ON sistema_gestiones.usuario(username);
CREATE INDEX idx_control_fecha_usuario ON sistema_gestiones.control(fecha, usuario_id);
```

### Script 2: `populate_activities.py`

Script Python para cargar actividades predefinidas:

```python
#!/usr/bin/env python3
"""
Script para poblar datos iniciales en la BD.
Uso: python populate_activities.py
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import (
    TipoActividad, EstadoVisita, RolUsuario,
    CentroDatos, Area
)
from app.config import settings

# Conectar a BD
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def populate_tipos_actividad():
    """Cargar tipos de actividad predefinidos"""
    tipos = [
        "Mantenimiento",
        "Consultoría",
        "Instalación",
        "Auditoría",
        "Capacitación",
        "Inspección",
        "Reparación",
        "Actualización"
    ]
    
    for tipo in tipos:
        if not session.query(TipoActividad).filter_by(nombre_actividad=tipo).first():
            ta = TipoActividad(nombre_actividad=tipo)
            session.add(ta)
            print(f"✅ Agregado: {tipo}")
    
    session.commit()

def populate_estados_visita():
    """Cargar estados de visita"""
    estados = [
        "Pendiente",
        "En Progreso",
        "Completada",
        "Cancelada",
        "Rechazada"
    ]
    
    for estado in estados:
        if not session.query(EstadoVisita).filter_by(nombre_estado=estado).first():
            ev = EstadoVisita(nombre_estado=estado)
            session.add(ev)
            print(f"✅ Estado agregado: {estado}")
    
    session.commit()

def populate_roles():
    """Cargar roles predefinidos"""
    roles = [
        "Administrador",
        "Supervisor",
        "Operador",
        "Auditor"
    ]
    
    for rol in roles:
        if not session.query(RolUsuario).filter_by(nombre_rol=rol).first():
            r = RolUsuario(nombre_rol=rol)
            session.add(r)
            print(f"✅ Rol agregado: {rol}")
    
    session.commit()

if __name__ == "__main__":
    print("🔄 Poblando base de datos inicial...\n")
    populate_tipos_actividad()
    print()
    populate_estados_visita()
    print()
    populate_roles()
    print("\n✅ Base de datos poblada exitosamente!")
    session.close()
```

### Script 3: `health_check.py`

Script para verificar estado del sistema:

```python
#!/usr/bin/env python3
"""
Health check para verificar que todos los servicios están funcionando.
Uso: python health_check.py
"""

import requests
import psycopg2
from redis import Redis
import sys

def check_api():
    """Verificar API FastAPI"""
    try:
        r = requests.get("http://localhost:5050/docs", timeout=5)
        if r.status_code == 200:
            print("✅ API FastAPI: OK")
            return True
    except Exception as e:
        print(f"❌ API FastAPI: {e}")
    return False

def check_database():
    """Verificar PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            user="postgres",
            password="123456",
            database="gestion_accesos"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        print("✅ PostgreSQL: OK")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ PostgreSQL: {e}")
    return False

def check_redis():
    """Verificar Redis"""
    try:
        r = Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis: OK")
        return True
    except Exception as e:
        print(f"❌ Redis: {e}")
    return False

def check_frontend():
    """Verificar Frontend React"""
    try:
        r = requests.get("http://localhost:3000", timeout=5)
        if r.status_code == 200:
            print("✅ Frontend React: OK")
            return True
    except Exception as e:
        print(f"❌ Frontend React: {e}")
    return False

if __name__ == "__main__":
    print("🔍 Ejecutando health check...\n")
    
    checks = [
        check_api(),
        check_database(),
        check_redis(),
        check_frontend()
    ]
    
    print()
    if all(checks):
        print("✅ Todos los servicios están operacionales")
        sys.exit(0)
    else:
        print("⚠️ Algunos servicios no están disponibles")
        sys.exit(1)
```

### Uso de Scripts

```bash
# Ejecutar population de datos
python scripts/populate_activities.py

# Ejecutar health check
python scripts/health_check.py

# Ejecutar SQL de inicialización
psql -U postgres -d gestion_accesos -f scripts/init_database.sql
```

---

## 🛠️ Solución de Problemas

### Problema: "Connection refused" en la BD

**Solución:**
```bash
# Verificar que PostgreSQL está corriendo
pg_isready -h localhost -p 5432

# Si no está running, iniciarlo
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

### Problema: Puertos en uso

```bash
# Encontrar qué está usando el puerto
lsof -i :5050
lsof -i :3000

# Matar el proceso
kill -9 <PID>
```

### Problema: Docker sin permisos

```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📄 Conclusión

Este sistema proporciona una solución integral para la gestión de accesos en centros de datos con:

✅ **Seguridad:** Autenticación JWT, roles, auditoría completa  
✅ **Escalabilidad:** Arquitectura modular con Docker  
✅ **Usabilidad:** API REST, Frontend React, documentación Swagger  
✅ **Confiabilidad:** BD relacional, logs estructurados  

Para consultas o soporte técnico, contactar al equipo de desarrollo.

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0  
**Estado:** Producción (con funcionalidades biométricas pendientes)