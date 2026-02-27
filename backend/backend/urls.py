from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from accounts.views import MeView, UserAdminViewSet
from catalog.views import ProductViewSet, CategoryViewSet
from sales.views import SaleViewSet, SalePreviewView
from inventory.views import InventoryMovementViewSet, StockView
from promos.views import PromotionViewSet
from reports.views import SalesReportView, InventoryReportView, ExportView
from audit.views import AuditLogViewSet
from cashdesk.views import CashSessionViewSet
from dte.views import DTEViewSet, DTEWebhookSimView, DTEBoletaPDFView

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="products")
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"sales", SaleViewSet, basename="sales")
router.register(r"inventory/movements", InventoryMovementViewSet, basename="inventory-movements")
router.register(r"promotions", PromotionViewSet, basename="promotions")
router.register(r"audit", AuditLogViewSet, basename="audit")
router.register(r"cash", CashSessionViewSet, basename="cash")
router.register(r"dte", DTEViewSet, basename="dte")
router.register(r"users", UserAdminViewSet, basename="users")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    path("api/reports/sales/", SalesReportView.as_view()),
    path("api/reports/inventory/", InventoryReportView.as_view()),
    path("api/export/", ExportView.as_view()),
    path("api/inventory/stock/", StockView.as_view()), 
    path("api/dte/simulate/", DTEWebhookSimView.as_view()),  # simula respuesta del emisor
    path("api/dte/boleta/<int:sale_id>/", DTEBoletaPDFView.as_view(), name="dte-boleta"),
    path("api/sales/preview/", SalePreviewView.as_view()),
    path("api/auth/me/", MeView.as_view()),
    path("api/", include(router.urls)),
]
