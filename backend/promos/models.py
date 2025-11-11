from django.db import models
from catalog.models import Product, Category 

class Promotion(models.Model):
    PCT, FIXED = "PCT","FIXED"
    TYPE_CHOICES = [(PCT,"%"), (FIXED,"$")]
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=6, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    active = models.BooleanField(default=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    products = models.ManyToManyField(Product, blank=True)
