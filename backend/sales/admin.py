from django.contrib import admin
from .models import Sale, SaleItem

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at", "user", "status", "payment_method", "total")
    list_filter  = ("status", "payment_method")
    inlines = [SaleItemInline]
