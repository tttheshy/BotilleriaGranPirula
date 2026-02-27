from rest_framework import serializers
from .models import Product, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    def validate_code(self, value):
        """
        Enforce unique code (SKU/barcode) case-insensitively.
        """
        qs = Product.objects.filter(code__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un producto con ese código.")
        return value

    def validate(self, attrs):
        min_stock = attrs.get("min_stock", getattr(self.instance, "min_stock", 0))
        critical_stock = attrs.get("critical_stock", getattr(self.instance, "critical_stock", 0))
        if min_stock is not None and min_stock < 0:
            raise serializers.ValidationError({"min_stock": "El stock mínimo debe ser >= 0."})
        if critical_stock is not None and critical_stock < 0:
            raise serializers.ValidationError({"critical_stock": "El stock crítico debe ser >= 0."})
        if min_stock and critical_stock and critical_stock > min_stock:
            raise serializers.ValidationError({"critical_stock": "El stock crítico debe ser <= stock mínimo."})
        return attrs

    class Meta:
        model = Product
        fields = [
            "id",
            "code",
            "name",
            "category",
            "category_name",
            "price",
            "stock",
            "min_stock",
            "critical_stock",
            "active",
            "top_seller",
        ]
        extra_kwargs = {
            "code": {
                "error_messages": {
                    "unique": "Ya existe un producto con ese código."
                }
            }
        }
