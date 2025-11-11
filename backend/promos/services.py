# promos/services.py
from decimal import Decimal, ROUND_HALF_UP
from .models import Promotion

CLP_QUANT = Decimal("1")


def _product_ids(promo: Promotion):
    cache = getattr(promo, "_product_ids_cache", None)
    if cache is None:
        cache = {p.pk for p in promo.products.all()}
        promo._product_ids_cache = cache
    return cache


def _quantize_clp(value: Decimal) -> Decimal:
    return value.quantize(CLP_QUANT, rounding=ROUND_HALF_UP)


def _unit_discount_for(product, unit_price: Decimal, promo: Promotion) -> Decimal:
    """Retorna el DESCUENTO por unidad para 'product' según la promo."""
    if not promo.active:
        return Decimal("0")

    applies = False
    if promo.category_id and product.category_id == promo.category_id:
        applies = True
    elif product.pk in _product_ids(promo):
        applies = True

    if not applies:
        return Decimal("0")

    if promo.type == Promotion.PCT:
        disc = unit_price * promo.value / Decimal("100")
    else:
        disc = Decimal(promo.value)

    if disc > unit_price:
        disc = unit_price

    return _quantize_clp(disc)


def _active_promotions():
    promos = list(
        Promotion.objects.filter(active=True)
        .select_related("category")
        .prefetch_related("products")
    )
    for promo in promos:
        _product_ids(promo)
    return promos


def best_unit_discount(product, unit_price: Decimal, promos=None) -> Decimal:
    if promos is None:
        promos = _active_promotions()
    best = Decimal("0")
    for promo in promos:
        disc = _unit_discount_for(product, unit_price, promo)
        if disc > best:
            best = disc
    return best


def get_active_promotions():
    return _active_promotions()


def apply_promotions_to_sale(sale):
    """
    Recalcula el 'discount' por unidad de cada ítem de la venta
    usando la mejor promoción disponible (sin acumulación).
    """
    promos = _active_promotions()
    if not promos:
        # Si no hay promociones activas dejamos los descuentos en cero
        sale.items.exclude(discount=Decimal("0")).update(discount=Decimal("0"))
        return sale

    for it in sale.items.select_related("product__category"):
        best = best_unit_discount(it.product, it.unit_price, promos)
        if it.discount != best:
            it.discount = best
            it.save(update_fields=["discount"])
    return sale
