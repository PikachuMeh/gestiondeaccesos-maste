-- DROP SCHEMA sistema_gestiones;

CREATE SCHEMA sistema_gestiones AUTHORIZATION admin01;

-- DROP SEQUENCE sistema_gestiones.area_id_seq;

CREATE SEQUENCE sistema_gestiones.area_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.centro_datos_id_seq;

CREATE SEQUENCE sistema_gestiones.centro_datos_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.estado_visita_id_estado_seq;

CREATE SEQUENCE sistema_gestiones.estado_visita_id_estado_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.personas_id_seq;

CREATE SEQUENCE sistema_gestiones.personas_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.rol_usuario_id_rol_seq;

CREATE SEQUENCE sistema_gestiones.rol_usuario_id_rol_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.tipo_actividad_id_tipo_actividad_seq;

CREATE SEQUENCE sistema_gestiones.tipo_actividad_id_tipo_actividad_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.tipo_area_id_tipo_area_seq;

CREATE SEQUENCE sistema_gestiones.tipo_area_id_tipo_area_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.usuario_id_seq;

CREATE SEQUENCE sistema_gestiones.usuario_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE sistema_gestiones.visitas_id_seq;

CREATE SEQUENCE sistema_gestiones.visitas_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- sistema_gestiones.centro_datos definition

-- Drop table

-- DROP TABLE sistema_gestiones.centro_datos;

CREATE TABLE sistema_gestiones.centro_datos (
	id serial4 NOT NULL,
	nombre varchar(200) NOT NULL,
	codigo varchar(20) NOT NULL,
	direccion text NOT NULL,
	ciudad varchar(100) NOT NULL,
	departamento varchar(100) NOT NULL,
	pais varchar(100) DEFAULT 'Colombia'::character varying NOT NULL,
	latitud float8 NULL,
	longitud float8 NULL,
	telefono varchar(20) NULL,
	email varchar(255) NULL,
	responsable varchar(200) NULL,
	capacidad_servidores int4 NULL,
	capacidad_telecomunicaciones int4 NULL,
	capacidad_cross_connect int4 NULL,
	descripcion text NULL,
	observaciones text NULL,
	activo bool DEFAULT true NOT NULL,
	fecha_creacion timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	fecha_actualizacion timestamptz NULL,
	CONSTRAINT centro_datos_codigo_key UNIQUE (codigo),
	CONSTRAINT centro_datos_pkey PRIMARY KEY (id)
);


-- sistema_gestiones.estado_visita definition

-- Drop table

-- DROP TABLE sistema_gestiones.estado_visita;

CREATE TABLE sistema_gestiones.estado_visita (
	id_estado serial4 NOT NULL,
	nombre_estado varchar(255) NOT NULL,
	CONSTRAINT estado_visita_nombre_estado_key UNIQUE (nombre_estado),
	CONSTRAINT estado_visita_pkey PRIMARY KEY (id_estado)
);


-- sistema_gestiones.personas definition

-- Drop table

-- DROP TABLE sistema_gestiones.personas;

CREATE TABLE sistema_gestiones.personas (
	id serial4 NOT NULL,
	nombre varchar(100) NOT NULL,
	apellido varchar(100) NOT NULL,
	documento_identidad varchar(20) NOT NULL,
	tipo_documento varchar(10) NOT NULL,
	email varchar(255) NULL,
	telefono varchar(20) NULL,
	empresa varchar(200) NULL,
	cargo varchar(100) NULL,
	direccion text NULL,
	observaciones text NULL,
	activo bool DEFAULT true NOT NULL,
	fecha_creacion timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	fecha_actualizacion timestamptz NULL,
	CONSTRAINT personas_documento_identidad_key UNIQUE (documento_identidad),
	CONSTRAINT personas_email_key UNIQUE (email),
	CONSTRAINT personas_pkey PRIMARY KEY (id)
);


-- sistema_gestiones.rol_usuario definition

-- Drop table

-- DROP TABLE sistema_gestiones.rol_usuario;

CREATE TABLE sistema_gestiones.rol_usuario (
	id_rol serial4 NOT NULL,
	nombre_rol varchar(255) NOT NULL,
	CONSTRAINT rol_usuario_nombre_rol_key UNIQUE (nombre_rol),
	CONSTRAINT rol_usuario_pkey PRIMARY KEY (id_rol)
);


-- sistema_gestiones.tipo_actividad definition

-- Drop table

-- DROP TABLE sistema_gestiones.tipo_actividad;

CREATE TABLE sistema_gestiones.tipo_actividad (
	id_tipo_actividad serial4 NOT NULL,
	nombre_actividad varchar(255) NOT NULL,
	CONSTRAINT tipo_actividad_nombre_actividad_key UNIQUE (nombre_actividad),
	CONSTRAINT tipo_actividad_pkey PRIMARY KEY (id_tipo_actividad)
);


-- sistema_gestiones.tipo_area definition

-- Drop table

-- DROP TABLE sistema_gestiones.tipo_area;

CREATE TABLE sistema_gestiones.tipo_area (
	id_tipo_area serial4 NOT NULL,
	tipo_area varchar(255) NOT NULL,
	CONSTRAINT tipo_area_pkey PRIMARY KEY (id_tipo_area),
	CONSTRAINT tipo_area_tipo_area_key UNIQUE (tipo_area)
);


