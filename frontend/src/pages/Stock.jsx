import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useMe } from "../useMe";
import { formatMoney } from "../utils/money";

export default function Stock() {
  const { me } = useMe();
  const isAdmin = me?.role === "OWNER" || me?.role === "ADMIN";

  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", stock: "", min_stock: "", critical_stock: "" });
  const showThresholds = isAdmin && editingId !== null;
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const { data } = await api.get("/products/");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.response?.status === 401 ? "No autenticado" : "Error cargando stock");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCats = async () => {
      try {
        const { data } = await api.get("/categories/");
        setCats(Array.isArray(data) ? data : []);
      } catch {
        setCats([]);
      }
    };
    load();
    loadCats();
    const onFocus = () => {
      load();
      loadCats();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchText = !needle
      ? true
      : (r.name || "").toLowerCase().includes(needle) ||
        (r.code || "").toString().toLowerCase().includes(needle) ||
        (r.category_name || "").toLowerCase().includes(needle);
    const matchCat = catFilter ? String(r.category || "") === String(catFilter) : true;
    return matchText && matchCat;
  });

  // Umbrales por producto (con fallback antiguo si no estan configurados)
  const getStatus = (row) => {
    const s = Number(row.stock) || 0;
    const crit = Number(row.critical_stock);
    const min = Number(row.min_stock);
    const fallbackLow = 10;
    const fallbackMed = 30;
    const low = Number.isFinite(crit) && crit > 0 ? crit : fallbackLow;
    const med = Number.isFinite(min) && min > 0 ? min : fallbackMed;
    if (s <= low)
      return {
        key: "LOW",
        label: "Bajo",
        color: "var(--danger)",
        bg: "rgba(255,92,92,0.15)",
        border: "#ff5c5c",
        thresholdLow: low,
        thresholdMed: med,
      };
    if (s <= med)
      return {
        key: "MEDIUM",
        label: "Medio",
        color: "var(--warn)",
        bg: "rgba(255,159,28,0.12)",
        border: "#ff9f1c",
        thresholdLow: low,
        thresholdMed: med,
      };
    return {
      key: "NORMAL",
      label: "Normal",
      color: "#19c189",
      bg: "rgba(20,184,122,0.12)",
      border: "#14b87a",
      thresholdLow: low,
      thresholdMed: med,
    };
  };

  // Metricas
  const metrics = useMemo(() => {
    const totalProductos = rows.length;
    let stockTotal = 0;
    let lowCount = 0;
    for (const r of rows) {
      const s = Number(r.stock) || 0;
      stockTotal += s;
      const crit = Number(r.critical_stock) || 0;
      const fallbackLow = 10;
      if (s <= (crit || fallbackLow)) lowCount += 1;
    }
    return { totalProductos, stockTotal, lowCount };
  }, [rows]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      price: row.price ?? "",
      stock: row.stock ?? "",
      min_stock: row.min_stock ?? "",
      critical_stock: row.critical_stock ?? "",
    });
    setMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: "", price: "", stock: "", min_stock: "", critical_stock: "" });
  };

  const saveEdit = async (id) => {
    const priceNum = Number(form.price);
    const stockNum = Number(form.stock);
    const minNum = Number(form.min_stock || 0);
    const critNum = Number(form.critical_stock || 0);
    if (!form.name.trim()) return setMsg("El nombre no puede estar vacio.");
    if (isNaN(priceNum) || priceNum < 0) return setMsg("El precio debe ser >= 0.");
    if (!Number.isInteger(stockNum) || stockNum < 0) return setMsg("El stock debe ser un entero >= 0.");
    if (!Number.isInteger(minNum) || minNum < 0) return setMsg("El stock minimo debe ser un entero >= 0.");
    if (!Number.isInteger(critNum) || critNum < 0) return setMsg("El stock critico debe ser un entero >= 0.");
    if (critNum && minNum && critNum > minNum) return setMsg("El stock critico debe ser <= stock minimo.");

    try {
      await api.patch(`/products/${id}/`, {
        name: form.name.trim(),
        price: String(priceNum),
        stock: stockNum,
        min_stock: minNum,
        critical_stock: critNum,
      });
      setMsg("Producto actualizado.");
      setEditingId(null);
      await load();
    } catch (e) {
      const s = e?.response?.status;
      if (s === 403) setMsg("No tienes permisos para editar productos.");
      else if (s === 400) setMsg(`${e?.response?.data?.detail || "Datos invalidos."}`);
      else setMsg("Error al editar el producto.");
    }
  };
  const toggleTop = async (id, value) => {
    try {
      await api.patch(`/products/${id}/`, { top_seller: !!value });
      setMsg(value ? "Marcado como Top Seller." : "Quitado de Top Seller.");
      await load();
    } catch (e) {
      const s = e?.response?.status;
      if (s === 403) setMsg("No tienes permisos para cambiar Top Seller.");
      else setMsg("No se pudo actualizar Top Seller.");
    }
  };
  const eliminar = async (id, name) => {
    setDeleteModal({ open: true, id, name: name || "" });
  };

  const confirmDelete = async () => {
    const { id, name } = deleteModal;
    if (!id) return;
    try {
      await api.delete(`/products/${id}/`);
      setMsg("Producto eliminado correctamente.");
      setDeleteModal({ open: false, id: null, name: "" });
      await load();
    } catch (e) {
      const s = e?.response?.status;
      if (s === 403) setMsg("No tienes permisos para eliminar productos.");
      else if (s === 404) setMsg("Producto no encontrado.");
      else if (s === 400) setMsg(`${e?.response?.data?.detail || "No se pudo eliminar."}`);
      else setMsg("Error al eliminar el producto.");
      setDeleteModal({ open: false, id: null, name: "" });
    }
  };

  return (
    <div className="container">
      <h2 style={{ margin: "0 0 6px 0" }}>Gestion de Inventario</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <section
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04))",
          }}
        >
          <div style={{ color: "#aaa", fontSize: 13 }}>Total Productos</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{metrics.totalProductos}</div>
        </section>
        <section
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(0,255,170,0.05), rgba(0,255,170,0.08))",
          }}
        >
          <div style={{ color: "#aaa", fontSize: 13 }}>Stock Total</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--ok)" }}>{metrics.stockTotal}</div>
        </section>
        <section
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(255,92,92,0.07), rgba(255,92,92,0.1))",
          }}
        >
          <div style={{ color: "#aaa", fontSize: 13 }}>Stock Bajo</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--danger)" }}>{metrics.lowCount}</div>
        </section>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          placeholder="Buscar por nombre, SKU o categoria..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          style={{ minWidth: 180 }}
          title="Filtrar por categoria"
        >
          <option value="">Todas las categorias</option>
          {cats.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <button onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {msg && (
        <p className={msg.includes("actualizado") || msg.includes("eliminado") ? "msg-ok" : "msg-error"}>
          {msg}
        </p>
      )}

      <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>SKU</th>
            <th style={{ textAlign: "left" }}>Producto</th>
            <th style={{ textAlign: "left" }}>Categoria</th>
            <th style={{ textAlign: "right" }}>Precio</th>
            <th style={{ textAlign: "center" }}>Stock</th>
            {showThresholds && <th style={{ textAlign: "center" }}>Min</th>}
            {showThresholds && <th style={{ textAlign: "center" }}>Crítico</th>}
            <th style={{ textAlign: "center" }}>Estado</th>           
            <th style={{ textAlign: "center" }}>Top</th>
            {isAdmin && <th style={{ textAlign: "right" }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const isEditing = editingId === r.id;
            const st = getStatus(r);
            return (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ verticalAlign: "top" }}>
                  <div
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 13,
                      opacity: 0.9,
                    }}
                  >
                    {r.code || "-"}
                  </div>
                </td>
                <td>{isEditing ? <input name="name" value={form.name} onChange={onChange} /> : r.name}</td>
                <td style={{ verticalAlign: "top" }}>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{r.category_name || "-"}</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {isEditing ? (
                    <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={onChange} />
                  ) : (
                    formatMoney(r.price)
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {isEditing ? (
                    <input name="stock" type="number" step="1" min="0" value={form.stock} onChange={onChange} />
                  ) : (
                    r.stock
                  )}
                </td>
                {showThresholds && (
                  <td style={{ textAlign: "center" }}>
                    {isEditing ? (
                      <input name="min_stock" type="number" step="1" min="0" value={form.min_stock} onChange={onChange} />
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                {showThresholds && (
                  <td style={{ textAlign: "center" }}>
                    {isEditing ? (
                      <input name="critical_stock" type="number" step="1" min="0" value={form.critical_stock} onChange={onChange} />
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td style={{ textAlign: "center" }}>
                  <span
                    title={`Estado (crítico <= ${st.thresholdLow} / mínimo <= ${st.thresholdMed})`}
                    style={{
                      display: "inline-block",
                      border: `1px solid ${st.border}`,
                      color: st.color,
                      background: st.bg,
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      minWidth: 64,
                    }}
                  >
                    {st.label}
                  </span>
                </td>

                <td style={{ textAlign: "center" }}>
                  {isAdmin ? (
                    <input
                      type="checkbox"
                      checked={!!r.top_seller}
                      onChange={(e) => toggleTop(r.id, e.target.checked)}
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: "#aaa" }}>{r.top_seller ? "Si" : "No"}</span>
                  )}
                </td>

                {isAdmin && (
                  <td style={{ textAlign: "right" }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(r.id)}>Guardar</button>{" "}
                        <button className="btn-secondary" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(r)}>Editar</button>{" "}
                        <button className="btn-secondary" onClick={() => eliminar(r.id, r.name)}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!filtered.length && !loading && (
            <tr>
              <td
                colSpan={showThresholds ? (isAdmin ? 10 : 9) : (isAdmin ? 8 : 7)}
                style={{ padding: 8, color: "#666" }}
              >
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {deleteModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(420px, 92vw)",
              background: "#121212",
              border: "1px solid rgba(255,215,0,0.25)",
              borderRadius: 12,
              boxShadow: "0 14px 35px rgba(0,0,0,0.4)",
              padding: 18,
            }}
          >
            <h3 style={{ margin: "0 0 8px 0" }}>Eliminar producto</h3>
            <p style={{ margin: "0 0 12px 0", color: "#bbb" }}>
              Confirmar eliminacion de: <strong>{deleteModal.name || "producto"}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                onClick={() => setDeleteModal({ open: false, id: null, name: "" })}
              >
                Cancelar
              </button>
              <button onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
