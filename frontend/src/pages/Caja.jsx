import { useEffect, useState } from "react";
import api from "../api";

export default function Caja() {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");


  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const { data } = await api.get("/cash/");
      setSesiones(Array.isArray(data) ? data : []);
    } catch {
      setMsg("No se pudo cargar el historial de caja.");
      setSesiones([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const abierta = sesiones.find(s => s.status === "OPEN"); 

  const abrir = async (e) => {
    e.preventDefault(); setMsg("");
    if (opening === "") { setMsg("Debes ingresar el monto de apertura."); return; }
    try {
      await api.post("/cash/", { opening_amount: String(opening) });
      setOpening("");
      setMsg("Caja abierta correctamente.");
      load();
    } catch {
      setMsg("No se pudo abrir la caja.");
    }
  };

  const cerrar = async (e) => {
    e.preventDefault(); setMsg("");
    if (!abierta) { setMsg("No hay caja abierta."); return; }
    if (closing === "") { setMsg("Debes ingresar el monto de cierre."); return; }
    try {
      await api.post(`/cash/${abierta.id}/close/`, { closing_amount: String(closing) });
      setClosing("");
      setMsg("Caja cerrada correctamente.");
      load();
    } catch {
      setMsg("No se pudo cerrar la caja.");
    }
  };

  return (
    <div style={{maxWidth:900, margin:"20px auto"}}>
      <h2>Caja</h2>
      {msg && <p>{msg}</p>}

      {/* Panel de estado */}
      <div style={{padding:12, border:"1px solid #ddd", borderRadius:8, marginBottom:16}}>
        <strong>Estado actual: </strong>
        {abierta ? (
          <span style={{color:"green"}}>ABIERTA</span>
        ) : (
          <span style={{color:"crimson"}}>CERRADA</span>
        )}
      </div>

      {/* Form abrir/cerrar */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        {/* Abrir */}
        <section style={{border:"1px solid #eee", borderRadius:8, padding:12}}>
          <h3>Abrir caja</h3>
          <form onSubmit={abrir} style={{display:"grid", gap:8}}>
            <label>Monto de apertura
              <input type="number" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)} />
            </label>
            <button disabled={!!abierta}>Abrir</button>
            {abierta && <small style={{color:"#666"}}>Ya hay una caja abierta.</small>}
          </form>
        </section>

        {/* Cerrar */}
        <section style={{border:"1px solid #eee", borderRadius:8, padding:12}}>
          <h3>Cerrar caja</h3>
          <form onSubmit={cerrar} style={{display:"grid", gap:8}}>
            <label>Monto de cierre
              <input type="number" step="0.01" value={closing} onChange={e=>setClosing(e.target.value)} />
            </label>
            <button disabled={!abierta}>Cerrar</button>
            {!abierta && <small style={{color:"#666"}}>No hay caja abierta.</small>}
          </form>
        </section>
      </div>

      {/* Historial */}
      <h3 style={{marginTop:20}}>Historial de sesiones</h3>
      <button onClick={load} disabled={loading}>{loading ? "Actualizando..." : "Actualizar"}</button>
      <table style={{width:"100%", marginTop:12, borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th style={{textAlign:"left"}}>#</th>
            <th>Estado</th>
            <th>Apertura</th>
            <th>Cierre</th>
            <th>Monto apertura</th>
            <th>Monto cierre</th>
            <th>Diferencia</th>
            <th>Abierta por</th>
            <th>Cerrada por</th>
          </tr>
        </thead>
        <tbody>
          {sesiones.map(s => (
            <tr key={s.id} style={{borderTop:"1px solid #eee"}}>
              <td style={{textAlign:"left"}}>{s.id}</td>
              <td style={{textAlign:"center"}}>{s.status}</td>
              <td style={{textAlign:"center"}}>{s.opened_at ? new Date(s.opened_at).toLocaleString() : "-"}</td>
              <td style={{textAlign:"center"}}>{s.closed_at ? new Date(s.closed_at).toLocaleString() : "-"}</td>
              <td style={{textAlign:"right"}}>${s.opening_amount}</td>
              <td style={{textAlign:"right"}}>${s.closing_amount ?? "-"}</td>
              <td style={{textAlign:"right"}}>${s.diff ?? "-"}</td>
              <td style={{textAlign:"center"}}>{s.opened_by || "-"}</td>
              <td style={{textAlign:"center"}}>{s.closed_by || "-"}</td>
            </tr>
          ))}
          {!sesiones.length && !loading && (
            <tr><td colSpan={9} style={{padding:8, color:"#666"}}>Sin sesiones registradas</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
