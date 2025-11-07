from django.contrib import admin
from .models import CashSession

@admin.register(CashSession)
class CashSessionAdmin(admin.ModelAdmin):
    list_display = ("id","status","opened_by","opened_at","closed_by","closed_at","opening_amount","closing_amount","diff")
    list_filter  = ("status",)
