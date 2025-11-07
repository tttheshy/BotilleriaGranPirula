# sales/serializers.py
from rest_framework import serializers
from .models import Sale, SaleItem

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    # 👇 opcional con default 0
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default="0.00")

    class Meta:
        model = SaleItem
        fields = ("product", "product_name", "qty", "unit_price", "discount")

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    seller_name = serializers.CharField(source="user.username", read_only=True)  # 👈 lee user.username

    class Meta:
        model = Sale
        fields = ("id","status","created_at","payment_method","total","note","seller_name","items")
        read_only_fields = ("status","total")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        sale = Sale.objects.create(**validated_data)
        for it in items_data:
            SaleItem.objects.create(sale=sale, **it)
        return sale
