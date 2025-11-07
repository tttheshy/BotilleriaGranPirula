from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, F
from sales.models import Sale, SaleItem
from catalog.models import Product
from django.http import HttpResponse
import csv, io
from openpyxl import Workbook

class SalesReportView(APIView):
    def get(self, request):
        total = Sale.objects.filter(status="OK").aggregate(total=Sum("total"))["total"] or 0
        by_day = (Sale.objects.filter(status="OK")
                  .extra(select={"day":"date(created_at)"})
                  .values("day").annotate(total=Sum("total")).order_by("day"))
        return Response({"total_ventas": total, "por_dia": list(by_day)})

class InventoryReportView(APIView):
    def get(self, request):
        stock_critico = Product.objects.filter(stock__lte=0).count()
        return Response({"stock_critico": stock_critico})

class ExportView(APIView):
    def get(self, request):
        fmt = request.query_params.get("format","csv")
        qs = SaleItem.objects.select_related("sale","product").all()
        if fmt == "xlsx":
            wb = Workbook(); ws = wb.active; ws.title = "Items"
            ws.append(["venta_id","producto","qty","unit_price","discount","total_linea"])
            for it in qs:
                ws.append([it.sale_id, it.product.name, it.qty, float(it.unit_price),
                           float(it.discount), float((it.unit_price-it.discount)*it.qty)])
            resp = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            resp["Content-Disposition"] = 'attachment; filename="export.xlsx"'
            wb.save(resp); return resp
        buf = io.StringIO(); w = csv.writer(buf)
        w.writerow(["venta_id","producto","qty","unit_price","discount","total_linea"])
        for it in qs:
            w.writerow([it.sale_id, it.product.name, it.qty, it.unit_price,
                        it.discount, (it.unit_price-it.discount)*it.qty])
        resp = HttpResponse(buf.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="export.csv"'
        return resp
