# app/utils/pdf_generator.py - MEJORADO CON SOPORTE PARA BASE64 ✅

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from datetime import datetime
import io
import base64
from PIL import Image as PILImage
from io import BytesIO

def generar_pdf_visita(visita_data):
    """
    Genera un PDF profesional de constancia de visita
    
    ✅ Recibe:
    - visita_data['foto_data']: String en base64 de la foto
    - Resto de datos de la visita
    """
    
    # Crear buffer en memoria
    buffer = BytesIO()
    
    # Crear documento PDF con tamaño A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )
    
    # Contenedor de elementos
    elements = []
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#00378B'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#00378B'),
        spaceAfter=8,
        spaceBefore=8,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_LEFT,
        spaceAfter=4
    )
    
    # ====== HEADER ======
    elements.append(Paragraph("SISTEMA DE CONTROL DE ACCESOS", title_style))
    elements.append(Paragraph("SENIAT - CONSTANCIA DE VISITA", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # ====== INFORMACIÓN PRINCIPAL ======
    info_data = [
        ['Código de Visita:', visita_data.get('codigo_visita', 'N/A'), 'Fecha/Hora:', visita_data.get('fecha_programada', 'N/A')],
        ['Estado:', visita_data.get('estado', 'N/A'), 'Tipo de Actividad:', visita_data.get('tipo_actividad', 'N/A')],
    ]
    
    info_table = Table(info_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F0F0')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ====== INFORMACIÓN DE LA PERSONA ======
    elements.append(Paragraph("INFORMACIÓN DE LA PERSONA", heading_style))
    
    # Preparar foto
    foto_image = None
    if visita_data.get('foto_data'):
        try:
            # Decodificar base64
            foto_bytes = base64.b64decode(visita_data['foto_data'])
            foto_img = PILImage.open(BytesIO(foto_bytes))
            
            # Redimensionar si es necesario (máx 200x200)
            foto_img.thumbnail((200, 200), PILImage.Resampling.LANCZOS)
            
            # Guardar en buffer
            foto_buffer = BytesIO()
            foto_img.save(foto_buffer, format='PNG')
            foto_buffer.seek(0)
            
            foto_image = Image(foto_buffer, width=1.2*inch, height=1.2*inch)
            print("✅ Foto base64 procesada correctamente")
        except Exception as e:
            print(f"⚠️ Error procesando foto base64: {e}")
            foto_image = None
    
    # Tabla de persona
    persona_data = []
    
    # Primera fila: Foto + Datos básicos
    col1_persona = []
    if foto_image:
        col1_persona.append(foto_image)
    
    col2_persona = [
        Paragraph(f"<b>Nombre:</b> {visita_data.get('persona_nombre', 'N/A')}", normal_style),
        Paragraph(f"<b>Cédula:</b> {visita_data.get('persona_cedula', 'N/A')}", normal_style),
        Paragraph(f"<b>Email:</b> {visita_data.get('persona_email', 'N/A')}", normal_style),
        Paragraph(f"<b>Empresa:</b> {visita_data.get('persona_empresa', 'N/A')}", normal_style),
        Paragraph(f"<b>Cargo:</b> {visita_data.get('persona_cargo', 'N/A')}", normal_style),
    ]
    
    persona_table = Table([
        [col1_persona if foto_image else '', col2_persona]
    ], colWidths=[1.5*inch, 4.5*inch])
    persona_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(persona_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # ====== INFORMACIÓN DEL CENTRO ======
    elements.append(Paragraph("INFORMACIÓN DEL CENTRO", heading_style))
    centro_data = [
        ['Centro:', visita_data.get('centro_nombre', 'N/A'), 'Código:', visita_data.get('centro_codigo', 'N/A')],
        ['Ubicación:', visita_data.get('centro_ciudad', 'N/A'), 'Dirección:', visita_data.get('centro_direccion', 'N/A')],
    ]
    centro_table = Table(centro_data, colWidths=[1*inch, 2.2*inch, 1*inch, 2.2*inch])
    centro_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F0F0')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
    ]))
    elements.append(centro_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # ====== DETALLES DE LA VISITA ======
    elements.append(Paragraph("DETALLES DE LA VISITA", heading_style))
    
    # Áreas
    areas_str = ', '.join(visita_data.get('areas_nombres', [])) if visita_data.get('areas_nombres') else 'N/A'
    elementos_visita = [
        [Paragraph(f"<b>Áreas Autorizadas:</b> {areas_str}", normal_style)],
        [Paragraph(f"<b>Descripción de Actividad:</b> {visita_data.get('descripcion_actividad', 'N/A')}", normal_style)],
        [Paragraph(f"<b>Autorizado Por:</b> {visita_data.get('autorizado_por', 'N/A')}", normal_style)],
        [Paragraph(f"<b>Motivo de Autorización:</b> {visita_data.get('motivo_autorizacion', 'N/A')}", normal_style)],
    ]
    
    # Agregar equipos si existen
    if visita_data.get('equipos_ingresados') and visita_data.get('equipos_ingresados') != 'N/A':
        elementos_visita.append(
            [Paragraph(f"<b>Equipos Ingresados:</b> {visita_data.get('equipos_ingresados', 'N/A')}", normal_style)]
        )
    
    # Agregar observaciones si existen
    if visita_data.get('observaciones') and visita_data.get('observaciones') != 'N/A':
        elementos_visita.append(
            [Paragraph(f"<b>Observaciones:</b> {visita_data.get('observaciones', 'N/A')}", normal_style)]
        )
    
    visita_table = Table(elementos_visita, colWidths=[6*inch])
    visita_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
    ]))
    elements.append(visita_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ====== FOOTER ======
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.grey,
    )
    elements.append(Paragraph("Este documento es una constancia oficial de registro de visita", footer_style))
    elements.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", footer_style))
    
    # ====== GENERAR PDF ======
    doc.build(elements)
    
    # Obtener bytes del PDF
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


# ====== FUNCIÓN AUXILIAR PARA PROCESAR BASE64 ======
def procesar_foto_base64(foto_data_base64):
    """
    Convierte una foto en base64 a una imagen PIL
    Útil para procesamiento adicional
    """
    try:
        foto_bytes = base64.b64decode(foto_data_base64)
        foto_img = PILImage.open(BytesIO(foto_bytes))
        return foto_img
    except Exception as e:
        print(f"Error procesando foto: {e}")
        return None
