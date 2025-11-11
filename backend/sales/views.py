# sales/views.py
from rest_framework import viewsets, permissions, decorators, response, status
from .models import Sale
from .serializers import SaleSerializer
from .services import checkout_sale, void_sale
from rest_framework import views, permissions
from rest_framework.response import Response
from decimal import Decimal, ROUND_HALF_UP
from catalog.models import Product
from promos.services import best_unit_discount, get_active_promotions
from dte.models import DTE
from audit.models import AuditLog

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all().order_by("-id")
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        sale = serializer.save(user=self.request.user)
        checkout_sale(sale)
        DTE.objects.create(sale=sale, status="PENDING")
        AuditLog.objects.create(
            actor=self.request.user,
            action="SALE_CHECKOUT",
            model="Sale",
            obj_id=str(sale.id),
            changes={"total": str(sale.total)},
        )

    @decorators.action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        sale = self.get_object()
        reason = request.data.get("reason", "")
        from .services import void_sale
        void_sale(sale, reason)
        AuditLog.objects.create(
            actor=request.user,
            action="SALE_VOID",
            model="Sale",
            obj_id=str(sale.id),
            changes={"reason": reason},
        )
        return response.Response({"status": "VOID"}, status=status.HTTP_200_OK)


CLP_QUANT = Decimal("1")


def _clp(value: Decimal) -> Decimal:
    return value.quantize(CLP_QUANT, rounding=ROUND_HALF_UP)


class SalePreviewView(views.APIView):
    """
    Recibe: { items: [{product, qty, unit_price}] }
    Devuelve: por ítem (con discount_unit aplicado) y totales.
    No persiste, solo calcula usando la misma lógica de promos.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get("items", [])
        if not isinstance(items, list):
            return Response({"error": "items debe ser lista"}, status=400)

        prod_ids = [it.get("product") for it in items if it.get("product")]
        prods = {p.id: p for p in Product.objects.filter(id__in=prod_ids).select_related("category")}

        out = []
        total_bruto = Decimal("0")
        total_desc = Decimal("0")
        total_neto = Decimal("0")

        promos = get_active_promotions()

        for it in items:
            pid = it.get("product")
            qty = int(it.get("qty", 0) or 0)
            unit_price = Decimal(str(it.get("unit_price", "0")))
            if not pid or qty <= 0 or unit_price <= 0:
                continue

            product = prods.get(pid)
            if not product:
                continue

            disc_unit = best_unit_discount(product, unit_price, promos)

            qty_dec = Decimal(qty)
            line_bruto = unit_price * qty_dec
            line_desc = disc_unit * qty_dec
            line_neto = (unit_price - disc_unit) * qty_dec

            total_bruto += line_bruto
            total_desc += line_desc
            total_neto += line_neto

            out.append({
                "product": pid,
                "name": product.name,
                "qty": qty,
                "unit_price": str(_clp(unit_price)),
                "discount_unit": str(disc_unit),
                "line_total": str(_clp(line_neto)),
            })

        return Response({
            "items": out,
            "total_bruto": str(_clp(total_bruto)),
            "total_descuento": str(_clp(total_desc)),
            "total_neto": str(_clp(total_neto)),
        }, status=200)
