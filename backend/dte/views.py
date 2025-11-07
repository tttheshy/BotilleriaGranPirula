from rest_framework import viewsets, permissions, views, response, status
from .models import DTE
from .serializers import DTESerializer

class DTEViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DTE.objects.all().order_by("-id")
    serializer_class = DTESerializer
    permission_classes = [permissions.IsAuthenticated]

class DTEWebhookSimView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        sale_id = request.data.get("sale_id")
        result = request.data.get("result","SENT")
        try:
            dte = DTE.objects.get(sale_id=sale_id)
            dte.status = result
            dte.save(update_fields=["status"])
            return response.Response({"ok": True}, status=status.HTTP_200_OK)
        except DTE.DoesNotExist:
            return response.Response({"error":"DTE not found"}, status=status.HTTP_404_NOT_FOUND)
