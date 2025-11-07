from rest_framework import views, permissions, viewsets
from rest_framework.response import Response
from .models import User
from .serializers import MeSerializer
from accounts.permissions import IsOwnerOrAdmin  # si no lo tienes, ver abajo
from rest_framework import serializers

class MeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        return Response(MeSerializer(request.user).data)

# Serializador específico para administrar (solo campos seguros)
class UserAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_active")
        read_only_fields = ("username", "email")

class UserAdminViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]  # Dueño/Admin

    def get_queryset(self):
        # evita que un Admin cambie al Dueño si no quieres (opcional)
        return super().get_queryset()
