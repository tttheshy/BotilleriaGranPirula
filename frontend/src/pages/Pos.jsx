import { useEffect, useMemo, useState } from "react";
import api from "../api";
import ProductRow from "../components/ProductRow.jsx";

export default function Pos() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState([]);
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");


  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);


  useEffect(() => {
    let active = true;
    const run = async () => {
      if (q.trim().length < 2) { setFound([]); return; }
      setLoading(true);
      try {
        const { data } = await api.get(`/products/?search=${encodeURIComponent(q)}`);
        if (active) setFound(Array.isArray(data) ? data : []);
      } catch {
        if (active) setFound([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => { active = false; clearTimeout(t); };
  }, [q]);


  const add = (p) => {
    setCart(prev => {
      const i = prev.find(x => x.id === p.id);
      return i ? prev.map(x => x.id === p.id ? {...x, qty: x.qty + 1} : x)
               : [...prev, { id: p.id, code: p.code, name: p.name, price: Number(p.price), qty: 1 }];
    });
  };
  const inc = (id) => setCart(prev => prev.map(x => x.id===id ? {...x, qty:x.qty+1} : x));
  const dec = (id) => setCart(prev => prev.map(x => x.id===id ? {...x, qty: Math.max(1,x.qty-1)} : x));
  const del = (id) => setCart(prev => prev.filter(x => x.id !== id));
  const clear = () => setCart([]);

  const total = useMemo(() => cart.reduce((s,x)=> s + x.price * x.qty, 0), [cart]);


  useEffect(() => {
    const run = async () => {
      if (!cart.length) { setPreview(null); return; }
      setLoadingPreview(true);
      try {
        const items = cart.map(x => ({
          product: x.id,
          qty: x.qty,
          unit_price: String(x.price),
        }));
        const { data } = await api.post("/sales/preview/", { items });
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };
    run();
  }, [cart]);

  const checkout = async () => {
    if (!cart.length) return;
    setMsg("");
    try {
      const items = cart.map(x => ({
        product: x.id, qty: x.qty, unit_price: String(x.price), discount: "0"
      }));
      await api.post("/sales/", { payment_method: paymentMethod, items });
      setCart([]); setQ(""); setFound([]); setPreview(null);
      setMsg("✅ Venta realizada con éxito.");
      setTimeout(()=>setMsg(""), 2000);
    } catch {
      setMsg("❌ No se pudo realizar la venta. Revisa tu sesión o el backend.");
    }
  };


  return (
    <div style={{maxWidth:980, margin:"20px auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
      <section>
        <h2>Punto de Venta — La gran Pirula</h2>
        <input
          placeholder="Buscar por código o nombre (2+ letras)…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          style={{width:"100%", padding:8}}
        />
        {loading && <p>Buscando…</p>}
        <ul style={{listStyle:"none", padding:0, marginTop:12, maxHeight:360, overflow:"auto"}}>
          {found.map(p => <ProductRow key={p.id} p={p} onAdd={add} />)}
          {!loading && found.length===0 && q.trim().length>=2 && <li>No hay resultados</li>}
        </ul>
      </section>

      <section>
        <h2>Carrito</h2>
        <ul style={{listStyle:"none", padding:0}}>
          {cart.map(x => {
            const prevLine = preview?.items?.find(i => i.product === x.id);
            const discUnit = prevLine ? Number(prevLine.discount_unit) : 0;
            const priceShown = x.price - discUnit;
            return (
              <li key={x.id} style={{display:"grid", gridTemplateColumns:"1fr auto", padding:"6px 0", borderBottom:"1px dashed #eee"}}>
                <div>
                  <div>
                    <strong>{x.name}</strong> <small>({x.code})</small>
                  </div>
                  <div>
                    ${x.price} − <em>${discUnit}</em> × {x.qty} ={" "}
                    <strong>${priceShown * x.qty}</strong>
                    {discUnit > 0 && <span style={{marginLeft:6, color:"#0a7"}}>(promo)</span>}
                  </div>
                </div>
                <div style={{display:"flex", gap:6, alignItems:"center"}}>
                  <button onClick={()=>dec(x.id)}>-</button>
                  <button onClick={()=>inc(x.id)}>+</button>
                  <button onClick={()=>del(x.id)}>Quitar</button>
                </div>
              </li>
            );
          })}
          {!cart.length && <li>Sin ítems</li>}
        </ul>

        {/* Totales */}
        <div style={{marginTop:8}}>
          <div>Subtotal: ${total}</div>
          <div>
            Descuento: $
            {loadingPreview ? "…" : (preview ? preview.total_descuento : 0)}
          </div>
          <h3>
            Total a cobrar: $
            {loadingPreview ? "…" : (preview ? preview.total_neto : total)}
          </h3>
        </div>

        {/* Método de pago */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8}}>
          <label style={{display:"flex", gap:8, alignItems:"center"}}>
            Método de pago:
            <select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}>
              <option value="CASH">Efectivo</option>
              <option value="DEBIT">Débito</option>
              <option value="CREDIT">Crédito</option>
            </select>
          </label>
          <div style={{display:"flex", gap:8}}>
            <button disabled={!cart.length || loadingPreview} onClick={checkout}>Cobrar</button>
            <button disabled={!cart.length} onClick={clear}>Limpiar carrito</button>
          </div>
        </div>

        {msg && <p style={{marginTop:8}}>{msg}</p>}
      </section>
    </div>
  );
}
