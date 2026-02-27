import { useEffect, useMemo, useState } from "react";
import api from "../api";

const TYPE_BADGE = {
  PCT: "%",
  FIXED: "CLP",
};

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const EMPTY_FORM = () => ({
  name: "",
  type: "PCT",
  value: "",
  active: true,
  category: "",
  products: [],
});

export default function Promos() {
  const [promos, setPromos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(() => EMPTY_FORM());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  const categoryLookup = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const productLookup = useMemo(() => {
    const map = new Map();
    products.forEach((prod) => map.set(prod.id, prod));
    return map;
  }, [products]);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [promRes, catRes, prodRes] = await Promise.all([
        api.get("/promotions/"),
        api.get("/categories/"),
        api.get("/products/"),
      ]);
      setPromos(Array.isArray(promRes.data) ? promRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch (error) {
      console.error("Error al cargar datos de promociones", error);
      setMessage({ type: "error", text: "No se pudieron cargar las promociones." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleToggleProduct = (id) => {
    setForm((prev) => {
      const exists = prev.products.includes(id);
      return {
        ...prev,
        products: exists ? prev.products.filter((pid) => pid !== id) : [...prev.products, id],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!form.name.trim() || form.value === "") {
      setMessage({ type: "error", text: "Nombre y valor son obligatorios." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        value: String(form.value),
        active: Boolean(form.active),
        category: form.category || null,
        products: form.products,
      };
      await api.post("/promotions/", payload);
      setMessage({ type: "success", text: "Promoción creada correctamente." });
      setForm(EMPTY_FORM());
      await loadData();
    } catch (error) {
      if (error?.response?.status === 403) {
        setMessage({ type: "error", text: "No tienes permisos para crear promociones." });
      } else {
        console.error("Error al crear la promoción", error);
        setMessage({ type: "error", text: "No se pudo crear la promoción." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promo, nextState) => {
    try {
      await api.patch(`/promotions/${promo.id}/`, { active: nextState });
      await loadData();
    } catch (error) {
      console.error("Error al cambiar estado de la promoción", error);
      setMessage({ type: "error", text: "No se pudo cambiar el estado." });
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`¿Eliminar la promoción "${promo.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/promotions/${promo.id}/`);
      setMessage({ type: "success", text: "Promoción eliminada." });
      await loadData();
    } catch (error) {
      if (error?.response?.status === 403) {
        setMessage({ type: "error", text: "No tienes permisos para eliminar la promoción." });
      } else {
        console.error("Error al eliminar la promoción", error);
        setMessage({ type: "error", text: "No se pudo eliminar la promoción." });
      }
    }
  };

  const formatValue = (promo) => {
    if (promo.type === "PCT") {
      return `${promo.value}%`;
    }
    const numeric = Number(promo.value);
    return Number.isFinite(numeric) ? CLP.format(numeric) : promo.value;
  };

  const stockedProducts = useMemo(
    () => products.filter((p) => Number(p.stock) > 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return stockedProducts;
    return stockedProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const code = (p.code || "").toString().toLowerCase();
      return name.includes(needle) || code.includes(needle);
    });
  }, [stockedProducts, productSearch]);

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto" }}>
      <h2>Promociones</h2>
      {message && (
        <div
          style={{
            borderRadius: 8,
            padding: "12px 16px",
            background: message.type === "error" ? "#fee2e2" : "#dcfce7",
            color: message.type === "error" ? "#b91c1c" : "#166534",
          }}
        >
          {message.text}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <label>Nombre
          <input name="name" value={form.name} onChange={handleChange} placeholder="Ej: 10% bebidas" />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 200px" }}>Tipo
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="PCT">Porcentaje (%)</option>
              <option value="FIXED">Monto fijo ($)</option>
            </select>
          </label>
          <label style={{ flex: "1 1 200px" }}>Valor
            <input name="value" type="number" step="1" value={form.value} onChange={handleChange} />
          </label>
        </div>
        <label>Categoría
          <select name="category" value={form.category} onChange={handleChange}>
            <option value="">(Ninguna)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <fieldset style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
          <legend style={{ padding: "0 8px" }}>Productos específicos</legend>
          <p style={{ marginTop: 0, color: "#666", fontSize: 14 }}>
            Marca productos en stock para aplicar esta promoción
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              style={{ flex: 1, padding: "6px 8px" }}
              placeholder="Buscar por nombre o SKU"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <small style={{ color: "#666" }}>
              {filteredProducts.length} {filteredProducts.length === 1 ? "producto" : "productos"}
            </small>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 10,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {filteredProducts.map((product) => (
              <label
                key={product.id}
                style={{
                  border: "1px solid var(--border, #ddd)",
                  borderRadius: 8,
                  padding: 10,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 10,
                  alignItems: "center",
                  fontSize: 14,
                  background: form.products.includes(product.id) ? "#f0fdf4" : "white",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.products.includes(product.id)}
                  onChange={() => handleToggleProduct(product.id)}
                />
                <div>
                  <div style={{ fontWeight: 600, color: "#111" }}>{product.name}</div>
                  <small style={{ color: "#777" }}>
                    SKU: {product.code || "—"} · Stock: {product.stock}
                  </small>
                </div>
              </label>
            ))}
            {!filteredProducts.length && (
              <p style={{ gridColumn: "1 / -1", color: "#888", textAlign: "center", padding: 12 }}>
                {productSearch.trim()
                  ? "Sin coincidencias para la búsqueda."
                  : "No hay productos con stock disponible."}
              </p>
            )}
          </div>
        </fieldset>
        <label>
          <input type="checkbox" name="active" checked={form.active} onChange={handleChange} /> Activar promoción
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar promoción"}
        </button>
      </form>

      <table style={{ width: "100%", marginTop: 24, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Nombre</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Categoría</th>
            <th>Productos</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {promos.map((promo) => (
            <tr key={promo.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ textAlign: "left" }}>{promo.name}</td>
              <td style={{ textAlign: "center" }}>{TYPE_BADGE[promo.type] || promo.type}</td>
              <td style={{ textAlign: "right" }}>{formatValue(promo)}</td>
              <td style={{ textAlign: "center" }}>{categoryLookup.get(promo.category) || promo.category || "-"}</td>
              <td style={{ textAlign: "left" }}>
                {promo.products && promo.products.length ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {promo.products.map((pid) => (
                      <li key={pid}>{productLookup.get(pid)?.name || `ID ${pid}`}</li>
                    ))}
                  </ul>
                ) : (
                  <em style={{ color: "#888" }}>—</em>
                )}
              </td>
              <td style={{ textAlign: "center" }}>{promo.active ? "Activa" : "Inactiva"}</td>
              <td style={{ textAlign: "right" }}>
                <button type="button" onClick={() => handleToggleActive(promo, !promo.active)}>
                  {promo.active ? "Desactivar" : "Activar"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => handleDelete(promo)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {!promos.length && !loading && (
            <tr>
              <td colSpan={7} style={{ padding: 8, color: "#666" }}>Sin promociones</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


