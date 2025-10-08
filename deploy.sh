#!/bin/bash

# Script de despliegue para el servidor de producción
# Sistema de Gestión de Accesos a Centros de Datos

echo "🚀 Iniciando despliegue del Sistema de Gestión de Accesos..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Instalando Docker..."
    
    # Instalar Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    
    print_status "Docker instalado correctamente"
fi

# Verificar si Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado. Instalando..."
    
    # Instalar Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_status "Docker Compose instalado correctamente"
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Parar contenedores existentes si los hay
print_status "Deteniendo contenedores existentes..."
docker-compose -f docker-compose.prod.yml down

# Limpiar imágenes antiguas
print_status "Limpiando imágenes antiguas..."
docker system prune -f

# Construir y levantar los servicios
print_status "Construyendo y levantando servicios..."
docker-compose -f docker-compose.prod.yml up -d --build

# Esperar a que los servicios estén listos
print_status "Esperando a que los servicios estén listos..."
sleep 30

# Verificar estado de los contenedores
print_status "Verificando estado de los contenedores..."
docker-compose -f docker-compose.prod.yml ps

# Verificar logs de la aplicación
print_status "Verificando logs de la aplicación..."
docker-compose -f docker-compose.prod.yml logs app

# Verificar que la API esté respondiendo
print_status "Verificando que la API esté respondiendo..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "✅ API respondiendo correctamente en http://localhost:8000"
else
    print_warning "⚠️  API no está respondiendo. Revisar logs."
fi

# Verificar que Nginx esté respondiendo
print_status "Verificando que Nginx esté respondiendo..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_status "✅ Nginx respondiendo correctamente en http://localhost"
else
    print_warning "⚠️  Nginx no está respondiendo. Revisar configuración."
fi

print_status "🎉 Despliegue completado!"
print_status "📋 URLs disponibles:"
print_status "   - API: http://localhost:8000"
print_status "   - Documentación: http://localhost:8000/docs"
print_status "   - Nginx: http://localhost"
print_status "   - Base de datos: localhost:5432"

print_status "📊 Comandos útiles:"
print_status "   - Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
print_status "   - Parar servicios: docker-compose -f docker-compose.prod.yml down"
print_status "   - Reiniciar: docker-compose -f docker-compose.prod.yml restart"
