# sales/views.py
from rest_framework import viewsets, permissions, decorators, response, status
from .models import Sale
from .serializers import SaleSerializer
from .services import checkout_sale, void_sale
from rest_framework import views, permissions
from rest_framework.response import Response
from decimal import Decimal
from catalog.models import Product
from promos.services import _unit_discount_for
# ← NUEVO: importamos DTE y AuditLog para crear el DTE y registrar bitácora
from dte.models import DTE
from audit.models import AuditLog

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all().order_by("-id")
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # 👇 tu modelo usa 'user'
        sale = serializer.save(user=self.request.user)
        checkout_sale(sale)  # baja stock + calcula total
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
            return Response({"error":"items debe ser lista"}, status=400)

        # cache simple de productos
        prod_ids = [it.get("product") for it in items if it.get("product")]
        prods = {p.id: p for p in Product.objects.filter(id__in=prod_ids).select_related("category")}

        out = []
        total_bruto = Decimal("0")
        total_desc   = Decimal("0")
        total_neto   = Decimal("0")

        for it in items:
            pid = it.get("product")
            qty = int(it.get("qty", 0) or 0)
            unit_price = Decimal(str(it.get("unit_price", "0")))
            if not pid or qty <= 0 or unit_price <= 0:
                continue

            product = prods.get(pid)
            if not product:
                continue

            # misma regla: mejor promo (no acumulada)
            disc_unit = _unit_discount_for(product, unit_price, promo=None)  # placeholder
            from promos.models import Promotion
            best = Decimal("0")
            for promo in Promotion.objects.filter(active=True).select_related("category").prefetch_related("products"):
                d = _unit_discount_for(product, unit_price, promo)
                if d > best:
                    best = d
            disc_unit = best

            line_bruto = unit_price * qty
            line_desc  = disc_unit * qty
            line_neto  = (unit_price - disc_unit) * qty

            total_bruto += line_bruto
            total_desc  += line_desc
            total_neto  += line_neto

            out.append({
                "product": pid,
                "name": product.name,
                "qty": qty,
                "unit_price": str(unit_price),
                "discount_unit": str(disc_unit),
                "line_total": str(line_neto),
            })

        return Response({
            "items": out,
            "total_bruto": str(total_bruto),
            "total_descuento": str(total_desc),
            "total_neto": str(total_neto),
        }, status=200)