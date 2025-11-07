from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id","actor","action","model","obj_id","ts")
    list_filter  = ("action","model")
    search_fields = ("obj_id", "actor__username")
