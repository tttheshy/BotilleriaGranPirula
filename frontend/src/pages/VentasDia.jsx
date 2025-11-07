import { useEffect, useMemo, useState } from "react";
import api from "../api";

function ymd(s) {
  const d = new Date(s);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function VentasDia() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [soloOK, setSoloOK] = useState(true);


  const [itemsBySale, setItemsBySale] = useState({});
  const [open, setOpen] = useState({}); 

  const hoy = new Date().toISOString().slice(0, 10);

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const { data } = await api.get("/sales/");
      setVentas(Array.isArray(data) ? data : []);
    } catch {
      setMsg("No se pudieron cargar las ventas.");
      setVentas([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const ventasHoy = useMemo(
    () => ventas.filter(v => ymd(v.created_at) === hoy && (soloOK ? v.status === "OK" : true)),
    [ventas, hoy, soloOK]
  );

  const totalHoy = useMemo(
    () => ventasHoy.reduce((s,v)=> s + Number(v.total || 0), 0),
    [ventasHoy]
  );

 
  const toggleOpen = async (id) => {
    const next = { ...open, [id]: !open[id] };
    setOpen(next);
    if (next[id] && !itemsBySale[id]) {
      try {
        const { data } = await api.get(`/sales/${id}/`);
        setItemsBySale(prev => ({ ...prev, [id]: data.items || [] }));
      } catch {
        setItemsBySale(prev => ({ ...prev, [id]: [] }));
      }
    }
  };

  const anular = async (id) => {
    const reason = prompt("Motivo de anulación:");
    if (reason === null) return;
    try {
      await api.post(`/sales/${id}/void/`, { reason });
      setMsg("Venta anulada.");
      setItemsBySale(prev => ({ ...prev, [id]: undefined }));
      await load();
    } catch {
      setMsg("No se pudo anular (revisa permisos).");
    }
  };

  return (
    <div className="container">
      <h2>Ventas del día</h2>

      <div style={{display:"flex", gap:16, alignItems:"center"}}>
        <label><input type="checkbox" checked={soloOK} onChange={e=>setSoloOK(e.target.checked)} /> Mostrar solo ventas OK</label>
        <button onClick={load} disabled={loading}>{loading ? "Actualizando..." : "Actualizar"}</button>
      </div>

      <h3 style={{marginTop:12}}>Total del día: ${totalHoy}</h3>
      {msg && <p>{msg}</p>}

      <table style={{width:"100%", marginTop:12, borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th style={{textAlign:"left"}}></th>
            <th style={{textAlign:"left"}}>#</th>
            <th>Hora</th>
            <th>Vendedor</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ventasHoy.map(v => {
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
            <tr><td colSpan={8} style={{padding:8, color:"#666"}}>Sin ventas hoy</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ venta, abierto, items, onToggle, onAnular }) {
  return (
    <>
      <tr style={{borderTop:"1px solid #eee"}}>
        <td style={{textAlign:"left", width:36}}>
          <button className="btn-secondary" onClick={onToggle}>{abierto ? "−" : "+"}</button>
        </td>
        <td style={{textAlign:"left"}}>{venta.id}</td>
        <td style={{textAlign:"center"}}>{new Date(venta.created_at).toLocaleTimeString()}</td>
        <td style={{textAlign:"center"}}>{venta.seller_name || "-"}</td>
        <td style={{textAlign:"center"}}>{venta.payment_method}</td>
        <td style={{textAlign:"center"}}>{venta.status}</td>
        <td style={{textAlign:"right"}}>${venta.total}</td>
        <td style={{textAlign:"right"}}>
          {venta.status === "OK" ? (
            <button onClick={onAnular}>Anular</button>
          ) : (
            <em>Anulada</em>
          )}
        </td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={8} style={{background:"rgba(255,255,255,.03)"}}>
            <ItemsTable items={items} />
          </td>
        </tr>
      )}
    </>
  );
}

function ItemsTable({ items }) {
  if (items === undefined) {
    return <div style={{padding:8}}>Cargando productos…</div>;
  }
  if (!items || !items.length) {
    return <div style={{padding:8, color:"#888"}}>Sin ítems</div>;
  }
  const totalDesc = items.reduce((s, it) => s + Number(it.discount || 0) * Number(it.qty || 0), 0);
  const totalNeto = items.reduce((s, it) => s + (Number(it.unit_price) - Number(it.discount || 0)) * Number(it.qty || 0), 0);

  return (
    <div style={{padding:8}}>
      <table style={{width:"100%", borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th style={{textAlign:"left"}}>Producto</th>
            <th style={{textAlign:"center"}}>Cant.</th>
            <th style={{textAlign:"right"}}>Precio</th>
            <th style={{textAlign:"right"}}>Desc/u</th>
            <th style={{textAlign:"right"}}>Total línea</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => {
            const desc = Number(it.discount || 0);
            const up = Number(it.unit_price);
            const line = (up - desc) * Number(it.qty || 0);
            return (
              <tr key={it.id} style={{borderTop:"1px solid var(--border)"}}>
                <td>{it.product_name || it.product}</td>
                <td style={{textAlign:"center"}}>{it.qty}</td>
                <td style={{textAlign:"right"}}>${up}</td>
                <td style={{textAlign:"right"}}>${desc}</td>
                <td style={{textAlign:"right"}}>${line}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={3}></td>
            <td style={{textAlign:"right"}}><strong>Descuento</strong></td>
            <td style={{textAlign:"right"}}><strong>${totalDesc}</strong></td>
          </tr>
          <tr>
            <td colSpan={3}></td>
            <td style={{textAlign:"right"}}><strong>Total</strong></td>
            <td style={{textAlign:"right"}}><strong>${totalNeto}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
