from rest_framework import serializers
from .models import InventoryMovement
from catalog.models import Product

class InventoryMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = "__all__"
        
class StockSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="name", read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    stock = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Product
        fields = ("id" , "name" , "price" , "stock")

