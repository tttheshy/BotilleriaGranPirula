from rest_framework import viewsets, permissions
from .models import Promotion
from .serializers import PromotionSerializer
from accounts.permissions import IsOwnerOrAdmin

class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all().order_by("-id")
    serializer_class = PromotionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
