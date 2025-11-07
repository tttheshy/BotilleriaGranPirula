from django.db import models
from catalog.models import Product

class InventoryMovement(models.Model):
    IN, OUT, ADJ = "IN","OUT","ADJ"
    TYPE_CHOICES = [(IN,"Entrada"), (OUT,"Salida"), (ADJ,"Ajuste")]
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    type = models.CharField(max_length=3, choices=TYPE_CHOICES)
    qty = models.IntegerField()
    reason = models.CharField(max_length=140, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
