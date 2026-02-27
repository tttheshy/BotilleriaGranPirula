from django.db import models
from sales.models import Sale

class DTE(models.Model):
    PENDING, SENT, REJECTED = "PENDING","SENT","REJECTED"
    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name="dte")
    status = models.CharField(max_length=10, default=PENDING)
    external_id = models.CharField(max_length=64, blank=True)
    message = models.CharField(max_length=200, blank=True)
