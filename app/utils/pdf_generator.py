from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
from io import BytesIO
from datetime import datetime

def generar_pdf_visita(visita_data: dict) -> bytes:
    """Genera PDF de visita y retorna bytes"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a5f7a'),
        spaceAfter=20,
        alignment=1  # Centrado
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#2d8fa3'),
        spaceAfter=10,
        spaceBefore=10
    )
    
    normal_style = styles['Normal']
    
    # Contenido
    elements = []
    
    # Título
    elements.append(Paragraph("📋 CONSTANCIA DE VISITA", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Información general
    elements.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
    
    data = [
        ["Código de Visita:", visita_data.get('codigovisita', 'N/A')],
        ["ID Visita:", str(visita_data.get('id', 'N/A'))],
        ["Persona:", visita_data.get('persona_nombre', 'N/A')],
        ["Cédula:", visita_data.get('persona_cedula', 'N/A')],
        ["Centro de Datos:", visita_data.get('centronombre', 'N/A')],
        ["Fecha Programada:", visita_data.get('fechaprogramada', 'N/A')],
    ]
    
    table = Table(data, colWidths=[2.5*inch, 3.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f4f8')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d0d0d0')),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Detalles de visita
    elements.append(Paragraph("DETALLES DE LA VISITA", heading_style))
    
    details_data = [
        ["Actividad:", visita_data.get('descripcionactividad', 'N/A')],
        ["Áreas:", ', '.join(visita_data.get('areasnombres', ['N/A']))],
        ["Estado:", visita_data.get('estado', 'N/A')],
        ["Autorizado por:", visita_data.get('autorizadopor', 'N/A')],
        ["Observaciones:", visita_data.get('observaciones', 'N/A')],
    ]
    
    details_table = Table(details_data, colWidths=[2.5*inch, 3.5*inch])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f4f8')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d0d0d0')),
    ]))
    
    elements.append(details_table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Pie de página
    elements.append(Paragraph(
        f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br/>Sistema de Gestión de Accesos SENIAT",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, alignment=1, textColor=colors.grey)
    ))
    
    # Generar PDF
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
