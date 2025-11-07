from django.contrib import admin
from .models import Category, Product

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "price", "stock", "active", "top_seller", "category")
    list_filter = ("active", "top_seller", "category")
    search_fields = ("code", "name")
