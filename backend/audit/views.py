from rest_framework import permissions, viewsets

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AuditLog.objects.all().order_by("-ts")
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()

        role = getattr(user, "role", "")
        role = role.upper() if isinstance(role, str) else ""
        is_admin = user.is_superuser or getattr(user, "is_staff", False) or role in ("OWNER", "ADMIN")
        if is_admin:
            return qs
        return qs.filter(actor=user)