from rest_framework import viewsets, permissions
from .models import AuditLog
from .serializers import AuditLogSerializer
from accounts.permissions import IsOwnerOrAdmin

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by("-ts")
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
