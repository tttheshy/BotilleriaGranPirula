from django.db import transaction
from decimal import Decimal
from inventory.services import register_movement

@transaction.atomic
def checkout_sale(sale):
    total = Decimal("0")
    for it in sale.items.select_related("product"):
        total += (it.unit_price - it.discount) * it.qty
    sale.total = total; sale.save(update_fields=["total"])
    for it in sale.items.all():
        register_movement(it.product, "OUT", it.qty, reason="SALE")
    return sale

@transaction.atomic
def void_sale(sale, reason=""):
    if sale.status == "VOID": return sale
    sale.status = "VOID"; sale.note = reason; sale.save(update_fields=["status","note"])
    for it in sale.items.all():
        register_movement(it.product, "IN", it.qty, reason="VOID")
    return sale
