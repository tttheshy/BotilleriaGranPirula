"""Serializers for the promotions app."""
from rest_framework import serializers
from .models import Promotion
from catalog.models import Product


class PromotionSerializer(serializers.ModelSerializer):
    """Expose promotion data together with the selected products."""

    products = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), many=True, required=False
    )

    class Meta:
        model = Promotion
        fields = [
            "id",
            "name",
            "type",
            "value",
            "active",
            "category",
            "products",
        ]
