import { useEffect, useState } from "react";
import api from "../api";

export default function ProductoNuevo() {
  const [form, setForm] = useState({
    code: "", name: "", category: "", price: "", stock: 0, active: true, top_seller: false
  });
  const [cats, setCats] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await api.get("/categories/");
        setCats(data || []);
      } catch { setCats([]); }
    };
    run();
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const crearCategoriaRapida = async () => {
    const nombre = prompt("Nombre de la categoría:");
    if (!nombre) return;
    try {
      const { data } = await api.post("/categories/", { name: nombre });
      setCats(c => [...c, data]);
      setForm(f => ({ ...f, category: data.id }));
    } catch { alert("No se pudo crear la categoría (¿permisos?)."); }
  };

  const guardar = async (e) => {
    e.preventDefault(); setMsg("");

    if (!form.code || !form.name || !form.price) {
      setMsg("Código, nombre y precio son obligatorios."); return;
    }
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category || null,
        price: String(form.price),
        stock: Number(form.stock || 0),
        active: !!form.active,
        top_seller: !!form.top_seller
      };
      await api.post("/products/", payload);
      setMsg("✅ Producto creado correctamente.");
      setForm({ code: "", name: "", category: "", price: "", stock: 0, active: true, top_seller: false });
    } catch (err) {
      if (err?.response?.status === 403) setMsg("❌ Sin permisos: solo Dueño/Admin pueden crear productos.");
      else if (err?.response?.status === 400) setMsg("❌ Datos inválidos o código duplicado.");
      else setMsg("❌ Error al crear producto. Revisa el backend.");
    }
  };

  return (
    <div style={{maxWidth:560, margin:"20px auto"}}>
      <h2>Agregar producto</h2>
      <form onSubmit={guardar} style={{display:"grid",gap:10}}>
        <label>Código
          <input name="code" value={form.code} onChange={onChange} placeholder="p.ej. COCA350" />
        </label>
        <label>Nombre
          <input name="name" value={form.name} onChange={onChange} placeholder="p.ej. Coca-Cola 350ml" />
        </label>
        <label>Categoría
          <div style={{display:"flex",gap:8}}>
            <select name="category" value={form.category} onChange={onChange} style={{flex:1}}>
              <option value="">(Sin categoría)</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" onClick={crearCategoriaRapida}>Nueva</button>
          </div>
        </label>
        <label>Precio
          <input name="price" type="number" step="0.01" value={form.price} onChange={onChange} />
        </label>
        <label>Stock inicial
          <input name="stock" type="number" value={form.stock} onChange={onChange} />
        </label>

        <div style={{display:"flex",gap:20}}>
          <label><input type="checkbox" name="active" checked={form.active} onChange={onChange} /> Activo</label>
          <label><input type="checkbox" name="top_seller" checked={form.top_seller} onChange={onChange} /> Top seller</label>
        </div>

        <button>Guardar</button>
        {msg && <p>{msg}</p>}
        <p style={{fontSize:12,color:"#666"}}>
          Nota: si ves “Sin permisos”, inicia sesión con usuario Dueño/Admin. El backend restringe creación/edición a esos roles.
        </p>
      </form>
    </div>
  );
}
