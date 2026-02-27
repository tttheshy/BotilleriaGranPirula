import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../api";
import { formatMoney } from "../utils/money";

const LOW_THRESHOLD = 10;

function ymd(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function Dashboard() {
  const today = ymd(new Date());
  const last7 = ymd(new Date(Date.now() - 6 * 24 * 3600 * 1000));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [cashSession, setCashSession] = useState(null);
  const [dateFrom, setDateFrom] = useState(last7);
  const [dateTo, setDateTo] = useState(today);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, s, c] = await Promise.all([api.get("/products/"), api.get("/sales/"), api.get("/cash/")]);
      setProducts(Array.isArray(p.data) ? p.data : []);
      setSales(Array.isArray(s.data) ? s.data : []);
      const sessions = Array.isArray(c.data) ? c.data : [];
      const abierta = sessions.find((x) => x.status === "OPEN") || null;
      setCashSession(abierta);
    } catch (e) {
      setError("No se pudieron cargar datos del dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    const t = setInterval(load, 10000);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const metrics = useMemo(() => {
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const end = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const inRange = (iso) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    };

    const okSales = sales.filter((s) => s.status === "OK" && inRange(s.created_at));
    const openedAt = cashSession?.opened_at ? new Date(cashSession.opened_at) : null;

    let totalVentas = 0;
    let totalUnidades = 0;
    let ventasDia = 0;
    let totalTickets = 0;

    const byDay = {};
    const byMonth = {};
    const byPayment = {};
    const byCategory = {};
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const s of okSales) {
      const total = Number(s.total) || 0;
      totalVentas += total;
      totalTickets += 1;
      const day = ymd(s.created_at);
      byDay[day] = (byDay[day] || 0) + total;
      const monthKey = `${new Date(s.created_at).getFullYear()}-${String(new Date(s.created_at).getMonth() + 1).padStart(2, "0")}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + total;
      const pm = s.payment_method || "OTRO";
      byPayment[pm] = (byPayment[pm] || 0) + total;
      if (Array.isArray(s.items)) {
        for (const it of s.items) {
          totalUnidades += Number(it.qty) || 0;
          const prod = productMap.get(it.product);
          const cat = prod?.category_name || "Sin categoría";
          const lineTotal = ((Number(it.unit_price) || 0) - (Number(it.discount) || 0)) * (Number(it.qty) || 0);
          byCategory[cat] = (byCategory[cat] || 0) + lineTotal;
        }
      }
      if (openedAt && ymd(s.created_at) === ymd(openedAt) && new Date(s.created_at) >= openedAt) {
        ventasDia += total;
      }
    }

    // Construir serie diaria dentro del rango
    const days = [];
    const startDay = start || new Date(okSales[0]?.created_at || Date.now());
    const endDay = end || new Date();
    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      const key = ymd(d);
      days.push({ day: key, total: byDay[key] || 0 });
    }

    const payData = Object.entries(byPayment).map(([method, value]) => ({ method, value }));

    // Ultimos 6 meses (incluyendo el actual)
    const months = [];
    const ref = end || new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ref);
      d.setMonth(d.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        month: new Date(d).toLocaleString("es-CL", { month: "short" }),
        year: d.getFullYear(),
        key,
        total: byMonth[key] || 0,
      });
    }

    const lowStock = products
      .filter((p) => (Number(p.stock) || 0) <= LOW_THRESHOLD)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 8);

    const topCategoryEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : "-";
    const topCategoryTotal = topCategoryEntry ? topCategoryEntry[1] : 0;

    return {
      totalVentas,
      totalUnidades,
      ventasDia,
      totalTickets,
      lowStock,
      lowCount: lowStock.length,
      daily: days,
      months,
      payData,
      topCategoryName,
      topCategoryTotal,
      recent: okSales
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    };
  }, [sales, products, dateFrom, dateTo, cashSession]);

  return (
    <div className="container">
      <h2>Dashboard</h2>
      <p style={{ marginTop: -6, color: "#aaa" }}>
        Resumen del negocio {cashSession ? `(caja abierta #${cashSession.id})` : `(caja cerrada)`}
      </p>

      {error && <p className="msg-error">{error}</p>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
          Desde
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
          Hasta
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button onClick={load} disabled={loading}>{loading ? "Actualizando..." : "Refrescar"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi label="Ventas en rango" value={formatMoney(metrics.totalVentas)} />
        <Kpi label="Top categoría" value={`${metrics.topCategoryName || "-"}`} hint={formatMoney(metrics.topCategoryTotal)} />
        <Kpi label="Ventas del dia" value={formatMoney(metrics.ventasDia)} />
        <Kpi label="Stock bajo" value={metrics.lowCount} color="var(--danger)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <section className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Ventas por mes (últimos 6)</strong>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={metrics.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="total" fill="#10b981" name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card" style={{ padding: 12 }}>
          <strong>Métodos de pago</strong>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
                <Pie
                  data={metrics.payData}
                  dataKey="value"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {metrics.payData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#6366f1"][index % 5]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginTop: 16 }}>
        <section className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <strong>Alertas de Stock Bajo</strong>
          </div>
          {metrics.lowStock.length === 0 ? (
            <div style={{ color: "#888" }}>No hay productos con stock bajo.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {metrics.lowStock.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "rgba(255,159,28,0.12)",
                    border: "1px solid #3a2d10",
                    borderRadius: 10,
                    padding: 10,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: "#bbb" }}>SKU: {p.code || "-"}</div>
                    <div style={{ fontSize: 13 }}>Stock actual: {p.stock}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#ccc" }}>{p.category_name || ""}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{ padding: 12 }}>
          <div style={{ color: "#6ab7ff", fontWeight: 700, marginBottom: 8 }}>$ Ventas recientes</div>
          <div style={{ display: "grid", gap: 8 }}>
            {metrics.recent.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Venta #{s.id}</div>
                  <div style={{ color: "#aaa", fontSize: 13 }}>
                    {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {Array.isArray(s.items) && ` · ${s.items.length} productos`}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>{formatMoney(s.total)}</div>
              </div>
            ))}
            {!metrics.recent.length && <div style={{ color: "#777" }}>Sin ventas en el rango seleccionado.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, color }) {
  return (
    <section
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04))",
      }}
    >
      <div style={{ color: "#aaa", fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || "inherit" }}>{value}</div>
      {hint && <div style={{ color: "#9fb3c8", fontSize: 12, marginTop: 2 }}>{hint}</div>}
    </section>
  );
}
