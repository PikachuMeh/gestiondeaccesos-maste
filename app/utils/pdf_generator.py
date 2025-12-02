from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime
import base64


def generar_pdf_visita(visita_data: dict) -> bytes:
    """Genera PDF de visita con diseño profesional SENIAT"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    # =========================================================================
    # ESTILOS PERSONALIZADOS
    # =========================================================================
    fecha_style = ParagraphStyle(
        'FechaStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
        alignment=2,  # Derecha
        spaceAfter=5
    )
    
    titulo_acceso_style = ParagraphStyle(
        'TituloAcceso',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.black,
        alignment=1,  # Centrado
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    texto_cordial_style = ParagraphStyle(
        'TextoCordial',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
        alignment=4,  # Justificado
        spaceAfter=12,
        leading=14
    )
    
    datos_visitante_label_style = ParagraphStyle(
        'DatosLabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        alignment=0  # Izquierda
    )
    
    datos_visitante_value_style = ParagraphStyle(
        'DatosValue',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        alignment=0
    )
    
    seccion_titulo_style = ParagraphStyle(
        'SeccionTitulo',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.HexColor('#1a5f7a'),
        fontName='Helvetica-Bold',
        spaceAfter=8,
        alignment=0
    )
    
    # =========================================================================
    # CONTENIDO
    # =========================================================================
    elements = []
    
    # ===== 1. FECHA Y HORA (DERECHA) =====
    fecha_texto = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    elements.append(Paragraph(f"FECHA: {fecha_texto}", fecha_style))
    elements.append(Spacer(1, 0.1*inch))
    
    # ===== 2. TÍTULO CENTRADO =====
    elements.append(Paragraph("ACCESO REGISTRADO", titulo_acceso_style))
    elements.append(Spacer(1, 0.15*inch))
    
    # ===== 3. TEXTO CORDIAL (JUSTIFICADO) =====
    texto_cordial = f"""
    Tengo al honor de dirigirme a usted, en la oportunidad de extenderle un cordial saludo Bolivariano, 
    Revolucionario e institucional, en nombre del personal que labora en esta Gerencia, y a su vez hacer constancia 
    que el personal de la "UNIDAD O EMPRESA" <b>{visita_data.get('centro_nombre', 'N/A')}</b>, 
    Titular de la cédula venezolana: <b>{visita_data.get('persona_cedula', 'N/A')}</b>, la cual se concede acceso 
    al área para ejecutar: <b>{visita_data.get('descripcion_actividad', 'N/A')}</b>, correspondiente al área 
    estipulada por la empresa o unidad antes mencionada.
    """
    
    elements.append(Paragraph(texto_cordial, texto_cordial_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # ===== 4. FOTO EN GRANDE =====
    if visita_data.get('foto_data'):
        try:
            foto_bytes = base64.b64decode(visita_data['foto_data'])
            foto_buffer = BytesIO(foto_bytes)
            
            # Foto más grande, centrada (3" x 3.5")
            foto_img = Image(foto_buffer, width=2*inch, height=2.5*inch)
            
            # Tabla para centrar la foto
            foto_table = Table([[foto_img]], colWidths=[7*inch])
            foto_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            elements.append(foto_table)
            elements.append(Spacer(1, 0.2*inch))
            
        except Exception as e:
            print(f"⚠️ Error procesando foto: {e}")
    
    # ===== 5. DATOS DEL VISITANTE (CUADRO) =====
    elements.append(Paragraph("Datos del visitante", seccion_titulo_style))
    
    # Tabla con datos del visitante
    datos_visitante = [
        ["CÉDULA", visita_data.get('persona_cedula', 'N/A')],
        ["NOMBRE Y APELLIDO", visita_data.get('persona_nombre', 'N/A')],
        ["UNIDAD O EMPRESA", visita_data.get('persona_empresa', 'N/A')],
        ["EMAIL", visita_data.get('persona_email', 'N/A')],
    ]
    
    tabla_datos = Table(datos_visitante, colWidths=[2.5*inch, 4.5*inch])
    tabla_datos.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0e6d2')),  # Fondo beige para etiquetas
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
    ]))
    
    elements.append(tabla_datos)
    elements.append(Spacer(1, 0.2*inch))
    
    # ===== 6. BITÁCORA DE ACCIÓN =====
    elements.append(Paragraph("BITÁCORA DE ACCIÓN", seccion_titulo_style))
    
    bitacora_data = [
        ["ACTIVIDAD", visita_data.get('descripcion_actividad', 'N/A')],
        ["ÁREAS", ', '.join(visita_data.get('areas_nombres', ['N/A']))],
        ["TIPO DE ACTIVIDAD", visita_data.get('tipo_actividad', 'N/A')],
        ["EQUIPOS INGRESADOS", visita_data.get('equipos_ingresados', 'N/A')],
        ["EQUIPOS RETIRADOS", visita_data.get('equipos_retirados', 'N/A')],
        ["OBSERVACIONES", visita_data.get('observaciones', 'N/A')],
    ]
    
    tabla_bitacora = Table(bitacora_data, colWidths=[2.5*inch, 4.5*inch])
    tabla_bitacora.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0e6d2')),  # Fondo beige para etiquetas
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
    ]))
    
    elements.append(tabla_bitacora)
    elements.append(Spacer(1, 0.3*inch))
    
    # ===== 7. PIE DE PÁGINA =====
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=1,
        spaceAfter=0
    )
    
    elements.append(Paragraph(
        f"Sistema de Gestión de Accesos - SENIAT<br/>Generado: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}",
        footer_style
    ))
    
    # =========================================================================
    # GENERAR PDF
    # =========================================================================
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
