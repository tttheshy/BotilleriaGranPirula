from django.db import transaction
from .models import InventoryMovement

@transaction.atomic
def register_movement(product, type_, qty, reason=""):
    mv = InventoryMovement.objects.create(product=product, type=type_, qty=qty, reason=reason)
    if type_ == "IN":
        product.stock += max(0, qty)
    elif type_ == "OUT":
        product.stock = max(0, product.stock - max(0, qty))
    else:  # ADJ
        product.stock += qty
        if product.stock < 0: product.stock = 0
    product.save(update_fields=["stock"])
    return mv
