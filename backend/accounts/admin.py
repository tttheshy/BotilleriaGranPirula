from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # columnas en la tabla
    list_display = ("username", "email", "first_name", "last_name", "role", "is_staff", "is_superuser", "is_active")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")

    # agrega el campo "role" a los formularios del admin
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Rol", {"fields": ("role",)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Rol", {"fields": ("role",)}),
    )
