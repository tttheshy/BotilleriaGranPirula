from django.db import models
from django.conf import settings

class CashSession(models.Model):
    OPEN, CLOSED = "OPEN","CLOSED"
    status = models.CharField(max_length=6, default=OPEN)
    opened_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="cash_opened", on_delete=models.PROTECT)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="cash_closed", null=True, blank=True, on_delete=models.PROTECT)
    opening_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    closing_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    diff = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    
    @classmethod
    def get_current(cls):
        """Return the most recent open cash session, if any."""
        return cls.objects.filter(status=cls.OPEN).order_by("-opened_at").first()
