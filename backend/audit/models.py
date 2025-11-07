from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=40)
    model = models.CharField(max_length=60)
    obj_id = models.CharField(max_length=60)
    changes = models.JSONField(default=dict)
    ts = models.DateTimeField(auto_now_add=True)
