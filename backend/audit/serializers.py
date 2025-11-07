# audit/serializers.py
from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="actor.username", read_only=True)
    class Meta:
        model = AuditLog
        fields = "__all__"
