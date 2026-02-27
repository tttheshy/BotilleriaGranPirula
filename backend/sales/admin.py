from django import forms
from django.contrib import admin
from django.contrib.admin.widgets import AdminSplitDateTime
from django.utils import timezone

from .models import Sale, SaleItem

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0

PAYMENT_CHOICES = [
    ("CASH", "Efectivo"),
    ("DEBIT", "Debito"),
    ("CREDIT", "Credito"),
]


class SaleAdminForm(forms.ModelForm):
    manual_created_at = forms.SplitDateTimeField(
        required=False,
        label="Fecha de venta (manual)",
        help_text="Permite cargar ventas en fechas anteriores (solo admin).",
        widget=AdminSplitDateTime,
    )
    payment_method = forms.ChoiceField(choices=PAYMENT_CHOICES)

    class Meta:
        model = Sale
        fields = "__all__"

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at", "user", "status", "payment_method", "total")
    list_filter  = ("status", "payment_method")
    inlines = [SaleItemInline]
    form = SaleAdminForm
    readonly_fields = ("created_at",)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        manual_created_at = form.cleaned_data.get("manual_created_at")
        if manual_created_at:
            if timezone.is_naive(manual_created_at) and timezone.is_aware(timezone.now()):
                manual_created_at = timezone.make_aware(manual_created_at)
            Sale.objects.filter(pk=obj.pk).update(created_at=manual_created_at)
