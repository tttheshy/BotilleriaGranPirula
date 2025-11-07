# dte/serializers.py
from rest_framework import serializers
from .models import DTE

class DTESerializer(serializers.ModelSerializer):
    class Meta:
        model = DTE
        fields = "__all__"
