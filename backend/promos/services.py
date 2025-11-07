# promos/services.py
from decimal import Decimal, ROUND_HALF_UP
from .models import Promotion

def _unit_discount_for(product, unit_price, promo: Promotion):
    """
    Retorna el DESCUENTO por unidad para 'product' según la promo.
    Si no aplica, retorna Decimal('0').
    """
    if not promo.active:
        return Decimal("0")
    applies = False

    # Aplica por categoría
    if promo.category and product.category_id == promo.category_id:
        applies = True

    # Aplica por productos seleccionados
    if not applies and promo.products.filter(pk=product.pk).exists():
        applies = True

    if not applies:
        return Decimal("0")

    if promo.type == Promotion.PCT:
        disc = (unit_price * promo.value / Decimal("100"))
    else:  # FIXED
        disc = Decimal(promo.value)

    # No permitir descuento mayor al precio
    if disc > unit_price:
        disc = unit_price

    # Redondeo comercial a 2 decimales
    return disc.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def apply_promotions_to_sale(sale):
    """
    Recalcula el 'discount' (por unidad) de cada ítem de la venta
    usando la MEJOR promoción aplicable (la de mayor descuento por unidad).
    Regla simple: no acumulamos; elegimos la mejor.
    """
    active_promos = list(Promotion.objects.filter(active=True).select_related("category").prefetch_related("products"))

    # Si no hay promos, dejamos los descuentos tal como vienen
    if not active_promos:
        return sale

    for it in sale.items.select_related("product"):
        unit_price = it.unit_price
        best = None
        for promo in active_promos:
            d = _unit_discount_for(it.product, unit_price, promo)
            if best is None or d > best:
                best = d
        if best is not None and best > 0:
            it.discount = best  # descuento por unidad
            it.save(update_fields=["discount"])
    return sale
