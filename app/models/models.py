from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

SCHEMA = "sistema_gestiones"

class Area(Base):
    __tablename__ = "area"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    # Si las áreas pertenecen a un centro de datos específico, añade FK:
    id_centro_datos = Column(Integer, ForeignKey("sistema_gestiones.centro_datos.id"), nullable=False)  # CORRECTO

    # Relaciones
    visitas = relationship("Visita", back_populates="area", cascade="all, delete-orphan")
    centro_datos = relationship("CentroDatos", back_populates="areas")

# Persona
class Persona(Base):
    __tablename__ = "personas"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, index=True)
    apellido = Column(String(100), nullable=False, index=True)
    documento_identidad = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    empresa = Column(String(200), nullable=False)
    cargo = Column(String(100), nullable=True)
    direccion = Column(Text, nullable=False)
    observaciones = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())  # ← NUEVO
    foto = Column(String(250), nullable=False)
    departamento = Column(String(100), nullable=True)
    unidad = Column(String(100), nullable=True)


    # Relaciones
    visitas = relationship("Visita", back_populates="persona", cascade="all, delete-orphan")

# Centro de datos
class CentroDatos(Base):
    __tablename__ = "centro_datos"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True, index=True)
    codigo = Column(String(20), nullable=False, unique=True, index=True)
    direccion = Column(Text, nullable=False)
    ciudad = Column(String(100), nullable=False)
    pais = Column(String(100), default="Colombia", nullable=False)
    telefono_contacto = Column(String(20), nullable=True)
    email_contacto = Column(String(255), nullable=True)
    descripcion = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    visitas = relationship("Visita", back_populates="centro_datos", cascade="all, delete-orphan")
    areas = relationship("Area", back_populates="centro_datos", cascade="all, delete-orphan")

# Roles de usuario
class RolUsuario(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": SCHEMA}

    id_rol = Column(Integer, primary_key=True, index=True)
    nombre_rol = Column(String(255), unique=True, nullable=False, index=True)

    usuarios = relationship("Usuario", back_populates="rol")

class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cedula = Column(Integer, unique=True, nullable=False, index=True)  # ← Cedula como campo único
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    apellidos = Column(String(200), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol_id = Column(Integer, ForeignKey(f"{SCHEMA}.roles.id_rol"), nullable=False, default=1, index=True)
    telefono = Column(String(20), nullable=True)
    departamento = Column(String(100), nullable=True)
    observaciones = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)  # ← AGREGAR este campo
    ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    rol = relationship("RolUsuario", back_populates="usuarios")


# Estado de visita
class EstadoVisita(Base):
    __tablename__ = "estado_visita"
    __table_args__ = {"schema": SCHEMA}

    id_estado = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre_estado = Column(String(255), nullable=False, unique=True)

    visitas = relationship("Visita", back_populates="estado")

# Tipo de actividad
class TipoActividad(Base):
    __tablename__ = "tipo_actividad"
    __table_args__ = {"schema": SCHEMA}

    id_tipo_actividad = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre_actividad = Column(String(255), nullable=False, unique=True)

    visitas = relationship("Visita", back_populates="actividad")

# Visita
class Visita(Base):
    __tablename__ = "visitas"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    codigo_visita = Column(String(20), unique=True, nullable=False, index=True)

    persona_id = Column(Integer, ForeignKey(f"{SCHEMA}.personas.id"), nullable=False, index=True)
    centro_datos_id = Column(Integer, ForeignKey(f"{SCHEMA}.centro_datos.id"), nullable=False, index=True)
    estado_id = Column(Integer, ForeignKey(f"{SCHEMA}.estado_visita.id_estado"), nullable=False, index=True)
    tipo_actividad_id = Column(Integer, ForeignKey(f"{SCHEMA}.tipo_actividad.id_tipo_actividad"), nullable=False, index=True)
    area_id = Column(Integer, ForeignKey(f"{SCHEMA}.area.id"), nullable=True, index=True)

    descripcion_actividad = Column(Text, nullable=False)
    fecha_programada = Column(DateTime(timezone=True), nullable=False, index=True)
    fecha_ingreso = Column(DateTime(timezone=True), nullable=True)
    fecha_salida = Column(DateTime(timezone=True), nullable=True)
    duracion_estimada = Column(Integer, nullable=True)
    autorizado_por = Column(String(200), nullable=True)
    motivo_autorizacion = Column(Text, nullable=True)
    equipos_ingresados = Column(Text, nullable=True)
    equipos_retirados = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)
    notas_finales = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    
    # ← FECHAS CORREGIDAS
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    estado = relationship("EstadoVisita", back_populates="visitas")
    actividad = relationship("TipoActividad", back_populates="visitas")
    persona = relationship("Persona", back_populates="visitas")
    centro_datos = relationship("CentroDatos", back_populates="visitas")
    area = relationship("Area", back_populates="visitas")
