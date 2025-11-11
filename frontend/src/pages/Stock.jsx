import { useEffect, useState } from "react";
import api from "../api";
import { useMe } from "../useMe";
import { formatMoney } from "../utils/money";

export default function Stock() {
  const { me } = useMe();
  const isAdmin = me?.role === "OWNER" || me?.role === "ADMIN";

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", stock: "" });
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const { data } = await api.get("/products/");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.response?.status === 401 ? "No autenticado" : "Error cargando stock");
      setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter(r => {
    if (!needle) return true;
    const name = (r.name || "").toLowerCase();
    const code = (r.code || "").toString().toLowerCase();
    return name.includes(needle) || code.includes(needle);
  });

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      price: row.price ?? "",
      stock: row.stock ?? "",
    });
    setMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: "", price: "", stock: "" });
  };

  const saveEdit = async (id) => {
    const priceNum = Number(form.price);
    const stockNum = Number(form.stock);
    if (!form.name.trim()) return setMsg("❌ El nombre no puede estar vacío.");
    if (isNaN(priceNum) || priceNum < 0) return setMsg("❌ El precio debe ser ≥ 0.");
    if (!Number.isInteger(stockNum) || stockNum < 0) return setMsg("❌ El stock debe ser un entero ≥ 0.");

    try {
      await api.patch(`/products/${id}/`, {
        name: form.name.trim(),
        price: String(priceNum),
        stock: stockNum,
      });
      setMsg("✅ Producto actualizado.");
      setEditingId(null);
      await load();
    } catch (e) {
      const s = e?.response?.status;
      if (s === 403) setMsg("❌ No tienes permisos para editar productos.");
      else if (s === 400) setMsg(`❌ ${e?.response?.data?.detail || "Datos inválidos."}`);
      else setMsg("❌ Error al editar el producto.");
    }
  };

  const eliminar = async (id, name) => {
    if (!confirm(`¿Eliminar el producto "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}/`);
      setMsg("✅ Producto eliminado correctamente.");
      await load();
    } catch (e) {
      const s = e?.response?.status;
      if (s === 403) setMsg("❌ No tienes permisos para eliminar productos.");
      else if (s === 404) setMsg("❌ Producto no encontrado.");
      else if (s === 400) setMsg(`❌ ${e?.response?.data?.detail || "No se pudo eliminar."}`);
      else setMsg("❌ Error al eliminar el producto.");
    }
  };

  return (
    <div className="container">
      <h2>Stock</h2>
      <div style={{display:"flex", gap:8, alignItems:"center"}}>
        <input
          placeholder="Filtrar por nombre..."
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <button onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {msg && <p className={msg.startsWith("✅") ? "msg-ok" : "msg-error"}>{msg}</p>}

      <table style={{width:"100%", marginTop:12, borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th style={{textAlign:"left"}}>Producto</th>
            <th style={{textAlign:"right"}}>Precio</th>
            <th style={{textAlign:"center"}}>Stock</th>
            {isAdmin && <th style={{textAlign:"right"}}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => {
            const isEditing = editingId === r.id;
            return (
              <tr key={r.id} style={{borderTop:"1px solid var(--border)"}}>
                <td>
                  {isEditing ? (
                    <>
                      <input name="name" value={form.name} onChange={onChange} />
                      <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                        Código: {r.code || "—"}
                      </div>
                    </>
                  ) : (
                    <>
                      {r.name}
                      <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                        Código: {r.code || "—"}
                      </div>
                    </>
                  )}
                </td>
                <td style={{textAlign:"right"}}>
                  {isEditing ? (
                    <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={onChange} />
                  ) : formatMoney(r.price)}
                </td>
                <td style={{textAlign:"center"}}>
                  {isEditing ? (
                    <input name="stock" type="number" step="1" min="0" value={form.stock} onChange={onChange} />
                  ) : r.stock}
                </td>

                {isAdmin && (
                  <td style={{textAlign:"right"}}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(r.id)}>Guardar</button>{" "}
                        <button className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(r)}>Editar</button>{" "}
                        <button className="btn-secondary" onClick={() => eliminar(r.id, r.name)}>Eliminar</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!filtered.length && !loading && (
            <tr><td colSpan={isAdmin ? 4 : 3} style={{padding:8, color:"#666"}}>Sin resultados</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
