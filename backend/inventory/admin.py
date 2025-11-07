from django.contrib import admin
from .models import InventoryMovement

@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ("id","product","type","qty","reason","created_at")
    list_filter  = ("type",)
    search_fields = ("product__name","reason")
