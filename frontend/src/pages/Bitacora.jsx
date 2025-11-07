import { useEffect, useMemo, useState } from "react";
import api from "../api";

const ACTION_LABEL = {
  SALE_CHECKOUT: "Venta realizada",
  SALE_VOID: "Venta anulada",
  PRICE_CHANGE: "Cambio de precio",
};

function fmtTs(r) {
  const s = r?.created_at || r?.ts;
  return s ? new Date(s).toLocaleString() : "-";
}

function shortJson(obj) {
  try {
    const txt = JSON.stringify(obj);
    return txt.length > 120 ? txt.slice(0, 120) + "…" : txt;
  } catch {
    return String(obj);
  }
}

export default function Bitacora() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");


  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [model, setModel] = useState("");

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const { data } = await api.get("/audit/");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setMsg("No se pudo cargar la bitácora.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const text = q.toLowerCase();
    return rows.filter(r => {
      const okAction = action ? r.action === action : true;
      const okModel  = model ? (r.model || "").toLowerCase() === model.toLowerCase() : true;
      const actorText = (r.user_name || r.actor?.username || r.actor || "").toString().toLowerCase();
      const hayTexto =
        !text ||
        actorText.includes(text) ||
        (r.action || "").toLowerCase().includes(text) ||
        (r.model || "").toLowerCase().includes(text) ||
        (r.obj_id || "").toString().toLowerCase().includes(text);
      return okAction && okModel && hayTexto;
    });
  }, [rows, q, action, model]);

  return (
    <div style={{maxWidth:1100, margin:"20px auto"}}>
      <h2>Bitácora</h2>
      {msg && <p>{msg}</p>}

      {/* Filtros */}
      <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
        <input
          placeholder="Buscar por usuario, acción, modelo, id…"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{minWidth:260}}
        />
        <label>Acción:
          <select value={action} onChange={e=>setAction(e.target.value)} style={{marginLeft:6}}>
            <option value="">(todas)</option>
            <option value="SALE_CHECKOUT">Venta realizada</option>
            <option value="SALE_VOID">Venta anulada</option>
            <option value="PRICE_CHANGE">Cambio de precio</option>
          </select>
        </label>
        <label>Modelo:
          <input
            placeholder="Sale, Product, ..."
            value={model}
            onChange={e=>setModel(e.target.value)}
            style={{marginLeft:6}}
          />
        </label>
        <button onClick={load} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button>
      </div>

      {/* Tabla */}
      <table style={{width:"100%", marginTop:12, borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th style={{textAlign:"left"}}>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Modelo</th>
            <th>Obj ID</th>
            <th>Cambios</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i} style={{borderTop:"1px solid #eee"}}>
              <td style={{textAlign:"left"}}>{fmtTs(r)}</td>
              <td style={{textAlign:"center"}}>
                {r.user_name || r.actor?.username || r.actor || "-"}
              </td>
              <td style={{textAlign:"center"}}>
                {ACTION_LABEL[r.action] || r.action}
              </td>
              <td style={{textAlign:"center"}}>{r.model}</td>
              <td style={{textAlign:"center"}}>{r.obj_id}</td>
              <td style={{textAlign:"left"}}>
                <code style={{fontSize:12}}>{shortJson(r.changes)}</code>
              </td>
            </tr>
          ))}
          {!filtered.length && !loading && (
            <tr><td colSpan={6} style={{padding:8, color:"#666"}}>Sin eventos</td></tr>
          )}
        </tbody>
      </table>

      <p style={{marginTop:8, fontSize:12, color:"#666"}}>
        Nota: se registran eventos como <b>Venta realizada</b>, <b>Venta anulada</b> y <b>Cambio de precio</b>.
      </p>
    </div>
  );
}
