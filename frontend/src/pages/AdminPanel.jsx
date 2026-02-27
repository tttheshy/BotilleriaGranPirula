import { useEffect, useState } from "react";
import api from "../api";
import { useMe } from "../useMe";

const ROLES = [
  { value: "OWNER", label: "Dueno" },
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

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    role: "SELLER",
    password: "",
    is_active: true,
  });

  async function load() {
    setLoading(true); setMsg("");
    try {
      const { data } = await api.get("/users/");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.response?.status === 403 ? "Sin permisos para administrar usuarios." : "No se pudieron cargar usuarios.");
      setRows([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function setRole(id, role) {
    try {
      await api.patch(`/users/${id}/`, { role });
      setMsg("OK. Rol actualizado.");
      load();
    } catch (e) {
      setMsg(e?.response?.status === 403 ? "Sin permisos para cambiar roles." : "No se pudo actualizar el rol.");
    }
  }

  async function setActive(id, is_active) {
    try {
      await api.patch(`/users/${id}/`, { is_active });
      setMsg("OK. Estado actualizado.");
      load();
    } catch (e) {
      setMsg("No se pudo actualizar el estado.");
    }
  }

  async function removeUser(id, username) {
    if (me?.id === id) { setMsg("No puedes eliminar tu propio usuario."); return; }
    if (!confirm(`Eliminar el usuario "${username}"?`)) return;
    try {
      await api.delete(`/users/${id}/`);
      setMsg("Usuario eliminado correctamente.");
      load();
    } catch (e) {
      const s = e?.response?.status;
      if (s === 403) setMsg("Sin permisos para eliminar usuarios.");
      else if (s === 404) setMsg("Usuario no encontrado.");
      else setMsg("No se pudo eliminar el usuario.");
    }
  }

  const filtered = rows.filter(u =>
    (u.username || "").toLowerCase().includes(q.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(q.toLowerCase())
  );

  const onChangeNew = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  async function createUser(e) {
    e.preventDefault();
    setMsg("");
    const { username, email, password, role, is_active } = newUser;
    if (!username.trim()) return setMsg("El nombre de usuario es obligatorio.");
    if (!password || password.length < 6) return setMsg("La clave debe tener 6+ caracteres.");

    try {
      await api.post("/users/", { username: username.trim(), email: email.trim() || "", password, role, is_active });
      setMsg("OK. Usuario creado.");
      setNewUser({ username: "", email: "", role: "SELLER", password: "", is_active: true });
      load();
    } catch (e) {
      const d = e?.response?.data;
      const detail = d?.detail || d?.username?.[0] || d?.password?.[0] || d?.role?.[0] || "No se pudo crear el usuario.";
      setMsg(detail);
    }
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <h2>Administracion</h2>
        <p className="msg-error">Necesitas rol Dueno o Administrador.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Administracion</h2>
      {msg && <p className={msg.startsWith("OK.") ? "msg-ok" : "msg-error"}>{msg}</p>}

      <section className="card" style={{marginBottom:16}}>
        <h3 style={{marginTop:0}}>Crear usuario</h3>
        <form onSubmit={createUser} style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:10}}>
          <input name="username" placeholder="Usuario" value={newUser.username} onChange={onChangeNew} />
          <input name="email" placeholder="Correo (opcional)" value={newUser.email} onChange={onChangeNew} />
          <input name="password" placeholder="Clave" type="password" value={newUser.password} onChange={onChangeNew} />
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

      <section className="card">
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <input placeholder="Buscar por usuario o correo" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn-secondary" onClick={load} disabled={loading}>{loading ? "Actualizando..." : "Actualizar"}</button>
        </div>

        <table style={{marginTop:12, width:"100%"}}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Activo</th>
              <th style={{textAlign:"right"}}>Acciones</th>
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
                    {u.is_active ? "Si" : "No"}
                  </label>
                </td>
                <td style={{textAlign:"right"}}>
                  <button className="btn-secondary" onClick={() => removeUser(u.id, u.username)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!filtered.length && !loading && (
              <tr><td colSpan={5} style={{padding:8, color:"#777"}}>Sin usuarios</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
