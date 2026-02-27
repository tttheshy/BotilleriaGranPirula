from rest_framework import views, permissions, viewsets, serializers
from rest_framework.response import Response
from .models import User
from .serializers import MeSerializer
from accounts.permissions import IsOwnerOrAdmin


class MeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class UserAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_active")
        read_only_fields = ("username", "email")


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "role", "is_active")

    def create(self, validated_data):
        password = validated_data.pop("password")
        username = validated_data.pop("username")
        email = validated_data.pop("email", "")
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            **validated_data,
        )
        return user


class UserAdminViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return super().get_queryset()

    def get_serializer_class(self):
        if getattr(self, "action", None) == "create":
            return UserCreateSerializer
        return UserAdminSerializer
