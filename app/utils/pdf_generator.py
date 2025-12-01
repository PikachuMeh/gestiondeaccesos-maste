from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime
import base64

def generar_pdf_visita(visita_data: dict) -> bytes:
    """Genera PDF con diseño oficial del SENIAT - VERSIÓN MEJORADA"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    styles = getSampleStyleSheet()
    
    # 🎨 COLORES PERSONALIZADOS
    color_header_bg = colors.HexColor('#1a5f7a')      # Azul oscuro
    color_label_bg = colors.HexColor('#e8b5a2')       # Marrón/beige
    color_border = colors.HexColor('#999999')
    
    # 📝 ESTILOS PERSONALIZADOS
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Normal'],
        fontSize=18,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=4,
        spaceBefore=0
    )
    
    fecha_style = ParagraphStyle(
        'Fecha',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        fontName='Helvetica',
        alignment=TA_CENTER,
        spaceAfter=12
    )
    
    intro_style = ParagraphStyle(
        'Intro',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica',
        alignment=TA_JUSTIFY,
        spaceAfter=6,
        leading=12
    )
    
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT,
        spaceAfter=2,
        leftIndent=6
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        spaceAfter=2
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black,
        fontName='Helvetica',
        spaceAfter=2
    )
    
    elements = []
    
    # ═════════════════════════════════════════════════════════════
    # ENCABEZADO: TÍTULO Y FECHA
    # ═════════════════════════════════════════════════════════════
    elements.append(Paragraph("ACCESO REGISTRADO", title_style))
    
    fecha_str = datetime.now().strftime('FECHA: %d/%m/%Y %H:%M:%S')
    elements.append(Paragraph(fecha_str, fecha_style))
    
    elements.append(Spacer(1, 0.15*inch))
    
    # ═════════════════════════════════════════════════════════════
    # TEXTO INTRODUCTORIO
    # ═════════════════════════════════════════════════════════════
    intro_text = (
        f"<b>Tengo el honor</b> de dirigirme a usted, en la oportunidad de extenderle un cordial "
        f"saludo Bolivariano, Revolucionario e Institucional, en nombre del personal que labora "
        f"en esta Gerencia, y a su vez hacer constatancia que el personal de la "
        f"<b>\"UNIDAD O EMPRESA\"</b>: <b>{visita_data.get('persona_empresa', 'N/A')}</b>, Titular de la "
        f"cédula venezolana: <b>{visita_data.get('persona_cedula', 'N/A')}</b>, al cual se le conoce como "
        f"<b>{visita_data.get('persona_nombre', 'N/A')}</b> al área para ejecutar: "
        f"<b>{visita_data.get('descripcion_actividad', 'N/A')}</b>, correspondiente al área estipulada "
        f"por la empresa o unidad antes mencionada."
    )
    
    elements.append(Paragraph(intro_text, intro_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # ═════════════════════════════════════════════════════════════
    # FOTO DEL VISITANTE
    # ═════════════════════════════════════════════════════════════
    foto_base64 = visita_data.get('foto_data')
    if foto_base64:
        try:
            foto_bytes = base64.b64decode(foto_base64)
            foto_stream = BytesIO(foto_bytes)
            foto_stream.seek(0)
            img = Image(foto_stream, width=1.0*inch, height=1.3*inch)
            
            foto_table = Table([[img]], colWidths=[1.1*inch])
            foto_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BORDER', (0, 0), (-1, -1), 1, color_border),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            elements.append(foto_table)
            elements.append(Spacer(1, 0.25*inch))
            print("✅ Foto cargada correctamente desde Base64")
        except Exception as e:
            print(f"⚠️ Error procesando foto: {e}")
    else:
        print("⚠️ Sin foto en datos del PDF")
    
    # ═════════════════════════════════════════════════════════════
    # SECCIÓN: DATOS DEL VISITANTE
    # ═════════════════════════════════════════════════════════════
    datos_header = Table(
        [[Paragraph("Datos del visitante", section_header_style)]],
        colWidths=[7.0*inch]
    )
    datos_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color_label_bg),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(datos_header)
    
    # Tabla de datos del visitante
    datos_table = Table([
        [Paragraph("CÉDULA", label_style), Paragraph(visita_data.get('persona_cedula', 'N/A'), value_style)],
        [Paragraph("NOMBRE Y APELLIDOS", label_style), Paragraph(visita_data.get('persona_nombre', 'N/A'), value_style)],
        [Paragraph("UNIDAD O EMPRESA", label_style), Paragraph(visita_data.get('persona_empresa', 'N/A'), value_style)],
        [Paragraph("EMAIL", label_style), Paragraph(visita_data.get('persona_email', 'N/A'), value_style)],
    ], colWidths=[2.0*inch, 5.0*inch])
    
    datos_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), color_label_bg),
        ('BACKGROUND', (1, 0), (1, -1), colors.white),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, color_border),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    
    elements.append(datos_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # ═════════════════════════════════════════════════════════════
    # SECCIÓN: BITÁCORA DE ACCIÓN
    # ═════════════════════════════════════════════════════════════
    bitacora_header = Table(
        [[Paragraph("BITÁCORA DE ACCIÓN", section_header_style)]],
        colWidths=[7.0*inch]
    )
    bitacora_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color_label_bg),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(bitacora_header)
    
    # Tabla de bitácora
    bitacora_table = Table([
        [Paragraph("TRABAJO A REALIZAR", label_style), Paragraph(visita_data.get('descripcion_actividad', 'N/A'), value_style)],
        [Paragraph("ÁREA DONDE SE REALIZÓ", label_style), Paragraph(', '.join(visita_data.get('areas_nombres', ['N/A'])) if visita_data.get('areas_nombres') else 'N/A', value_style)],
        [Paragraph("CENTRO DE DATOS", label_style), Paragraph(visita_data.get('centro_nombre', 'N/A'), value_style)],
        [Paragraph("UBICACIÓN", label_style), Paragraph(visita_data.get('centro_ciudad', 'N/A'), value_style)],
        [Paragraph("FECHA PROGRAMADA", label_style), Paragraph(visita_data.get('fecha_programada', 'N/A'), value_style)],
        [Paragraph("CÓDIGO DE VISITA", label_style), Paragraph(visita_data.get('codigo_visita', 'N/A'), value_style)],
    ], colWidths=[2.0*inch, 5.0*inch])
    
    bitacora_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), color_label_bg),
        ('BACKGROUND', (1, 0), (1, -1), colors.white),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, color_border),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    
    elements.append(bitacora_table)
    elements.append(Spacer(1, 0.25*inch))
    
    # ═════════════════════════════════════════════════════════════
    # INFORMACIÓN ADICIONAL (si existe)
    # ═════════════════════════════════════════════════════════════
    if visita_data.get('observaciones') and visita_data.get('observaciones') != 'N/A':
        obs_header = Table(
            [[Paragraph("OBSERVACIONES", section_header_style)]],
            colWidths=[7.0*inch]
        )
        obs_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), color_label_bg),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(obs_header)
        elements.append(Paragraph(visita_data.get('observaciones'), value_style))
        elements.append(Spacer(1, 0.1*inch))
    
    if visita_data.get('autorizado_por') and visita_data.get('autorizado_por') != 'N/A':
        auth_header = Table(
            [[Paragraph("AUTORIZADO POR", section_header_style)]],
            colWidths=[7.0*inch]
        )
        auth_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), color_label_bg),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(auth_header)
        elements.append(Paragraph(visita_data.get('autorizado_por'), value_style))
        elements.append(Spacer(1, 0.1*inch))
    
    # ═════════════════════════════════════════════════════════════
    # PIE DE PÁGINA
    # ═════════════════════════════════════════════════════════════
    elements.append(Spacer(1, 0.15*inch))
    footer_text = f"Sistema de Control de Accesos SENIAT | Generado: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'],
        fontSize=7, alignment=TA_CENTER, textColor=colors.grey)
    elements.append(Paragraph(footer_text, footer_style))
    
    # ═════════════════════════════════════════════════════════════
    # CONSTRUIR PDF
    # ═════════════════════════════════════════════════════════════
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
