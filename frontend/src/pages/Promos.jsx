import { useEffect, useMemo, useState } from "react";
import api from "../api";

const TYPE_OPTIONS = [
  { value: "PCT", label: "Porcentaje (%)" },
  { value: "FIXED", label: "Monto fijo ($)" },
];

const TYPE_BADGE = {
  PCT: "%",
  FIXED: "CLP",
};

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const EMPTY_FORM = {
  name: "",
  type: "PCT",
  value: "",
  active: true,
  category: "",
  products: [],
};

export default function Promos() {
  const [promos, setPromos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const categoryLookup = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [promRes, catRes, prodRes] = await Promise.all([
        api.get("/promotions/"),
        api.get("/categories/"),
        api.get("/products/?page_size=1000"),
      ]);

      setPromos(Array.isArray(promRes.data) ? promRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setProducts(
        Array.isArray(prodRes.data?.results)
          ? prodRes.data.results
          : Array.isArray(prodRes.data)
          ? prodRes.data
          : [],
      );
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

  const toggleProduct = (productId) => {
    setForm((prev) => {
      const hasProduct = prev.products.includes(productId);
      return {
        ...prev,
        products: hasProduct
          ? prev.products.filter((id) => id !== productId)
          : [...prev.products, productId],
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
      setForm(EMPTY_FORM);
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
      setMessage({ type: "error", text: "No se pudo cambiar el estado de la promoción." });
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
        <div style={{ display: "flex", gap: 8 }}>
          <label>Tipo
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="PCT">Porcentaje (%)</option>
              <option value="FIXED">Monto fijo ($)</option>
            </select>
          </label>
          <label>Valor
            <input name="value" type="number" step="1" value={form.value} onChange={handleChange} />
          </label>
        </div>
        <label>Categoría
          <select name="category" value={form.category} onChange={handleChange}>
            <option value="">(Ninguna)</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          <input type="checkbox" name="active" checked={form.active} onChange={handleChange} /> Activa
        </label>
        <div>
          <div style={{ marginBottom: 6 }}>Productos:</div>
          <div style={{ maxHeight: 120, overflow: "auto", border: "1px solid #eee", padding: 8, borderRadius: 6 }}>
            {products.map(p => (
              <label key={p.id} style={{ display: "inline-flex", gap: 6, marginRight: 12 }}>
                <input
                  type="checkbox"
                  checked={form.products.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                />
                <span>{p.name}</span>
              </label>
            ))}
            {!products.length && <em>No hay productos cargados.</em>}
          </div>
        </div>
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
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {promos.map(promo => (
            <tr key={promo.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ textAlign: "left" }}>{promo.name}</td>
              <td style={{ textAlign: "center" }}>{TYPE_BADGE[promo.type] || promo.type}</td>
              <td style={{ textAlign: "right" }}>{formatValue(promo)}</td>
              <td style={{ textAlign: "center" }}>{categoryLookup.get(promo.category) || promo.category || "-"}</td>
              <td style={{ textAlign: "center" }}>{promo.active ? "Activa" : "Inactiva"}</td>
              <td style={{ textAlign: "right" }}>
                <button onClick={() => handleToggleActive(promo, !promo.active)}>
                  {promo.active ? "Desactivar" : "Activar"}
                </button>
                <button className="btn-secondary" onClick={() => handleDelete(promo)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {!promos.length && !loading && (
            <tr>
              <td colSpan={6} style={{ padding: 8, color: "#666" }}>Sin promociones</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
