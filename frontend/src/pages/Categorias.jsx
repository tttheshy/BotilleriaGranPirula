import { useEffect, useState } from "react";
import api from "../api";

export default function Categorias() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [name, setName] = useState("");

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const { data } = await api.get("/categories/");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.response?.status === 403 ? "Sin permisos para ver categorías." : "Error cargando categorías.");
      setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const crear = async (e) => {
    e.preventDefault(); setMsg("");
    if (!name.trim()) return;
    try {
      await api.post("/categories/", { name: name.trim() });
      setName("");
      setMsg("✅ Categoría creada.");
      load();
    } catch (e) {
      setMsg(e?.response?.status === 403 ? "Sin permisos para crear." : "No se pudo crear.");
    }
  };

  const guardar = async (id, newName) => {
    try {
      await api.patch(`/categories/${id}/`, { name: newName.trim() });
      setMsg("✅ Categoría actualizada.");
      load();
    } catch (e) {
      setMsg(e?.response?.status === 403 ? "Sin permisos para editar." : "No se pudo editar.");
    }
  };

  const eliminar = async (id) => {
  if (!confirm("¿Eliminar esta categoría?")) return;
  try {
    await api.delete(`/categories/${id}/`);
    setMsg("✅ Categoría eliminada correctamente.");
    load(); 
  } catch (e) {
    const status = e?.response?.status;
    const detail = e?.response?.data?.detail || e?.message;
    if (status === 400) {
      setMsg(`❌ ${detail || "Esta categoría no puede ser borrada porque tiene productos asociados."}`);
    } else if (status === 403) {
      setMsg("❌ No tienes permisos para eliminar categorías.");
    } else {
      setMsg("❌ Ocurrió un error al eliminar la categoría.");
    }
  }
};


  const filtered = rows.filter(c => (c.name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="container">
      <h2>Categorías</h2>
      {msg && <p>{msg}</p>}

      <section className="card" style={{marginBottom:16}}>
        <form onSubmit={crear} style={{display:"grid", gridTemplateColumns:"1fr auto", gap:10}}>
          <input placeholder="Nueva categoría..." value={name} onChange={e=>setName(e.target.value)} />
          <button>Agregar</button>
        </form>
      </section>

      <section className="card">
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <input placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
          <button className="btn-secondary" onClick={load} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button>
        </div>

        <table style={{marginTop:12}}>
          <thead>
            <tr><th>Nombre</th><th style={{textAlign:"right"}}>Acciones</th></tr>
          </thead>
          <tbody>
            {filtered.map(c => <Row key={c.id} c={c} onSave={guardar} onDelete={eliminar} />)}
            {!filtered.length && !loading && (
              <tr><td colSpan={2} style={{padding:8, color:"#666"}}>Sin categorías</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Row({ c, onSave, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(c.name || "");
  return (
    <tr>
      <td>
        {edit ? (
          <input value={val} onChange={e=>setVal(e.target.value)} />
        ) : (
          c.name
        )}
      </td>
      <td style={{textAlign:"right"}}>
        {edit ? (
          <>
            <button onClick={()=>{ onSave(c.id, val); setEdit(false); }}>Guardar</button>{" "}
            <button className="btn-secondary" onClick={()=>{ setVal(c.name||""); setEdit(false); }}>Cancelar</button>
          </>
        ) : (
          <>
            <button onClick={()=>setEdit(true)}>Editar</button>{" "}
            <button className="btn-secondary" onClick={()=>onDelete(c.id)}>Eliminar</button>
          </>
        )}
      </td>
    </tr>
  );
}
