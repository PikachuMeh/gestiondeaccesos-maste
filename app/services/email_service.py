"""
Servicio para envío de emails.
Maneja el envío de correos para recuperación de contraseña y notificaciones.
"""

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from typing import List, Optional
from app.config import settings


class EmailConfig:
    """Configuración de conexión para FastMail"""
    
    @staticmethod
    def get_config() -> Optional[ConnectionConfig]:
        """
        Crea y retorna la configuración de email si las credenciales están disponibles.
        Retorna None si falta alguna credencial.
        """
        # ✅ Validar que todas las credenciales estén presentes
        if not all([settings.mail_username, settings.mail_password, settings.mail_from]):
            return None
        
        try:
            return ConnectionConfig(
                MAIL_USERNAME=settings.mail_username,
                MAIL_PASSWORD=settings.mail_password,
                MAIL_FROM=settings.mail_from,
                MAIL_PORT=settings.mail_port,
                MAIL_SERVER=settings.mail_server,
                MAIL_FROM_NAME=settings.mail_from_name,
                MAIL_STARTTLS=settings.mail_tls,
                MAIL_SSL_TLS=settings.mail_ssl,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True
            )
        except Exception as e:
            print(f"❌ Error al configurar email: {str(e)}")
            return None


class EmailService:
    """Servicio para envío de emails"""
    
    def __init__(self):
        """Inicializa el servicio de email con validación de credenciales"""
        self.config = EmailConfig.get_config()
        
        if self.config is None:
            print("⚠️  ADVERTENCIA: Configuración de email incompleta.")
            print("   Las credenciales de email no están configuradas.")
            print("   Los correos NO se enviarán hasta que configures:")
            print("   - MAIL_USERNAME")
            print("   - MAIL_PASSWORD")
            print("   - MAIL_FROM")
            print("   en tu archivo .env")
            self.fast_mail = None
            self.email_enabled = False
        else:
            try:
                self.fast_mail = FastMail(self.config)
                self.email_enabled = True
                print("✓ Servicio de email configurado correctamente")
            except Exception as e:
                print(f"❌ Error al inicializar FastMail: {str(e)}")
                self.fast_mail = None
                self.email_enabled = False
    
    async def send_password_reset_email(
        self, 
        email: str, 
        username: str, 
        reset_token: str
    ) -> bool:
        """
        Envía un correo de recuperación de contraseña.
        
        Args:
            email: Correo del destinatario
            username: Nombre de usuario
            reset_token: Token de recuperación
            
        Returns:
            True si se envió exitosamente, False en caso contrario
        """
        # ✅ Verificar si el servicio está habilitado
        if not self.email_enabled or not self.fast_mail:
            print(f"⚠️  Email deshabilitado: No se envió correo a {email}")
            print(f"   Token generado: {reset_token[:20]}...")
            return False
        
        try:
            # Construir el link de reset
            reset_link = f"{settings.frontend_url}/reset-password?token={reset_token}"
            
            # Plantilla HTML del email
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background-color: #003366;
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }}
                    .content {{
                        background-color: #f9f9f9;
                        padding: 30px;
                        border-radius: 5px;
                    }}
                    .button {{
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: #007bff;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }}
                    .footer {{
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        font-size: 12px;
                        color: #666;
                        text-align: center;
                    }}
                    .warning {{
                        background-color: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 10px;
                        margin: 15px 0;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SENIAT - Recuperación de Contraseña</h1>
                    </div>
                    <div class="content">
                        <h2>Hola, {username}</h2>
                        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Control de Accesos del SENIAT.</p>
                        
                        <p>Para restablecer tu contraseña, haz clic en el siguiente botón:</p>
                        
                        <center>
                            <a href="{reset_link}" class="button">Restablecer Contraseña</a>
                        </center>
                        
                        <p>O copia y pega este enlace en tu navegador:</p>
                        <p style="word-break: break-all; color: #007bff;">{reset_link}</p>
                        
                        <div class="warning">
                            <strong>⚠️ Importante:</strong>
                            <ul>
                                <li>Este enlace es válido por <strong>30 minutos</strong></li>
                                <li>Solo puede ser usado una vez</li>
                                <li>Si no solicitaste este cambio, ignora este correo</li>
                            </ul>
                        </div>
                        
                        <p>Si tienes algún problema, contacta al administrador del sistema.</p>
                    </div>
                    <div class="footer">
                        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                        <p>© 2025 SENIAT - Sistema de Control de Accesos</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Crear el mensaje
            message = MessageSchema(
                subject="Recuperación de Contraseña - Sistema SENIAT",
                recipients=[email],
                body=html_body,
                subtype=MessageType.html
            )
            
            # Enviar el correo
            await self.fast_mail.send_message(message)
            print(f"✓ Email enviado exitosamente a {email}")
            return True
            
        except Exception as e:
            print(f"❌ Error al enviar email a {email}: {str(e)}")
            return False
    
    async def send_test_email(self, email: str) -> bool:
        """Envía un email de prueba"""
        if not self.email_enabled or not self.fast_mail:
            print(f"⚠️  Email deshabilitado: No se puede enviar email de prueba")
            return False
        
        try:
            message = MessageSchema(
                subject="Email de Prueba - Sistema SENIAT",
                recipients=[email],
                body="<h1>Este es un email de prueba</h1><p>Si recibes este mensaje, la configuración de email está funcionando correctamente.</p>",
                subtype=MessageType.html
            )
            
            await self.fast_mail.send_message(message)
            print(f"✓ Email de prueba enviado exitosamente a {email}")
            return True
        except Exception as e:
            print(f"❌ Error al enviar email de prueba: {str(e)}")
            return False


# Instancia global del servicio
email_service = EmailService()
