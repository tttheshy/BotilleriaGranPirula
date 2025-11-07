# catalog/views.py
from rest_framework import viewsets, filters
from accounts.permissions import ReadOnlyOrAdmin
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from django.db.models.deletion import ProtectedError
from rest_framework.response import Response
from rest_framework import status

# ← NUEVO: para la bitácora de cambio de precio
from audit.models import AuditLog

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["code","name"]

    # Si alguien (OWNER/ADMIN) edita el producto y cambia el precio,
    # guardamos un AuditLog con el antes/después del precio.
    def perform_update(self, serializer):
        instance = self.get_object()
        old_price = str(instance.price)
        product = serializer.save()
        if str(product.price) != old_price:
            AuditLog.objects.create(
                actor=self.request.user, action="PRICE_CHANGE",
                model="Product", obj_id=str(product.id),
                changes={"price": [old_price, str(product.price)]}
            )

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrAdmin]

    def destroy(self, request, *args, **kwargs):
        """Permite eliminar solo a Dueño/Admin y captura errores de dependencias."""
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar: la categoría tiene productos asociados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": f"Error al eliminar la categoría: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )