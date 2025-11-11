import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import ProductRow from "../components/ProductRow.jsx";

export default function Pos() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState([]);
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [scanPending, setScanPending] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const searchRef = useRef(null);
  const msgTimeout = useRef(null);

  const add = useCallback((p) => {
    setCart(prev => {
      const i = prev.find(x => x.id === p.id);
      return i
        ? prev.map(x => x.id === p.id ? {...x, qty: x.qty + 1} : x)
        : [...prev, { id: p.id, code: p.code, name: p.name, price: Number(p.price), qty: 1 }];
    });
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
    return () => {
      if (msgTimeout.current) {
        clearTimeout(msgTimeout.current);
      }
    };
  }, []);

  const showMessage = useCallback((text, delay = 2500) => {
    if (msgTimeout.current) {
      clearTimeout(msgTimeout.current);
    }
    setMsg(text);
    if (text && delay > 0) {
      msgTimeout.current = setTimeout(() => setMsg(""), delay);
    }
  }, []);

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

  useEffect(() => {
    if (!scanPending) return;
    let active = true;
    const run = async () => {
      let addedToCart = false;
      try {
        const { data } = await api.get(`/products/?search=${encodeURIComponent(scanPending)}`);
        const list = Array.isArray(data) ? data : [];
        const match = list.find((item) => (item.code || "").toString().toLowerCase() === scanPending.toLowerCase());
        if (!active) return;
        if (match) {
          add(match);
          showMessage(`✅ ${match.name} agregado al carrito.`);
          addedToCart = true;
        } else {
          setFound(list);
          showMessage(`⚠️ No encontramos productos con el código ${scanPending}.`, 3500);
        }
      } catch {
        if (active) {
          showMessage(`⚠️ No se pudo buscar el código ${scanPending}.`, 3500);
        }
      } finally {
        if (active) {
          if (addedToCart) {
            setQ("");
            setFound([]);
          }
          setScanPending(null);
          searchRef.current?.focus();
        }
      }
    };
    run();
  }, [add, scanPending, showMessage]);

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

  const onSubmitSearch = (event) => {
    event.preventDefault();
    const code = q.trim();
    if (code) {
      setScanPending(code);
    }
  };

  const checkout = async () => {
    if (!cart.length) return;
    showMessage("");
    try {
      const items = cart.map(x => ({
        product: x.id, qty: x.qty, unit_price: String(x.price), discount: "0"
      }));
      await api.post("/sales/", { payment_method: paymentMethod, items });
      setCart([]); setQ(""); setFound([]); setPreview(null);
      showMessage("✅ Venta realizada con éxito.");
    } catch {
      showMessage("❌ No se pudo realizar la venta. Revisa tu sesión o el backend.", 4000);
    }
  };

  const formatMoney = (value) => {
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
  };

  return (
    <div style={{maxWidth:980, margin:"20px auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
      <section>
        <h2>Punto de Venta — GranPirula</h2>
        <form onSubmit={onSubmitSearch}>
          <input
            ref={searchRef}
            placeholder="Buscar por código o nombre (2+ letras)…"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            style={{width:"100%", padding:8}}
          />
        </form>
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
                    {formatMoney(x.price)} − <em>{formatMoney(discUnit)}</em> × {x.qty} ={" "}
                    <strong>{formatMoney(priceShown * x.qty)}</strong>
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
          <div>Subtotal: {formatMoney(total)}</div>
          <div>
            Descuento: {loadingPreview ? "…" : formatMoney(preview ? preview.total_descuento : 0)}
          </div>
          <h3>
            Total a cobrar: {loadingPreview ? "…" : formatMoney(preview ? preview.total_neto : total)}
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
