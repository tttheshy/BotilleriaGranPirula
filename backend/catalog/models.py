from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=80)
    def __str__(self): return self.name

class Product(models.Model):
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        error_messages={"unique": "Ya existe un producto con ese código."},
    )
    name = models.CharField(max_length=120)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    min_stock = models.PositiveIntegerField(default=0)
    critical_stock = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)      # RF-16
    top_seller = models.BooleanField(default=False) 
    def __str__(self): return f"{self.code} - {self.name}"
