from rest_framework import viewsets, permissions, views
from rest_framework.response import Response
from .models import InventoryMovement
from .serializers import InventoryMovementSerializer
from catalog.models import Product

# Para listar movimientos
class InventoryMovementViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovement.objects.all().order_by("-id")
    serializer_class = InventoryMovementSerializer
    permission_classes = [permissions.IsAuthenticated]

# Para ver el stock de todos los productos
class StockView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        qs = Product.objects.values("id","name","price","stock").order_by("name")
        return Response(list(qs))
