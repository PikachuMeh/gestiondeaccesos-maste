CREATE TABLE tipo_area (
    id_tipo_area SERIAL PRIMARY KEY,
    tipo_area VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE centro_datos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL DEFAULT 'Colombia',
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    telefono VARCHAR(20),
    email VARCHAR(255),
    responsable VARCHAR(200),
    capacidad_servidores INTEGER,
    capacidad_telecomunicaciones INTEGER,
    capacidad_cross_connect INTEGER,
    descripcion TEXT,
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE
);

CREATE TABLE personas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    documento_identidad VARCHAR(20) NOT NULL UNIQUE,
    tipo_documento VARCHAR(10) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telefono VARCHAR(20),
    empresa VARCHAR(200),
    cargo VARCHAR(100),
    direccion TEXT,
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE
);

CREATE TABLE area (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    tipo_id INTEGER NOT NULL,
    centro_datos_id INTEGER NOT NULL,
    piso VARCHAR(10),
    sala VARCHAR(50),
    rack_inicio VARCHAR(20),
    rack_fin VARCHAR(20),
    capacidad_maxima INTEGER,
    capacidad_actual INTEGER NOT NULL DEFAULT 0,
    requiere_autorizacion BOOLEAN NOT NULL DEFAULT FALSE,
    nivel_seguridad VARCHAR(20) NOT NULL DEFAULT 'normal',
    descripcion TEXT,
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_area_tipo FOREIGN KEY (tipo_id) REFERENCES tipo_area(id_tipo_area),
    CONSTRAINT fk_area_centro_datos FOREIGN KEY (centro_datos_id) REFERENCES centro_datos(id)
);

CREATE TABLE visitas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    persona_id INTEGER NOT NULL,
    centro_datos_id INTEGER NOT NULL,
    area_id INTEGER NOT NULL,
    estado_id INTEGER NOT NULL, -- assume estado_visita table
    tipo_actividad_id INTEGER NOT NULL, -- assume tipo_actividad table
    descripcion TEXT NOT NULL,
    fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_ingreso TIMESTAMP WITH TIME ZONE,
    fecha_salida TIMESTAMP WITH TIME ZONE,
    duracion_estimada INTEGER,
    autorizado_por VARCHAR(200),
    motivo_autorizacion TEXT,
    requiere_escolta BOOLEAN NOT NULL DEFAULT FALSE,
    nombre_escolta VARCHAR(200),
    equipos_ingresados TEXT,
    equipos_retirados TEXT,
    observaciones_seguridad TEXT,
    observaciones TEXT,
    notas_finales TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_visita_persona FOREIGN KEY (persona_id) REFERENCES personas(id),
    CONSTRAINT fk_visita_centro_datos FOREIGN KEY (centro_datos_id) REFERENCES centro_datos(id),
    CONSTRAINT fk_visita_area FOREIGN KEY (area_id) REFERENCES area(id)
    -- FK constraints to estado_visita and tipo_actividad to be added if exist
);

