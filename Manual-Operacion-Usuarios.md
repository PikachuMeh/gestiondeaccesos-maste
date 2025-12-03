# 👥 Manual de Operación del Sistema - Para Usuarios Finales

**Sistema de Gestión de Accesos a Centros de Datos**  
**Versión:** 1.0  
**Fecha:** Diciembre 2025  
**Audiencia:** Operadores, Supervisores, Administradores

---

## 📑 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Módulo de Autenticación](#autenticación)
4. [Módulo de Personas](#personas)
5. [Módulo de Centros de Datos](#centros-de-datos)
6. [Módulo de Visitas](#visitas)
7. [Módulo de Usuarios](#usuarios)
8. [Módulo de Auditoría](#auditoría)
9. [Tareas Comunes](#tareas-comunes)
10. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Introducción {#introducción}

### ¿Qué es este Sistema?

El **Sistema de Gestión de Accesos a Centros de Datos** es una plataforma que permite:

- 📝 **Registrar visitantes** con sus datos completos
- 📅 **Agendar visitas** a los centros de datos
- ✅ **Controlar acceso** mediante check-in y check-out
- 📄 **Generar constancias** automáticamente
- 📊 **Auditar acciones** para seguridad
- 📨 **Notificar operadores** vía Telegram y correo

### Acceso por Rol

| Rol | Permisos | Acceso |
|-----|----------|--------|
| **Administrador** | Total | Todos los módulos |
| **Supervisor** | Gestión completa | Personas, Visitas, Reportes |
| **Operador** | Operación diaria | Check-in/out, Consultas |
| **Auditor** | Solo lectura | Logs, Reportes |

---

## 🔐 Acceso al Sistema {#acceso-al-sistema}

### Paso 1: Abrir el Navegador

Ingresa a la URL en tu navegador:

```
http://172.16.56.102:3000
```

**⚠️ Notas importantes:**
- Usar navegadores modernos (Chrome, Firefox, Edge)
- Aceptar cookies del navegador
- Tener JavaScript habilitado

### Paso 2: Pantalla de Login

Verás la pantalla de autenticación con:
- Campo de usuario (username)
- Campo de contraseña
- Botón "Iniciar Sesión"
- Opción "¿Olvidó la contraseña?"

**[CAPTURA 1: Pantalla Login]**

### Paso 3: Ingresar Credenciales

1. Escribe tu **usuario** (asignado por administrador)
2. Escribe tu **contraseña**
3. Haz clic en **"Iniciar Sesión"**

**Credenciales de Prueba (cambiar después):**
```
Usuario: admin
Contraseña: admin123
```

### Paso 4: Dashboard Principal

Después de autenticarte, verás el dashboard con:
- Bienvenida personalizada
- Menú de navegación lateral
- Resumen de visitas recientes
- Accesos rápidos según tu rol

**[CAPTURA 2: Dashboard Principal]**

---

## 🔑 Módulo de Autenticación {#autenticación}

### Cambiar Contraseña

1. Haz clic en tu **nombre de usuario** (esquina superior derecha)
2. Selecciona **"Perfil"** o **"Configuración"**
3. Busca la opción **"Cambiar Contraseña"**
4. Completa:
   - Contraseña actual
   - Nueva contraseña
   - Confirmar nueva contraseña
5. Haz clic en **"Guardar Cambios"**

**[CAPTURA 3: Cambiar Contraseña]**

### Recuperar Contraseña (Si la Olvidas)

1. En la pantalla de login, haz clic en **"¿Olvidó la contraseña?"**
2. Ingresa tu **correo electrónico**
3. Haz clic en **"Enviar Instrucciones"**
4. Revisa tu correo (incluida carpeta de spam)
5. Sigue el enlace y establece nueva contraseña

**[CAPTURA 4: Recuperar Contraseña]**

### Cerrar Sesión

1. Haz clic en tu nombre (esquina superior derecha)
2. Selecciona **"Cerrar Sesión"**
3. Se cerrará tu sesión automáticamente

**⚠️ IMPORTANTE:** Siempre cierra sesión en computadoras públicas

---

## 👥 Módulo de Personas {#personas}

El módulo de Personas permite registrar y gestionar visitantes.

### Acceder al Módulo

1. En el menú lateral, haz clic en **"Personas"**
2. Verás un listado de personas registradas

**[CAPTURA 5: Listado de Personas]**

### Buscar una Persona

#### Opción 1: Por Nombre

1. En el campo de búsqueda, escribe el **nombre** de la persona
2. El sistema filtrará automáticamente
3. Haz clic en el resultado para ver detalles

#### Opción 2: Por Cédula/Documento

1. En el campo de búsqueda, escribe el **número de documento**
2. Sistema busca coincidencias exactas
3. Resultado mostrado instantáneamente

#### Opción 3: Búsqueda Avanzada

1. Haz clic en **"Filtros Avanzados"**
2. Completa filtros:
   - Empresa
   - Departamento
   - Cargo
   - Rango de fechas
3. Haz clic en **"Buscar"**

**[CAPTURA 6: Búsqueda Avanzada]**

### Crear Nueva Persona

1. Haz clic en el botón **"+ Nueva Persona"** (esquina superior)
2. Se abre formulario de registro

**[CAPTURA 7: Formulario Nueva Persona]**

3. Completa los campos:

| Campo | Descripción | Obligatorio |
|-------|-------------|------------|
| **Nombre** | Nombre del visitante | ✅ Sí |
| **Apellido** | Apellido del visitante | ✅ Sí |
| **Documento Identidad** | Cédula o Pasaporte | ✅ Sí |
| **Email** | Correo electrónico | ✅ Sí |
| **Empresa** | Empresa o Institución | ✅ Sí |
| **Cargo** | Puesto o posición | ⚪ No |
| **Dirección** | Dirección del domicilio | ✅ Sí |
| **Departamento** | Área de trabajo | ⚪ No |
| **Unidad** | Unidad específica | ⚪ No |
| **Foto** | Foto del visitante | ✅ Sí |
| **Observaciones** | Notas adicionales | ⚪ No |

4. Haz clic en **"Cargar Foto"**
   - Selecciona archivo JPG/PNG (máx 5MB)
   - Se mostrará previsualizacion

**[CAPTURA 8: Cargar Foto]**

5. Haz clic en **"Guardar"**
   - Sistema valida datos
   - Muestra confirmación de éxito
   - Persona añadida al listado

### Ver Detalles de Persona

1. En el listado, haz clic en la **fila de la persona**
2. Se abre panel lateral con detalles completos:
   - Datos personales
   - Foto
   - Historial de visitas
   - Última visita

**[CAPTURA 9: Detalles de Persona]**

### Actualizar Persona

1. En el panel de detalles, haz clic en **"Editar"**
2. Modifica los campos necesarios
3. Puedes actualizar foto si lo deseas
4. Haz clic en **"Guardar Cambios"**

**[CAPTURA 10: Editar Persona]**

### Eliminar Persona

1. En el panel de detalles, haz clic en **"Opciones"** (⋮)
2. Selecciona **"Eliminar"**
3. Confirma eliminación en diálogo
4. La persona se marca como inactiva

**⚠️ NOTA:** No se elimina completamente (se mantiene historial)

---

## 🏢 Módulo de Centros de Datos {#centros-de-datos}

Administra centros de datos y áreas de acceso.

### Acceder al Módulo

1. En el menú lateral, haz clic en **"Centros de Datos"**
2. Verás listado de todos los centros registrados

**[CAPTURA 11: Listado Centros de Datos]**

### Buscar Centro de Datos

1. Usa el campo de búsqueda por **nombre**
2. O filtra por **ciudad**
3. Resultados se muestran instantáneamente

### Crear Nuevo Centro

1. Haz clic en **"+ Nuevo Centro"**
2. Completa formulario:

| Campo | Descripción |
|-------|-------------|
| **Nombre** | Nombre del centro (ej: "Centro SENIAT Caracas") |
| **Código** | Código único (ej: "CD-001") |
| **Dirección** | Domicilio completo |
| **Ciudad** | Ciudad donde se ubica |
| **País** | País (default: Venezuela) |
| **Teléfono** | Teléfono de contacto |
| **Email** | Email de contacto |
| **Descripción** | Descripción general |

3. Haz clic en **"Guardar"**

**[CAPTURA 12: Crear Centro]**

### Gestionar Áreas

Una vez creado el centro, puedes añadir áreas:

1. Abre el centro (haz clic en la fila)
2. En el panel lateral, busca sección **"Áreas"**
3. Haz clic en **"+ Añadir Área"**

**[CAPTURA 13: Añadir Área]**

4. Ingresa:
   - Nombre del área (ej: "Sala de Servidores")
   - Tipo de área (Servidores, Telecomunicaciones, Cross Connect, etc.)

5. Haz clic en **"Guardar"**

---

## ✅ Módulo de Visitas {#visitas}

Es el módulo principal del sistema. Aquí se crean y gestionan todas las visitas.

### Acceder al Módulo

1. En el menú lateral, haz clic en **"Accesos"** o **"Visitas"**
2. Verás listado de visitas con filtros

**[CAPTURA 14: Listado de Visitas]**

### Buscar Visita

#### Por Persona (Nombre o Cédula)

1. En campo "Buscar", escribe:
   - Nombre: "Juan Pérez"
   - O Cédula: "V-12345678"
2. Sistema filtra automáticamente

#### Por Rango de Fechas

1. Haz clic en **"Fechas"**
2. Selecciona:
   - Fecha desde
   - Fecha hasta
3. Presiona Enter

**[CAPTURA 15: Filtro de Fechas]**

#### Filtros Avanzados

1. Haz clic en **"Más Filtros"**
2. Opciones disponibles:
   - Centro de Datos
   - Área
   - Estado de Visita
   - Tipo de Actividad
   - Usuario asignado

**[CAPTURA 16: Filtros Avanzados de Visitas]**

### Crear Nueva Visita

1. Haz clic en **"+ Nueva Visita"** (esquina superior)
2. Se abre formulario en 3 secciones

**[CAPTURA 17: Crear Nueva Visita - Paso 1]**

#### Paso 1: Seleccionar Persona

1. En campo "Persona", comienza a escribir:
   - Nombre: "Juan"
   - O Cédula: "V-123"
2. Se mostrarán sugerencias
3. Selecciona la persona de la lista

**Nota:** Si la persona no existe, haz clic en **"+ Nueva Persona"**

**[CAPTURA 18: Selector de Persona]**

#### Paso 2: Datos de la Visita

Completa los siguientes campos:

| Campo | Descripción | Obligatorio |
|-------|-------------|------------|
| **Centro de Datos** | Selecciona el centro | ✅ Sí |
| **Área(s)** | Selecciona una o más áreas | ✅ Sí |
| **Tipo de Actividad** | Ej: Mantenimiento, Consultoría | ✅ Sí |
| **Estado** | Ej: Pendiente, En Progreso | ✅ Sí |
| **Descripción Actividad** | Detalle de lo que hará | ✅ Sí |
| **Fecha Programada** | Cuándo será la visita | ✅ Sí |
| **Hora** | Hora de inicio | ✅ Sí |
| **Duración Estimada** | En minutos | ⚪ No |
| **Autorizado Por** | Quién aprobó | ⚪ No |
| **Equipos a Ingresar** | Lista de equipos | ⚪ No |

**[CAPTURA 19: Formulario Datos Visita]**

#### Paso 3: Foto y Observaciones

1. Sección **"Foto"**:
   - Haz clic en **"Cargar Foto"** o **"Tomar Foto"**
   - Selecciona archivo JPG/PNG (máx 5MB)
   - Se mostrará vista previa

**[CAPTURA 20: Cargar Foto de Visita]**

2. Sección **"Observaciones"**:
   - Escribe notas adicionales
   - Información de contacto de emergencia
   - Instrucciones especiales

3. Haz clic en **"Guardar Visita"**
   - Sistema genera código único (ej: 123456789)
   - Visita creada en estado "Pendiente"
   - Notificación enviada a supervisores

**[CAPTURA 21: Confirmación Crear Visita]**

### Ver Detalles de Visita

1. En el listado, haz clic en la visita
2. Se abre panel con información completa:
   - Datos del visitante
   - Foto
   - Centro y área
   - Horario
   - Estado actual
   - Historial de cambios

**[CAPTURA 22: Detalles Completos de Visita]**

### Check-In (Ingreso)

El operador realiza el check-in cuando el visitante llega.

**Requisitos:**
- Visita debe estar en estado "Aprobada" o "Pendiente"
- Visitante presente

**Pasos:**

1. En el panel de detalles, busca sección **"Check-In"**
2. Haz clic en **"Realizar Check-In"**

**[CAPTURA 23: Botón Check-In]**

3. Se abre diálogo de confirmación
4. Opciones:
   - **Cargar Foto:** Toma foto con cámara o carga archivo
   - **Biometría:** Si el sistema lo soporta (futuro)
   - **Observaciones:** Notas del operador

5. Haz clic en **"Confirmar Check-In"**
   - Registra hora de ingreso automáticamente
   - Estado cambia a "En Progreso"
   - Notificación enviada a operadores vía Telegram

**[CAPTURA 24: Confirmación Check-In]**

6. Sistema genera **PDF de ingreso**
   - Contiene datos del visitante + foto
   - Se puede imprimir o descargar

### Check-Out (Salida)

Cuando el visitante se va, realizar check-out.

**Requisitos:**
- Visita debe estar en estado "En Progreso"
- Visitante presente

**Pasos:**

1. En el panel de detalles, busca sección **"Check-Out"**
2. Haz clic en **"Realizar Check-Out"**

**[CAPTURA 25: Botón Check-Out]**

3. Se abre diálogo con:
   - Hora de salida (automática)
   - Duración de visita (calculada)
   - Equipos retirados: Confirma si llevó equipos
   - Observaciones: Notas de salida

4. Haz clic en **"Confirmar Check-Out"**
   - Registra hora de salida
   - Estado cambia a "Completada"
   - Calcula duración real
   - Notificación enviada

**[CAPTURA 26: Confirmación Check-Out]**

5. Sistema genera **PDF de constancia final**
   - Resumen completo de la visita
   - Foto de ingreso y salida
   - Duración real
   - Firma operador (opcional)

### Descargar PDF de Visita

1. En el panel de visita, busca botón **"Descargar PDF"** o **"Imprimir"**
2. Se descarga archivo: `constancia_[CODIGO].pdf`

**[CAPTURA 27: Descargar PDF]**

3. PDF contiene:
   - Datos personales del visitante
   - Foto carnet
   - Centro de Datos y Área
   - Fechas y horas de ingreso/salida
   - Duración
   - Firma del operador

### Editar Visita

1. En el panel de detalles, haz clic en **"Editar"**
2. Puedes modificar:
   - Descripción de actividad
   - Observaciones
   - Equipos (si aún no ingresó)

**⚠️ NOTA:** No puedes cambiar persona o centro una vez creada

3. Haz clic en **"Guardar Cambios"**

### Cancelar Visita

1. En el panel, haz clic en **"Opciones"** (⋮)
2. Selecciona **"Cancelar Visita"**
3. Ingresa motivo de cancelación
4. Confirma

**[CAPTURA 28: Cancelar Visita]**

---

## 👤 Módulo de Usuarios {#usuarios}

Disponible solo para **Administradores**. Gestiona usuarios del sistema.

### Acceder al Módulo

1. En el menú lateral, haz clic en **"Usuarios"**
2. Verás listado de operadores y supervisores

**[CAPTURA 29: Listado de Usuarios]**

### Crear Nuevo Usuario

1. Haz clic en **"+ Nuevo Usuario"**
2. Completa formulario:

| Campo | Descripción |
|-------|-------------|
| **Cédula** | Documento de identidad |
| **Username** | Nombre de usuario para login |
| **Email** | Correo electrónico |
| **Nombre** | Nombre del operador |
| **Apellidos** | Apellidos del operador |
| **Contraseña** | Inicial (el usuario debe cambiarla) |
| **Rol** | Administrador, Supervisor, Operador, Auditor |
| **Departamento** | Área de trabajo |
| **Teléfono** | Teléfono de contacto |

3. Haz clic en **"Crear Usuario"**
4. Usuario recibe email con instrucciones

**[CAPTURA 30: Crear Nuevo Usuario]**

### Cambiar Rol de Usuario

1. Abre el usuario (haz clic en la fila)
2. Haz clic en **"Editar"**
3. En el campo **"Rol"**, selecciona nuevo rol:
   - **Administrador:** Acceso total
   - **Supervisor:** Gestión de visitas
   - **Operador:** Check-in/out
   - **Auditor:** Solo consulta

4. Haz clic en **"Guardar"**

**[CAPTURA 31: Cambiar Rol]**

### Desactivar Usuario

1. Abre el usuario
2. Haz clic en **"Opciones"** (⋮)
3. Selecciona **"Desactivar"**
4. Usuario no podrá ingresar al sistema

---

## 📊 Módulo de Auditoría {#auditoría}

Disponible para **Supervisores y Auditors**. Ver registro de todas las acciones.

### Acceder al Módulo

1. En el menú lateral, haz clic en **"Auditoría"**
2. Verás log completo de acciones del sistema

**[CAPTURA 32: Listado de Auditoría]**

### Ver Detalles de Log

1. En el listado, haz clic en un registro
2. Panel muestra:
   - Usuario que realizó acción
   - Tabla afectada (personas, visitas, etc.)
   - Tipo de acción (crear, editar, eliminar)
   - Fecha y hora exacta
   - Dirección IP del usuario
   - Detalles de cambios (antes/después)

**[CAPTURA 33: Detalle de Log]**

### Filtrar por Fecha

1. En sección **"Rango de Fechas"**:
   - Haz clic en fecha desde
   - Selecciona del calendario
   - Haz clic en fecha hasta
   - Presiona Enter

**[CAPTURA 34: Filtro Fechas Auditoría]**

### Filtrar por Tabla

1. En sección **"Tabla Afectada"**, selecciona:
   - personas
   - visitas
   - usuarios
   - centro_datos
   - control

2. Sistema muestra solo acciones en esa tabla

### Filtrar por Usuario

1. En sección **"Usuario"**, escribe nombre
2. Se muestran acciones realizadas por ese usuario

### Exportar Reporte

1. Haz clic en **"Descargar Reporte"** o **"Exportar"**
2. Selecciona formato:
   - **CSV:** Para Excel/Calc
   - **PDF:** Para impresión
   - **JSON:** Para análisis

**[CAPTURA 35: Exportar Reporte]**

3. Archivo se descarga automáticamente

---

## 🎯 Tareas Comunes {#tareas-comunes}

### Tarea 1: Registrar un Visitante Completo

**Tiempo estimado:** 5 minutos

1. Abre módulo **Personas**
2. Haz clic en **"+ Nueva Persona"**
3. Rellena todos los campos obligatorios
4. Carga foto del visitante (JPG/PNG)
5. Haz clic en **"Guardar"**

✅ **Resultado:** Visitante registrado y disponible para crear visitas

---

### Tarea 2: Agendar Visita a Centro de Datos

**Tiempo estimado:** 3 minutos

1. Abre módulo **Accesos/Visitas**
2. Haz clic en **"+ Nueva Visita"**
3. Selecciona la **Persona** del listado
4. Selecciona **Centro de Datos** y **Área(s)**
5. Completa:
   - Tipo de Actividad
   - Descripción
   - Fecha y hora programada
6. Carga foto (opcional en esta etapa)
7. Haz clic en **"Guardar Visita"**

✅ **Resultado:** Visita creada, notificación enviada a supervisores

---

### Tarea 3: Realizar Check-In de Visitante

**Tiempo estimado:** 2 minutos

1. Abre la visita del visitante que llega
2. En sección **Check-In**, haz clic en botón
3. Toma foto de llegada con cámara o carga archivo
4. Agrega observaciones si necesario
5. Confirma check-in
6. Descarga e imprime PDF de ingreso

✅ **Resultado:** Visitante registrado como ingresado, PDF generado

---

### Tarea 4: Realizar Check-Out de Visitante

**Tiempo estimado:** 2 minutos

1. Abre la visita del visitante que se va
2. En sección **Check-Out**, haz clic en botón
3. Confirma equipos retirados
4. Agrega observaciones de salida
5. Confirma check-out
6. Descarga e imprime PDF de constancia

✅ **Resultado:** Visita completada, duración registrada, PDF final generado

---

### Tarea 5: Generar Reporte de Visitas

**Tiempo estimado:** 5 minutos

1. Abre módulo **Accesos/Visitas**
2. Aplica filtros:
   - Centro de Datos
   - Rango de fechas
   - Tipo de Actividad
3. Haz clic en **"Exportar"** o **"Generar Reporte"**
4. Selecciona formato (CSV, PDF)
5. Descarga archivo

✅ **Resultado:** Reporte disponible para análisis o presentación

---

### Tarea 6: Auditar Cambios de un Usuario

**Tiempo estimado:** 5 minutos

1. Abre módulo **Auditoría**
2. Filtra por:
   - Usuario específico
   - Rango de fechas
   - Tabla afectada
3. Revisa logs de acciones
4. Haz clic en un log para ver detalles
5. Exporta reporte si es necesario

✅ **Resultado:** Historial de acciones visible para seguridad

---

## ⚠️ Solución de Problemas {#solución-de-problemas}

### Problema 1: No puedo iniciar sesión

**Síntomas:**
- Mensaje "Credenciales inválidas"
- Página de login se queda cargando

**Solución:**

1. Verifica que escribes bien el **usuario** (sin espacios)
2. Verifica **contraseña** (cuidado con mayúsculas)
3. Si olvidaste contraseña:
   - Haz clic en "¿Olvidó la contraseña?"
   - Ingresa tu correo
   - Revisa email con instrucciones
4. Si sigue sin funcionar, contacta al **Administrador**

---

### Problema 2: La foto no carga

**Síntomas:**
- Botón "Cargar Foto" no responde
- Error al intentar subir foto

**Solución:**

1. Verifica que el archivo sea JPG o PNG
2. Verifica que el archivo sea menor a 5 MB
3. Si está en formato diferente:
   - Abre con programa de fotos
   - Guarda como JPG/PNG
   - Intenta nuevamente
4. Si el archivo es muy grande:
   - Comprime la imagen (ej: con Irfanview, Paint)
   - Intenta nuevamente

---

### Problema 3: No veo la persona en la búsqueda

**Síntomas:**
- Búsqueda por nombre no funciona
- Cédula no aparece

**Solución:**

1. Verifica que la persona está registrada:
   - Ve a módulo Personas
   - Busca en listado completo
2. Si no aparece, debes registrarla:
   - Haz clic en "+ Nueva Persona"
   - Completa datos
   - Guarda
3. Si ya existe, intenta diferentes búsquedas:
   - Por nombre completo
   - Por parte del nombre
   - Por número de cédula exacto

---

### Problema 4: No puedo crear una visita

**Síntomas:**
- Botón "Guardar Visita" deshabilitado
- Mensaje de error con campos requeridos

**Solución:**

1. Verifica que completaste todos los campos **obligatorios**:
   - ✅ Persona (debe estar registrada)
   - ✅ Centro de Datos
   - ✅ Área(s)
   - ✅ Tipo de Actividad
   - ✅ Descripción
   - ✅ Fecha y Hora
2. Si aún hay error, recarga la página (F5) e intenta nuevamente
3. Si persiste, contacta soporte

---

### Problema 5: El PDF no se descarga

**Síntomas:**
- Botón "Descargar PDF" no funciona
- La descarga se cancela

**Solución:**

1. Asegúrate que la visita está **completada**
   - Debe tener check-in y check-out realizados
2. Verifica que tienes espacio en disco
3. Deshabilita bloqueadores de pop-ups:
   - En navegador, ve a Configuración
   - Busca "Pop-ups"
   - Añade el sitio a excepciones
4. Intenta con otro navegador

---

### Problema 6: Notificación de Telegram no llega

**Síntomas:**
- No recibo alertas en Telegram
- El check-in se completa pero sin notificación

**Solución:**

1. Verifica que estás en el grupo/canal correcto de Telegram
2. Verifica que el bot tiene permisos de escritura
3. Administrador debe revisar configuración:
   - `TELEGRAM_BOT_TOKEN` válido
   - `TELEGRAM_CHAT_ID` correcto
4. Si sigue sin funcionar, contacta soporte técnico

---

### Problema 7: Error "Base de Datos no disponible"

**Síntomas:**
- Mensaje "Error conectando a BD"
- La aplicación no carga

**Solución:**

1. Esto es problema del servidor, **NO de tu navegador**
2. Avisa inmediatamente al **Administrador del Sistema**
3. Mientras se resuelve:
   - Intenta nuevamente en 5 minutos
   - Prueba desde otra computadora
   - Intenta en otro navegador

---

### Problema 8: Mi sesión se cierra sola

**Síntomas:**
- Expira sin estar haciendo nada
- Vuelve a página de login

**Solución:**

1. Esto es normal por seguridad (timeout de 4 días)
2. Simplemente vuelve a iniciar sesión
3. Si quieres permanecer conectado:
   - Ten una pestaña abierta del sistema
   - Usa periódicamente
   - No cierres la sesión manualmente

---

## 📞 Contacto y Soporte

### Antes de Contactar

1. Revisa esta guía en la sección correspondiente
2. Ejecuta Health Check del sistema
3. Revisa si hay mantenimiento programado

### Contactos

**Soporte Técnico:**
- 📧 Email: soporte@seniat.gob.ve
- 💬 Telegram: [Bot del Sistema]
- 📞 Teléfono: +58-212-XXX-XXXX

**Administrador del Sistema:**
- 📧 Email: admin@seniat.gob.ve
- 📞 Interno: Extensión XXX

### Horario de Soporte

- **Lunes a Viernes:** 8:00 AM - 5:00 PM
- **Tiempo de Respuesta:** 
  - Críticos: < 1 hora
  - Normales: < 8 horas

---

## ✅ Conclusión

Con este manual estás listo para usar el sistema de gestión de accesos. 

**Recuerda:**
- Siempre cierra sesión al terminar
- No compartas tu contraseña
- Completa todos los datos requeridos
- Reporta cualquier problema

¡Bienvenido al Sistema! 🎉

---

**Manual v1.0 - Diciembre 2025**  
Para consultas, contacta a Soporte Técnico
