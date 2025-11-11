import { useEffect, useMemo, useState } from "react";
import api from "../api";
import ymd from "../utils/ymd";

export default function VentasDia() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [soloOK, setSoloOK] = useState(true);
  const [itemsBySale, setItemsBySale] = useState({});
  const [open, setOpen] = useState({});
  const [cashSession, setCashSession] = useState(null);

  const hoy = new Date().toISOString().slice(0, 10);

  const load = async () => {
    setLoading(true);
    setMsg("");
    setOpen({});
    setItemsBySale({});
    setCashSession(null);

    let infoMsg = "";
    let hadError = false;

    try {
      const [salesResp, cashResp] = await Promise.all([
        api.get("/sales/"),
        api.get("/cash/"),
      ]);

      const salesData = Array.isArray(salesResp.data) ? salesResp.data : [];
      setVentas(salesData);

      const sessions = Array.isArray(cashResp.data) ? cashResp.data : [];
      const abierta = sessions.find((s) => s.status === "OPEN") || null;
      setCashSession(abierta);
      if (!abierta) {
        infoMsg = "La caja está cerrada. Las ventas del día se han reiniciado.";
      }
    } catch (err) {
      hadError = true;
      setMsg("No se pudieron cargar las ventas ni el estado de caja.");
      setVentas([]);
      setCashSession(null);
    } finally {
      setLoading(false);
      if (!hadError && infoMsg) {
        setMsg(infoMsg);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ventasHoy = useMemo(() => {
    if (!cashSession || !cashSession.opened_at) {
      return [];
    }

    const openedAt = new Date(cashSession.opened_at);

    return ventas.filter((v) => {
      const created = new Date(v.created_at);
      if (Number.isNaN(created.getTime())) return false;
      if (created < openedAt) return false;
      if (ymd(v.created_at) !== hoy) return false;
      return soloOK ? v.status === "OK" : true;
    });
  }, [ventas, hoy, soloOK, cashSession]);

  const totalHoy = useMemo(
    () =>
      ventasHoy.reduce((s, v) => {
        const amount = Number.parseFloat(v.total ?? 0);
        return s + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [ventasHoy]
  );

  const toggleOpen = async (id) => {
    const next = { ...open, [id]: !open[id] };
    setOpen(next);
    if (next[id] && !itemsBySale[id]) {
      try {
        const { data } = await api.get(`/sales/${id}/`);
        setItemsBySale((prev) => ({ ...prev, [id]: data.items || [] }));
      } catch {
        setItemsBySale((prev) => ({ ...prev, [id]: [] }));
      }
    }
  };

  const anular = async (id) => {
    const reason = prompt("Motivo de anulación:");
    if (reason === null) return;
    try {
      await api.post(`/sales/${id}/void/`, { reason });
      setMsg("Venta anulada.");
      setItemsBySale((prev) => ({ ...prev, [id]: undefined }));
      await load();
    } catch {
      setMsg("No se pudo anular (revisa permisos).");
    }
  };

  return (
    <div className="container">
      <h2>Ventas del día</h2>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <label>
          <input
            type="checkbox"
            checked={soloOK}
            onChange={(e) => setSoloOK(e.target.checked)}
          />{" "}
          Mostrar solo ventas OK
        </label>
        <button onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <h3 style={{ marginTop: 12 }}>Total del día: {formatMoney(totalHoy)}</h3>
      {msg && <p>{msg}</p>}

      <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}></th>
            <th style={{ textAlign: "left" }}>#</th>
            <th>Hora</th>
            <th>Vendedor</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ventasHoy.map((v) => {
            const abierto = !!open[v.id];
            const items = itemsBySale[v.id];
            return (
              <FragmentRow
                key={v.id}
                venta={v}
                abierto={abierto}
                items={items}
                onToggle={() => toggleOpen(v.id)}
                onAnular={() => anular(v.id)}
              />
            );
          })}
          {!ventasHoy.length && !loading && (
            <tr>
              <td colSpan={8} style={{ padding: 8, color: "#666" }}>
                Sin ventas hoy
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ venta, abierto, items, onToggle, onAnular }) {
  return (
    <>
      <tr style={{ borderTop: "1px solid #eee" }}>
        <td style={{ textAlign: "left", width: 36 }}>
          <button className="btn-secondary" onClick={onToggle}>
            {abierto ? "−" : "+"}
          </button>
        </td>
        <td style={{ textAlign: "left" }}>{venta.id}</td>
        <td style={{ textAlign: "center" }}>
          {new Date(venta.created_at).toLocaleTimeString()}
        </td>
        <td style={{ textAlign: "center" }}>{venta.seller_name || "-"}</td>
        <td style={{ textAlign: "center" }}>{venta.payment_method}</td>
        <td style={{ textAlign: "center" }}>{venta.status}</td>
        <td style={{ textAlign: "right" }}>{formatMoney(venta.total)}</td>
        <td style={{ textAlign: "right" }}>
          {venta.status === "OK" ? (
            <button onClick={onAnular}>Anular</button>
          ) : (
            <em>Anulada</em>
          )}
        </td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={8} style={{ background: "rgba(255,255,255,.03)" }}>
            <ItemsTable items={items} />
          </td>
        </tr>
      )}
    </>
  );
}

function ItemsTable({ items }) {
  if (items === undefined) {
    return <div style={{ padding: 8 }}>Cargando productos…</div>;
  }
  if (!items || !items.length) {
    return <div style={{ padding: 8, color: "#888" }}>Sin ítems</div>;
  }

  const totals = items.reduce(
    (acc, it) => {
      const qty = Number.parseFloat(it.qty ?? 0) || 0;
      const unit = Number.parseFloat(it.unit_price ?? 0) || 0;
      const discount = Number.parseFloat(it.discount ?? 0) || 0;
      acc.discount += discount * qty;
      acc.net += (unit - discount) * qty;
      return acc;
    },
    { discount: 0, net: 0 }
  );

  return (
    <div style={{ padding: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Código</th>
            <th style={{ textAlign: "left" }}>Producto</th>
            <th style={{ textAlign: "center" }}>Cant.</th>
            <th style={{ textAlign: "right" }}>Precio</th>
            <th style={{ textAlign: "right" }}>Desc/u</th>
            <th style={{ textAlign: "right" }}>Total línea</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const qty = Number.parseFloat(it.qty ?? 0) || 0;
            const unit = Number.parseFloat(it.unit_price ?? 0) || 0;
            const discount = Number.parseFloat(it.discount ?? 0) || 0;
            const line =
              Number.parseFloat(it.line_total ?? (unit - discount) * qty) || 0;
            return (
              <tr
                key={`${it.product || "item"}-${idx}`}
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <td>{it.product_code || "-"}</td>
                <td>{it.product_name || it.product}</td>
                <td style={{ textAlign: "center" }}>{qty}</td>
                <td style={{ textAlign: "right" }}>{formatMoney(unit)}</td>
                <td style={{ textAlign: "right" }}>{formatMoney(discount)}</td>
                <td style={{ textAlign: "right" }}>{formatMoney(line)}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={4}></td>
            <td style={{ textAlign: "right" }}>
              <strong>Descuento</strong>
            </td>
            <td style={{ textAlign: "right" }} colSpan={2}>
              <strong>{formatMoney(totals.discount)}</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={4}></td>
            <td style={{ textAlign: "right" }}>
              <strong>Total</strong>
            </td>
            <td style={{ textAlign: "right" }} colSpan={2}>
              <strong>{formatMoney(totals.net)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function formatMoney(value) {
  const amount = Number.parseFloat(value ?? 0);
  if (!Number.isFinite(amount)) {
    return (0).toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
