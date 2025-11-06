#!/usr/bin/env python3
"""
Script de diagnóstico para problemas de autenticación de usuarios.
Verifica hashes, detecta problemas y ofrece soluciones.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import bcrypt

# ==================== CONFIGURACIÓN ====================
DATABASE_URL = "postgresql://postgres:juanes321@localhost/sistema_gestiones"
SCHEMA = "sistema_gestiones"

# Crear contexto de passlib
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==================== FUNCIONES ====================

def verificar_hash(password_texto, hash_bd):
    """Verifica un hash de múltiples formas"""
    print(f"\n--- Verificando hash ---")
    print(f"Hash en BD: {repr(hash_bd)}")
    print(f"Longitud: {len(hash_bd)} caracteres")
    print(f"Primeros 10 chars: {hash_bd[:10]}")
    print(f"Últimos 10 chars: {hash_bd[-10:]}")
    
    # Verificar formato
    if not hash_bd.startswith('$2'):
        print("❌ El hash NO empieza con $2 (no es bcrypt válido)")
        return False
    
    if len(hash_bd) != 60:
        print(f"⚠️  Longitud incorrecta. Bcrypt debe tener 60 chars, tiene {len(hash_bd)}")
    
    # Intentar con passlib
    try:
        resultado = pwd_context.verify(password_texto, hash_bd)
        print(f"✓ Verificación passlib: {'ÉXITO' if resultado else 'FALLÓ'}")
        return resultado
    except Exception as e:
        print(f"❌ Error passlib: {e}")
    
    # Intentar con bcrypt directo
    try:
        resultado = bcrypt.checkpw(
            password_texto.encode('utf-8'),
            hash_bd.encode('utf-8')
        )
        print(f"✓ Verificación bcrypt directo: {'ÉXITO' if resultado else 'FALLÓ'}")
        return resultado
    except Exception as e:
        print(f"❌ Error bcrypt directo: {e}")
    
    return False


def main():
    print("=" * 70)
    print("DIAGNÓSTICO DE USUARIOS - Sistema de Autenticación")
    print("=" * 70)
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Listar todos los usuarios
        print("\n1. USUARIOS EN LA BASE DE DATOS")
        print("-" * 70)
        
        result = db.execute(text(f"""
            SELECT 
                id, 
                cedula,
                username, 
                email,
                LENGTH(hashed_password) as pwd_len,
                LEFT(hashed_password, 10) as pwd_start,
                RIGHT(hashed_password, 10) as pwd_end,
                activo
            FROM {SCHEMA}.usuario
            ORDER BY id
        """))
        
        usuarios = []
        for row in result:
            print(f"ID: {row.id} | User: {row.username:15} | Email: {row.email:25} | Len: {row.pwd_len} | Start: {row.pwd_start} | Activo: {row.activo}")
            usuarios.append(row.username)
        
        if not usuarios:
            print("⚠️  No hay usuarios en la base de datos")
            crear_usuario = input("\n¿Crear usuario admin? (s/n): ")
            if crear_usuario.lower() == 's':
                crear_admin(db)
            return
        
        # 2. Seleccionar usuario para diagnosticar
        print("\n2. DIAGNÓSTICO DETALLADO")
        print("-" * 70)
        username = input(f"\nIngresa el username a diagnosticar [{usuarios[0]}]: ").strip() or usuarios[0]
        
        # Obtener datos completos del usuario
        result = db.execute(text(f"""
            SELECT id, username, hashed_password
            FROM {SCHEMA}.usuario
            WHERE username = :username
        """), {"username": username})
        
        user = result.fetchone()
        if not user:
            print(f"❌ Usuario '{username}' no encontrado")
            return
        
        print(f"\n📋 Usuario: {user.username}")
        print(f"📋 ID: {user.id}")
        print(f"📋 Hash completo:")
        print(f"   {user.hashed_password}")
        
        # 3. Probar contraseña
        print("\n3. PRUEBA DE CONTRASEÑA")
        print("-" * 70)
        password = input("Ingresa la contraseña a verificar: ")
        
        if verificar_hash(password, user.hashed_password):
            print("\n✅ ¡CONTRASEÑA CORRECTA!")
            print("El problema no es el hash, debe ser otra cosa.")
        else:
            print("\n❌ CONTRASEÑA INCORRECTA o HASH INVÁLIDO")
            print("\nOpciones:")
            print("1. Regenerar hash con nueva contraseña")
            print("2. Eliminar usuario y crear uno nuevo")
            print("3. Salir")
            
            opcion = input("\nSelecciona opción [1]: ").strip() or "1"
            
            if opcion == "1":
                nueva_pwd = input("Nueva contraseña: ")
                nuevo_hash = pwd_context.hash(nueva_pwd)
                
                print(f"\n📋 Nuevo hash generado:")
                print(f"   {nuevo_hash}")
                print(f"   Longitud: {len(nuevo_hash)}")
                
                # Actualizar en BD
                confirmar = input("\n¿Actualizar en la base de datos? (s/n): ")
                if confirmar.lower() == 's':
                    db.execute(text(f"""
                        UPDATE {SCHEMA}.usuario
                        SET hashed_password = :hash
                        WHERE id = :user_id
                    """), {"hash": nuevo_hash, "user_id": user.id})
                    db.commit()
                    print("✅ Hash actualizado exitosamente")
                    
                    # Verificar actualización
                    print("\n🔍 Verificando actualización...")
                    result = db.execute(text(f"""
                        SELECT hashed_password 
                        FROM {SCHEMA}.usuario 
                        WHERE id = :user_id
                    """), {"user_id": user.id})
                    nuevo_hash_bd = result.fetchone()[0]
                    
                    if verificar_hash(nueva_pwd, nuevo_hash_bd):
                        print("✅ ¡Verificación exitosa! El problema está resuelto.")
                    else:
                        print("❌ Aún hay problemas. Considera recrear el usuario.")
            
            elif opcion == "2":
                confirmar = input(f"⚠️  ¿ELIMINAR usuario '{username}'? (escribe SI): ")
                if confirmar == "SI":
                    db.execute(text(f"DELETE FROM {SCHEMA}.usuario WHERE id = :user_id"), {"user_id": user.id})
                    db.commit()
                    print("✅ Usuario eliminado")
                    
                    crear = input("¿Crear usuario nuevo? (s/n): ")
                    if crear.lower() == 's':
                        crear_usuario_nuevo(db)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def crear_admin(db):
    """Crea usuario admin desde cero"""
    print("\n" + "=" * 70)
    print("CREAR USUARIO ADMINISTRADOR")
    print("=" * 70)
    
    cedula = input("Cédula [12345678]: ").strip() or "12345678"
    username = input("Username [admin]: ").strip() or "admin"
    email = input("Email [admin@sistema.com]: ").strip() or "admin@sistema.com"
    nombre = input("Nombre [Administrador]: ").strip() or "Administrador"
    apellidos = input("Apellidos [Sistema]: ").strip() or "Sistema"
    password = input("Contraseña [admin123]: ").strip() or "admin123"
    
    # Generar hash
    hashed = pwd_context.hash(password)
    
    print(f"\n📋 Datos del usuario:")
    print(f"   Cédula: {cedula}")
    print(f"   Username: {username}")
    print(f"   Email: {email}")
    print(f"   Nombre: {nombre} {apellidos}")
    print(f"   Hash: {hashed}")
    
    try:
        db.execute(text(f"""
            INSERT INTO {SCHEMA}.usuario 
            (cedula, username, email, nombre, apellidos, hashed_password, rol_id, activo)
            VALUES 
            (:cedula, :username, :email, :nombre, :apellidos, :hash, 1, true)
        """), {
            "cedula": cedula,
            "username": username,
            "email": email,
            "nombre": nombre,
            "apellidos": apellidos,
            "hash": hashed
        })
        db.commit()
        print("\n✅ Usuario creado exitosamente")
    except Exception as e:
        print(f"\n❌ Error al crear usuario: {e}")
        db.rollback()


def crear_usuario_nuevo(db):
    """Crea un usuario nuevo"""
    crear_admin(db)


if __name__ == "__main__":
    main()
