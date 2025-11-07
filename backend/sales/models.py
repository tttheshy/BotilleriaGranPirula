from django.db import models
from django.conf import settings
from catalog.models import Product

class Sale(models.Model):
    OK, VOID = "OK","VOID"
    status = models.CharField(max_length=8, default=OK)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, default="CASH")  # RF-17
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.CharField(max_length=140, blank=True)  # motivo (RF-11)

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
