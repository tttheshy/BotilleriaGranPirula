import { useEffect, useState } from "react";
import api from "../api";
import { useMe } from "../useMe";

const ROLES = [
  { value: "OWNER", label: "Dueño" },
  { value: "ADMIN", label: "Administrador" },
  { value: "SELLER", label: "Vendedor" },
];

export default function AdminPanel() {
  const { me } = useMe();
  const isAdmin = me?.role === "OWNER" || me?.role === "ADMIN";

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Form Crear usuario ---
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    role: "SELLER",
    password: "",
    is_active: true,
  });

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const { data } = await api.get("/users/");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.response?.status === 403 ? "Sin permisos para administrar usuarios." : "No se pudieron cargar usuarios.");
      setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setRole = async (id, role) => {
    try {
      await api.patch(`/users/${id}/`, { role });
      setMsg("✅ Rol actualizado."); load();
    } catch (e) {
      setMsg(e?.response?.status === 403 ? "Sin permisos para cambiar roles." : "No se pudo actualizar el rol.");
    }
  };

  const setActive = async (id, is_active) => {
    try {
      await api.patch(`/users/${id}/`, { is_active });
      setMsg("✅ Estado actualizado."); load();
    } catch {
      setMsg("No se pudo actualizar el estado.");
    }
  };

  const filtered = rows.filter(u =>
    (u.username || "").toLowerCase().includes(q.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(q.toLowerCase())
  );

  const onChangeNew = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const createUser = async (e) => {
    e.preventDefault();
    setMsg("");
    const { username, email, password, role, is_active } = newUser;
    if (!username.trim()) return setMsg("❌ El nombre de usuario es obligatorio.");
    if (!password || password.length < 6) return setMsg("❌ La contraseña debe tener 6+ caracteres.");

    try {
      await api.post("/users/", {
        username: username.trim(),
        email: email.trim() || "",
        password,
        role,
        is_active,
      });
      setMsg("✅ Usuario creado correctamente.");
      setNewUser({ username: "", email: "", role: "SELLER", password: "", is_active: true });
      load();
    } catch (e) {
      const d = e?.response?.data;
      const detail =
        d?.detail ||
        d?.username?.[0] ||
        d?.password?.[0] ||
        d?.role?.[0] ||
        "No se pudo crear el usuario.";
      setMsg(`❌ ${detail}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container">
        <h2>Administración</h2>
        <p className="msg-error">Necesitas rol Dueño o Administrador.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Administración</h2>
      {msg && <p className={msg.startsWith("✅") ? "msg-ok" : "msg-error"}>{msg}</p>}

      {/* Crear usuario */}
      <section className="card" style={{marginBottom:16}}>
        <h3 style={{marginTop:0}}>Crear usuario</h3>
        <form onSubmit={createUser} style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:10}}>
          <input name="username" placeholder="Usuario" value={newUser.username} onChange={onChangeNew} />
          <input name="email" placeholder="Correo (opcional)" value={newUser.email} onChange={onChangeNew} />
          <input name="password" placeholder="Contraseña" type="password" value={newUser.password} onChange={onChangeNew} />
          <select name="role" value={newUser.role} onChange={onChangeNew}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <label style={{display:"inline-flex", alignItems:"center", gap:6}}>
            <input type="checkbox" name="is_active" checked={newUser.is_active} onChange={onChangeNew} />
            Activo
          </label>
          <div style={{gridColumn:"1 / -1", textAlign:"right"}}>
            <button type="submit">Crear</button>
          </div>
        </form>
      </section>

      {/* Listado y cambios */}
      <section className="card">
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <input placeholder="Buscar por usuario o correo…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn-secondary" onClick={load} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button>
        </div>

        <table style={{marginTop:12, width:"100%"}}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{borderTop:"1px solid var(--border)"}}>
                <td>{u.username}</td>
                <td>{u.email || "-"}</td>
                <td>
                  <select value={u.role} onChange={e=>setRole(u.id, e.target.value)}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td>
                  <label style={{display:"inline-flex", gap:6, alignItems:"center"}}>
                    <input type="checkbox" checked={!!u.is_active} onChange={e=>setActive(u.id, e.target.checked)} />
                    {u.is_active ? "Sí" : "No"}
                  </label>
                </td>
              </tr>
            ))}
            {!filtered.length && !loading && (
              <tr><td colSpan={4} style={{padding:8, color:"#777"}}>Sin usuarios</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
