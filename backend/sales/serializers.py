# sales/serializers.py
from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from .models import Sale, SaleItem
from promos.services import apply_promotions_to_sale


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_code = serializers.CharField(source="product.code", read_only=True)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default="0.00")
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
        fields = (
            "product",
            "product_name",
            "product_code",
            "qty",
            "unit_price",
            "discount",
            "line_total",
        )

    def get_line_total(self, obj):
        unit_price = obj.unit_price if obj.unit_price is not None else Decimal("0")
        discount = obj.discount if obj.discount is not None else Decimal("0")
        qty = Decimal(obj.qty or 0)
        total = (unit_price - discount) * qty
        return total.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    seller_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Sale
        fields = ("id", "status", "created_at", "payment_method", "total", "note", "seller_name", "items")
        read_only_fields = ("status", "total")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        sale = Sale.objects.create(**validated_data)
        for it in items_data:
            it.pop("discount", None)
            SaleItem.objects.create(sale=sale, discount=Decimal("0"), **it)
        apply_promotions_to_sale(sale)
        return sale
