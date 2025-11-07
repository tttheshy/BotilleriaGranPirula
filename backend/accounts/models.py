from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    OWNER = "OWNER"; ADMIN = "ADMIN"; SELLER = "SELLER"
    ROLE_CHOICES = [(OWNER,"Dueño"), (ADMIN,"Administrador"), (SELLER,"Vendedor")]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=SELLER)