-- sistema_gestiones.area definition

-- Drop table

-- DROP TABLE sistema_gestiones.area;

CREATE TABLE sistema_gestiones.area (
	id serial4 NOT NULL,
	nombre varchar(200) NOT NULL,
	codigo varchar(20) NOT NULL,
	tipo_id int4 NOT NULL,
	centro_datos_id int4 NOT NULL,
	piso varchar(10) NULL,
	sala varchar(50) NULL,
	rack_inicio varchar(20) NULL,
	rack_fin varchar(20) NULL,
	capacidad_maxima int4 NULL,
	capacidad_actual int4 DEFAULT 0 NOT NULL,
	requiere_autorizacion bool DEFAULT false NOT NULL,
	nivel_seguridad varchar(20) DEFAULT 'normal'::character varying NOT NULL,
	descripcion text NULL,
	observaciones text NULL,
	activo bool DEFAULT true NOT NULL,
	fecha_creacion timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	fecha_actualizacion timestamptz NULL,
	CONSTRAINT area_pkey PRIMARY KEY (id),
	CONSTRAINT fk_area_centro_datos FOREIGN KEY (centro_datos_id) REFERENCES sistema_gestiones.centro_datos(id),
	CONSTRAINT fk_area_tipo FOREIGN KEY (tipo_id) REFERENCES sistema_gestiones.tipo_area(id_tipo_area)
);
CREATE INDEX idx_area_centro_tipo ON sistema_gestiones.area USING btree (centro_datos_id, tipo_id);
CREATE INDEX idx_area_codigo ON sistema_gestiones.area USING btree (codigo);


-- sistema_gestiones.usuario definition

-- Drop table

-- DROP TABLE sistema_gestiones.usuario;

CREATE TABLE sistema_gestiones.usuario (
	id serial4 NOT NULL,
	username varchar(50) NOT NULL,
	email varchar(255) NOT NULL,
	nombre_completo varchar(200) NOT NULL,
	rol_id int4 NOT NULL,
	telefono varchar(20) NULL,
	departamento varchar(100) NULL,
	observaciones text NULL,
	activo bool DEFAULT true NOT NULL,
	ultimo_acceso timestamptz NULL,
	fecha_creacion timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	fecha_actualizacion timestamptz NULL,
	password_hash varchar(255) NOT NULL,
	CONSTRAINT usuario_email_key UNIQUE (email),
	CONSTRAINT usuario_pkey PRIMARY KEY (id),
	CONSTRAINT usuario_username_key UNIQUE (username),
	CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES sistema_gestiones.rol_usuario(id_rol)
);


-- sistema_gestiones.visitas definition

-- Drop table

-- DROP TABLE sistema_gestiones.visitas;

CREATE TABLE sistema_gestiones.visitas (
	id serial4 NOT NULL,
	codigo varchar(20) NOT NULL,
	persona_id int4 NOT NULL,
	centro_datos_id int4 NOT NULL,
	area_id int4 NOT NULL,
	estado_id int4 NOT NULL,
	tipo_actividad_id int4 NOT NULL,
	descripcion text NOT NULL,
	fecha_programada timestamptz NOT NULL,
	fecha_ingreso timestamptz NULL,
	fecha_salida timestamptz NULL,
	duracion_estimada int4 NULL,
	autorizado_por varchar(200) NULL,
	motivo_autorizacion text NULL,
	requiere_escolta bool DEFAULT false NOT NULL,
	nombre_escolta varchar(200) NULL,
	equipos_ingresados text NULL,
	equipos_retirados text NULL,
	observaciones_seguridad text NULL,
	observaciones text NULL,
	notas_finales text NULL,
	activo bool DEFAULT true NOT NULL,
	fecha_creacion timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	fecha_actualizacion timestamptz NULL,
	CONSTRAINT visitas_codigo_key UNIQUE (codigo),
	CONSTRAINT visitas_pkey PRIMARY KEY (id),
	CONSTRAINT fk_visita_area FOREIGN KEY (area_id) REFERENCES sistema_gestiones.area(id),
	CONSTRAINT fk_visita_centro_datos FOREIGN KEY (centro_datos_id) REFERENCES sistema_gestiones.centro_datos(id),
	CONSTRAINT fk_visita_estado FOREIGN KEY (estado_id) REFERENCES sistema_gestiones.estado_visita(id_estado),
	CONSTRAINT fk_visita_persona FOREIGN KEY (persona_id) REFERENCES sistema_gestiones.personas(id),
	CONSTRAINT fk_visita_tipo_actividad FOREIGN KEY (tipo_actividad_id) REFERENCES sistema_gestiones.tipo_actividad(id_tipo_actividad)
);
CREATE INDEX idx_visitas_codigo ON sistema_gestiones.visitas USING btree (codigo);
CREATE INDEX idx_visitas_fecha_programada ON sistema_gestiones.visitas USING btree (fecha_programada);
CREATE INDEX idx_visitas_relaciones ON sistema_gestiones.visitas USING btree (persona_id, centro_datos_id, area_id);