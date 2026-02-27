from decimal import Decimal
from io import BytesIO
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
import zlib

from django.http import FileResponse
from django.shortcuts import get_object_or_404

from rest_framework import permissions, response, status, views, viewsets

from sales.models import Sale

from .models import DTE
from .serializers import DTESerializer


class DTEViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DTE.objects.all().order_by("-id")
    serializer_class = DTESerializer
    permission_classes = [permissions.IsAuthenticated]


class DTEWebhookSimView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        sale_id = request.data.get("sale_id")
        result = request.data.get("result", "SENT")
        try:
            dte = DTE.objects.get(sale_id=sale_id)
            dte.status = result
            dte.save(update_fields=["status"])
            return response.Response({"ok": True}, status=status.HTTP_200_OK)
        except DTE.DoesNotExist:
            return response.Response({"error": "DTE not found"}, status=status.HTTP_404_NOT_FOUND)


def _escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _format_money(value: Decimal) -> str:
    amount = value or Decimal("0")
    return f"${amount.quantize(Decimal('1')):,.0f}".replace(",", ".")


def _decode_png_rgb(path: Path):
    """
    Lector PNG sencillo (8-bit RGB/RGBA) para incrustar el logo sin dependencias.
    Retorna (width, height, rgb_bytes).
    """
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Logo PNG con cabecera invalida")

    pos = 8
    width = height = color_type = bit_depth = None
    idat_chunks = []
    while pos + 8 <= len(data):
        length = int.from_bytes(data[pos : pos + 4], "big")
        chunk_type = data[pos + 4 : pos + 8]
        chunk_data = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            width = int.from_bytes(chunk_data[0:4], "big")
            height = int.from_bytes(chunk_data[4:8], "big")
            bit_depth = chunk_data[8]
            color_type = chunk_data[9]
        elif chunk_type == b"IDAT":
            idat_chunks.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if (
        width is None
        or height is None
        or bit_depth != 8
        or color_type not in (2, 6)  # 2=RGB, 6=RGBA
    ):
        raise ValueError("Logo PNG no soportado (solo RGB/RGBA 8-bit)")

    raw = zlib.decompress(b"".join(idat_chunks))
    bpp = 3 if color_type == 2 else 4
    stride = width * bpp
    out = bytearray()
    prev = bytearray(stride)
    idx = 0

    for _ in range(height):
        filt = raw[idx]
        idx += 1
        row = bytearray(raw[idx : idx + stride])
        idx += stride

        if filt == 1:  # Sub
            for x in range(bpp, stride):
                row[x] = (row[x] + row[x - bpp]) & 0xFF
        elif filt == 2:  # Up
            for x in range(stride):
                row[x] = (row[x] + prev[x]) & 0xFF
        elif filt == 3:  # Average
            for x in range(stride):
                left = row[x - bpp] if x >= bpp else 0
                up = prev[x]
                row[x] = (row[x] + ((left + up) >> 1)) & 0xFF
        elif filt == 4:  # Paeth
            for x in range(stride):
                a = row[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                row[x] = (row[x] + pr) & 0xFF
        # filt == 0 -> sin filtro

        out.extend(row)
        prev = row

    if color_type == 6:
        # Composicion alfa sobre fondo blanco
        rgb = bytearray()
        for i in range(0, len(out), 4):
            r, g, b, a = out[i : i + 4]
            alpha = a / 255.0
            rgb.append(int(r * alpha + 255 * (1 - alpha) + 0.5))
            rgb.append(int(g * alpha + 255 * (1 - alpha) + 0.5))
            rgb.append(int(b * alpha + 255 * (1 - alpha) + 0.5))
        out = rgb

    return width, height, bytes(out)


LOGO_PATH = Path(__file__).resolve().parent / "static" / "logo.png"


def _build_boleta_pdf(sale, items):
    """
    Genera un PDF de boleta profesional (A4) para fondo blanco.
    - Header con logo + datos boleta
    - Tabla con estilo
    - Caja de totales
    - Footer
    """
    # ---- Totales (misma lógica que tu versión) ----
    subtotal = sum((it.unit_price or Decimal("0")) * it.qty for it in items)
    total_discount = sum((it.discount or Decimal("0")) * it.qty for it in items)
    total = sale.total or (subtotal - total_discount)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=f"Boleta {sale.id}",
        author="Botilleria El Gran Pirula",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="TitleBig",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        textColor=colors.HexColor("#111827"),
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name="Label",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#6B7280"),
    ))
    styles.add(ParagraphStyle(
        name="Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#111827"),
    ))
    styles.add(ParagraphStyle(
        name="Small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#111827"),
    ))

    story = []

    # ---- Header (logo + info) ----
    left_cell = []
    if LOGO_PATH.exists():
        # Para boleta (fondo blanco) ideal que tu logo sea NEGRO o monocromo.
        # kind="proportional" evita deformación.
        left_cell.append(Image(str(LOGO_PATH), width=36 * mm, height=36 * mm, kind="proportional"))
    else:
        left_cell.append(Paragraph("<b>EL GRAN PIRULA</b>", styles["Body"]))

    right_cell = []
    right_cell.append(Paragraph("Botillería <b>El Gran Pirula</b>", styles["TitleBig"]))
    right_cell.append(Paragraph(f"<b>Boleta N°:</b> {sale.id}", styles["Body"]))
    right_cell.append(Paragraph(f"<b>Fecha:</b> {sale.created_at.strftime('%d-%m-%Y %H:%M')}", styles["Body"]))
    right_cell.append(Paragraph(f"<b>Pago:</b> {sale.payment_method or '-'}", styles["Body"]))
    right_cell.append(Paragraph(f"<b>Estado:</b> {sale.status or '-'}", styles["Body"]))

    header = Table(
        [[left_cell, right_cell]],
        colWidths=[52 * mm, None],
        hAlign="LEFT"
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header)

    # Línea separadora (fina)
    sep = Table([[""]], colWidths=[None])
    sep.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(sep)

    # ---- Título sección ----
    story.append(Paragraph("<b>Detalle de venta</b>", styles["Body"]))
    story.append(Spacer(1, 6))

    # ---- Tabla items ----
    data = [["Producto", "Cant.", "Unitario", "Desc.", "Total"]]

    for it in items:
        name = it.product.name if getattr(it, "product", None) else str(getattr(it, "product_id", ""))
        name = (name or "")[:60]

        unit_price = (it.unit_price or Decimal("0")) - (it.discount or Decimal("0"))
        line_total = unit_price * it.qty

        data.append([
            Paragraph(_escape_pdf_text(name), styles["Small"]),
            str(it.qty),
            _format_money(unit_price),
            _format_money(it.discount or Decimal("0")),
            _format_money(line_total),
        ])

    items_table = Table(
        data,
        colWidths=[None, 18 * mm, 28 * mm, 22 * mm, 30 * mm],
        hAlign="LEFT",
        repeatRows=1,  # si se va a otra hoja, repite encabezado
    )

    items_table.setStyle(TableStyle([
        # Header oscuro (pro)
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (1, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),

        # Body
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9.5),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),

        # Cebra suave
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
    ]))

    story.append(items_table)
    story.append(Spacer(1, 10))

    # ---- Caja totales (alineada a la derecha) ----
    totals_data = [
        ["Subtotal", _format_money(subtotal)],
        ["Descuentos", _format_money(total_discount)],
        ["Total a pagar", _format_money(total)],
    ]
    totals = Table(totals_data, colWidths=[32 * mm, 40 * mm], hAlign="RIGHT")
    totals.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -2), colors.HexColor("#F3F4F6")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -2), 10),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("BOX", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(totals)

    story.append(Spacer(1, 14))

    # ---- Footer ----
    story.append(Table([[""]], colWidths=[None], style=TableStyle([
        ("LINEABOVE", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
    ])))
    story.append(Paragraph("Gracias por su compra.", styles["Label"]))
    story.append(Paragraph("Documento generado automáticamente.", styles["Label"]))

    doc.build(story)

    return buffer.getvalue()


class DTEBoletaPDFView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, sale_id):
        sale = get_object_or_404(
            Sale.objects.select_related("user", "dte").prefetch_related("items__product"),
            pk=sale_id,
        )
        items = list(sale.items.select_related("product"))
        pdf_content = _build_boleta_pdf(sale, items)
        filename = f"boleta_{sale.id}.pdf"
        return FileResponse(BytesIO(pdf_content), filename=filename, content_type="application/pdf")
