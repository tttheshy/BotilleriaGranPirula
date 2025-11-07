from rest_framework import serializers
from .models import CashSession

class CashSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashSession
        fields = "__all__"
        read_only_fields = ("status","opened_by","closed_by","diff","opened_at","closed_at")
