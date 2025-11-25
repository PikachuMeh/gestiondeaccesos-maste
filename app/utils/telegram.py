import httpx
from app.config import settings
from typing import Optional

async def enviar_notificacion_telegram(visita_data: dict, persona_nombre: str = "N/A") -> Optional[str]:
    """Envía notificación de nueva visita a Telegram"""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        print("⚠️ Telegram no configurado")
        return None
    
    # ✅ TEXTO PLANO - SIN Markdown
    mensaje = f"""🆕 Nueva Visita Registrada

👤 Persona: {persona_nombre}
📄 Código: {visita_data.get('codigovisita', 'N/A')}
🏢 Centro: {visita_data.get('centronombre', 'N/A')}
📋 Actividad: {visita_data.get('descripcionactividad', 'N/A')}
📅 Fecha: {visita_data.get('fechaprogramada', 'N/A')}
🔢 ID: {visita_data.get('id', 'N/A')}

Áreas: {', '.join(visita_data.get('areasnombres', ['N/A']))}"""
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": mensaje,
        # ✅ SIN parse_mode = Texto plano garantizado
        "disable_web_page_preview": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                print("✅ Telegram: Mensaje enviado al grupo")
                return resp.json()
            else:
                print(f"❌ Telegram HTTP {resp.status_code}: {await resp.aread()}")
                return None
    except Exception as e:
        print(f"❌ Telegram error: {e}")
        return None
