import { useEffect, useRef, useState } from "react";
import api from "../api";
import { useMe } from "../useMe";

export default function Caja() {
  const { me } = useMe();
  const role = (me?.role || "").toString().toUpperCase();
  const isAdmin = ["OWNER", "ADMIN"].includes(role) || me?.is_staff || me?.is_superuser;
  const isSeller = role === "SELLER" && !isAdmin;
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState(null);


  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [pinModal, setPinModal] = useState({ open: false, mode: null, value: "" });
  const toastTimeout = useRef(null);

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

  const doAbrir = async () => {
    if (opening === "") { setMsg("Debes ingresar el monto de apertura."); return; }
    if (!/^\d+$/.test(String(opening))) { setMsg("El monto de apertura debe ser un entero ≥ 0."); return; }
    try {
      await api.post("/cash/", { opening_amount: String(opening) });
      setOpening("");
      setMsg("Caja abierta correctamente.");
      setToast({ type: "success", text: "Caja abierta correctamente." });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      load();
    } catch {
      setMsg("No se pudo abrir la caja.");
      setToast({ type: "error", text: "No se pudo abrir la caja." });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 3500);
    }
  };

  const abrir = async (e) => {
    e.preventDefault(); setMsg("");
    if (isSeller) {
      setPinModal({ open: true, mode: "open", value: "" });
      return;
    }
    await doAbrir();
  };

  const doCerrar = async () => {
    if (!abierta) { setMsg("No hay caja abierta."); return; }
    if (closing === "") { setMsg("Debes ingresar el monto de cierre."); return; }
    try {
      await api.post(`/cash/${abierta.id}/close/`, { closing_amount: String(closing) });
      setClosing("");
      setMsg("Caja cerrada correctamente.");
      setToast({ type: "success", text: "Caja cerrada correctamente." });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      load();
    } catch {
      setMsg("No se pudo cerrar la caja.");
      setToast({ type: "error", text: "No se pudo cerrar la caja." });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 3500);
    }
  };

  const cerrar = async (e) => {
    e.preventDefault(); setMsg("");
    if (isSeller) {
      setPinModal({ open: true, mode: "close", value: "" });
      return;
    }
    await doCerrar();
  };

  const formatCLP = (value) =>
    Number(value || 0).toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const onConfirmPin = async () => {
    if (pinModal.value !== "1234") {
      setMsg("Contraseña incorrecta.");
      setToast({ type: "error", text: "Contraseña incorrecta." });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      return;
    }
    setPinModal({ open: false, mode: null, value: "" });
    if (pinModal.mode === "open") {
      await doAbrir();
    } else if (pinModal.mode === "close") {
      await doCerrar();
    }
  };

  return (
    <>
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
                <input type="number" step="1" min="0" value={opening} onChange={e=>setOpening(e.target.value)} />
              </label>
              <button disabled={!!abierta}>Abrir</button>
              {abierta && <small style={{color:"#666"}}>Ya hay una caja abierta.</small>}
              {isSeller && <small style={{color:"#888"}}>Se solicitará contraseña al confirmar.</small>}
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
              {isSeller && <small style={{color:"#888"}}>Se solicitará contraseña al confirmar.</small>}
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
                <td style={{textAlign:"right"}}>{formatCLP(s.opening_amount)}</td>
                <td style={{textAlign:"right"}}>{s.closing_amount != null ? formatCLP(s.closing_amount) : "-"}</td>
                <td style={{textAlign:"right"}}>{s.diff != null ? formatCLP(s.diff) : "-"}</td>
                <td style={{textAlign:"center"}}>{s.opened_by_name || s.opened_by || "-"}</td>
                <td style={{textAlign:"center"}}>{s.closed_by_name || s.closed_by || "-"}</td>
              </tr>
            ))}
            {!sesiones.length && !loading && (
              <tr><td colSpan={9} style={{padding:8, color:"#666"}}>Sin sesiones registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pinModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(360px, 90vw)",
              background: "#121212",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
              padding: 18,
            }}
          >
            <h3 style={{ margin: "0 0 8px 0" }}>
              {pinModal.mode === "open" ? "Abrir caja" : "Cerrar caja"}
            </h3>
            <p style={{ margin: "0 0 12px 0", color: "#bbb" }}>
              Ingresa tu PIN para continuar.
            </p>
            <input
              type="password"
              value={pinModal.value}
              onChange={(e) => setPinModal({ ...pinModal, value: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #444", marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setPinModal({ open: false, mode: null, value: "" })}>
                Cancelar
              </button>
              <button onClick={onConfirmPin}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {toast?.text && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 60,
            minWidth: 260,
            maxWidth: 360,
            padding: "12px 14px",
            borderRadius: 10,
            color: "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.1)",
            background:
              toast.type === "success"
                ? "linear-gradient(135deg, rgba(40,167,69,0.95), rgba(32,201,151,0.95))"
                : "linear-gradient(135deg, rgba(220,53,69,0.95), rgba(255,99,132,0.95))",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {toast.type === "success" ? "Operación exitosa" : "Error"}
          </div>
          <div>{toast.text}</div>
        </div>
      )}
    </>
  );
}
