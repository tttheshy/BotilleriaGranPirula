import { useEffect, useMemo, useState } from "react";
import api from "../api";

const TYPE_LABEL = { PCT: "%", FIXED: "$" };

export default function Promos() {
  const [promos, setPromos] = useState([]);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");


  const [form, setForm] = useState({
    name: "",
    type: "PCT",    
    value: "",
    active: true,
    category: "",   
    products: [],   
  });

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const [pRes, cRes, prdRes] = await Promise.all([
        api.get("/promotions/"),
        api.get("/categories/"),
        api.get("/products/?page_size=1000"), 
      ]);
      setPromos(Array.isArray(pRes.data) ? pRes.data : []);
      setCats(Array.isArray(cRes.data) ? cRes.data : []);
      setProducts(Array.isArray(prdRes.data) ? prdRes.data : []);
    } catch {
      setMsg("No se pudo cargar promociones/catálogos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleProduct = (id) => {
    setForm(f => {
      const has = f.products.includes(id);
      return { ...f, products: has ? f.products.filter(x => x !== id) : [...f.products, id] };
    });
  };

  const crear = async (e) => {
    e.preventDefault(); setMsg("");
    if (!form.name || !form.value) { setMsg("Nombre y valor son obligatorios."); return; }
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        value: String(form.value),
        active: !!form.active,
        category: form.category || null,
        products: form.products
      };
      await api.post("/promotions/", payload);
      setMsg("✅ Promoción creada.");
      setForm({ name:"", type:"PCT", value:"", active:true, category:"", products:[] });
      load();
    } catch (err) {
      if (err?.response?.status === 403) setMsg("❌ Sin permisos (solo Admin/Owner).");
      else setMsg("❌ Error al crear promoción.");
    }
  };

  const activar = async (p, active) => {
    try {
      await api.patch(`/promotions/${p.id}/`, { active });
      load();
    } catch { setMsg("No se pudo cambiar el estado de la promo."); }
  };

  return (
    <div style={{maxWidth:1000, margin:"20px auto"}}>
      <h2>Promociones</h2>
      {msg && <p>{msg}</p>}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        {/* Formulario nueva promo */}
        <section style={{border:"1px solid #eee", borderRadius:8, padding:12}}>
          <h3>Crear promoción</h3>
          <form onSubmit={crear} style={{display:"grid", gap:8}}>
            <label>Nombre
              <input name="name" value={form.name} onChange={onChange} placeholder="p.ej. 10% Bebidas" />
            </label>

            <div style={{display:"flex", gap:8}}>
              <label>Tipo
                <select name="type" value={form.type} onChange={onChange}>
                  <option value="PCT">Porcentaje (%)</option>
                  <option value="FIXED">Monto fijo ($)</option>
                </select>
              </label>
              <label>Valor
                <input name="value" type="number" step="0.01" value={form.value} onChange={onChange} />
              </label>
            </div>

            <label>Aplica a categoría (opcional)
              <select name="category" value={form.category} onChange={onChange}>
                <option value="">(Ninguna)</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <div>
              <div style={{marginBottom:6}}>O a productos específicos (opcional):</div>
              <div style={{maxHeight:120, overflow:"auto", border:"1px solid #eee", padding:8, borderRadius:6}}>
                {products.map(p => (
                  <label key={p.id} style={{display:"inline-flex", gap:6, marginRight:12}}>
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

            <label>
              <input type="checkbox" name="active" checked={form.active} onChange={onChange} /> Activa
            </label>

            <button>Guardar promoción</button>
          </form>
        </section>

        {/* Listado */}
        <section style={{border:"1px solid #eee", borderRadius:8, padding:12}}>
          <h3>Listado</h3>
          <button onClick={load} disabled={loading}>{loading ? "Actualizando..." : "Actualizar"}</button>
          <table style={{width:"100%", marginTop:12, borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{textAlign:"left"}}>Nombre</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id} style={{borderTop:"1px solid #eee"}}>
                  <td style={{textAlign:"left"}}>{p.name}</td>
                  <td style={{textAlign:"center"}}>{TYPE_LABEL[p.type] || p.type}</td>
                  <td style={{textAlign:"right"}}>{p.type === "PCT" ? `${p.value}%` : `$${p.value}`}</td>
                  <td style={{textAlign:"center"}}>{p.category || "-"}</td>
                  <td style={{textAlign:"center"}}>{p.active ? "Activa" : "Inactiva"}</td>
                  <td style={{textAlign:"right"}}>
                    {p.active
                      ? <button onClick={()=>activar(p, false)}>Desactivar</button>
                      : <button onClick={()=>activar(p, true)}>Activar</button>}
                  </td>
                </tr>
              ))}
              {!promos.length && !loading && (
                <tr><td colSpan={6} style={{padding:8, color:"#666"}}>Sin promociones</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
