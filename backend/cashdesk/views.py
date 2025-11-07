from rest_framework import viewsets, permissions, decorators, response, status
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from .models import CashSession
from .serializers import CashSessionSerializer

class CashSessionViewSet(viewsets.ModelViewSet):
    queryset = CashSession.objects.all().order_by("-opened_at")
    serializer_class = CashSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # opening_amount debe venir en el serializer
        serializer.save(opened_by=self.request.user)

    @decorators.action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        cs = self.get_object()
        if cs.status == "CLOSED":
            return response.Response(
                {"detail": "La caja ya está cerrada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw = request.data.get("closing_amount", None)
        if raw is None or str(raw).strip() == "":
            return response.Response(
                {"detail": "Debes enviar closing_amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            closing_amount = Decimal(str(raw))
            if closing_amount < 0:
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            return response.Response(
                {"detail": "closing_amount inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cs.closing_amount = closing_amount
        cs.closed_by = request.user
        cs.status = "CLOSED"
        cs.closed_at = timezone.now()
        cs.diff = (cs.closing_amount or Decimal("0")) - (cs.opening_amount or Decimal("0"))

        cs.save(update_fields=["closing_amount", "closed_by", "status", "closed_at", "diff"])

        return response.Response(
            {"status": "CLOSED", "closing_amount": str(cs.closing_amount), "diff": str(cs.diff)},
            status=status.HTTP_200_OK,
        )
