from rest_framework import serializers
from .models import CashSession

class CashSessionSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.CharField(source="opened_by.username", read_only=True)
    closed_by_name = serializers.SerializerMethodField()

    def get_closed_by_name(self, obj):
        user = getattr(obj, "closed_by", None)
        return getattr(user, "username", None) if user else None

    class Meta:
        model = CashSession
        fields = "__all__"
        read_only_fields = ("status","opened_by","closed_by","diff","opened_at","closed_at")
