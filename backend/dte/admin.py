from django.contrib import admin
from .models import DTE

@admin.register(DTE)
class DTEAdmin(admin.ModelAdmin):
    list_display = ("id","sale","status","external_id","message")
    list_filter  = ("status",)
