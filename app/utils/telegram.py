import httpx
from app.config import settings
from typing import Optional

async def enviar_notificacion_telegram(
    visita_data: dict, 
    persona_nombre: str = "N/A", 
    pdf_bytes: Optional[bytes] = None
) -> Optional[str]:
    """Envía notificación completa de nueva visita a Telegram + PDF"""
    
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        print("⚠️ Telegram no configurado")
        return None
    
    mensaje = f"""
🆕 NUEVA VISITA REGISTRADA EN EL SISTEMA

👤 INFORMACIÓN DEL VISITANTE:
  • Nombre: {visita_data.get('persona_nombre', 'N/A')}
  • Cédula: {visita_data.get('persona_cedula', 'N/A')}
  • Empresa: {visita_data.get('persona_empresa', 'N/A')}
  • Email: {visita_data.get('persona_email', 'N/A')}

🔐 ACCESO AUTORIZADO:
  • Código de Visita: {visita_data.get('codigo_visita', 'N/A')}
  • Centro de Datos: {visita_data.get('centro_nombre', 'N/A')}
  • Ubicación: {visita_data.get('centro_ciudad', 'N/A')}
  
📋 DETALLES DE LA ACTIVIDAD:
  • Tipo: {visita_data.get('tipo_actividad', 'N/A')}
  • Descripción: {visita_data.get('descripcion_actividad', 'N/A')}
  • Áreas: {', '.join(visita_data.get('areas_nombres', ['N/A']))}
  
📅 CRONOGRAMA:
  • Fecha/Hora: {visita_data.get('fecha_programada', 'N/A')}
  • Duración: {visita_data.get('duracion_estimada', 'N/A')} min
  
✔️ ESTADO: {visita_data.get('estado', 'Pendiente')}
🔐 Autorizado por: {visita_data.get('autorizado_por', 'N/A')}

📎 Consulte el PDF adjunto para más detalles de la constancia.
    """.strip()
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": mensaje,
        "disable_web_page_preview": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            
            if resp.status_code != 200:
                print(f"❌ Telegram error {resp.status_code}")
                return None
            
            print("✅ Telegram: Mensaje de visita enviado")
            
            if pdf_bytes:
                url_doc = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendDocument"
                files = {
                    "chat_id": (None, str(settings.telegram_chat_id)),
                    "document": (
                        f"constancia_{visita_data.get('codigo_visita', 'unknown')}.pdf", 
                        pdf_bytes, 
                        "application/pdf"
                    ),
                    "caption": (None, "📎 Constancia Oficial de Visita - SENIAT")
                }
                
                resp_doc = await client.post(url_doc, files=files)
                
                if resp_doc.status_code == 200:
                    print("✅ Telegram: PDF enviado correctamente")
                    return resp_doc.json()
                else:
                    print(f"⚠️ Error enviando PDF por Telegram: {resp_doc.status_code}")
            
            return resp.json()
            
    except Exception as e:
        print(f"❌ Error en Telegram: {e}")
        return None


async def enviar_email_a_telegram(
    correo_destinatario: str, 
    asunto: str, 
    cuerpo: str, 
    pdf_bytes: Optional[bytes] = None
) -> Optional[str]:
    """Notifica a Telegram cuando se envía email al operador"""
    
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        print("⚠️ Telegram no configurado")
        return None
    
    email_from = settings.mail_from
    
    mensaje = f"""
📧 EMAIL DE CONSTANCIA ENVIADO

📤 De: {email_from}
📥 Para: {correo_destinatario}
📌 Asunto: {asunto}

📝 Resumen:
{cuerpo[:300]}...

✅ El email ha sido enviado correctamente con la constancia en PDF.
    """.strip()
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": mensaje,
        "disable_web_page_preview": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            
            if resp.status_code == 200:
                print("✅ Telegram: Notificación de email enviada")
            else:
                print(f"⚠️ Error notificando email: {resp.status_code}")
            
            return resp.json()
            
    except Exception as e:
        print(f"❌ Error en Telegram: {e}")
        return None
