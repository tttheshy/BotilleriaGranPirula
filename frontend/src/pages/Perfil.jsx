import { useEffect, useState } from "react";
import api from "../api";
import { useMe } from "../useMe";

export default function Perfil() {
  const { me, loading } = useMe();
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const role = (me?.role || "").toString().toUpperCase();
  const isAdmin = ["OWNER", "ADMIN"].includes(role) || me?.is_staff || me?.is_superuser;

  useEffect(() => {
    if (me) setEmail(me.email || "");
  }, [me]);

  const guardar = async (e) => {
    e.preventDefault();
    if (!me) return;
    setMsg(""); setSaving(true);
    try {
      const body = { email: email.trim() };
      if (password.trim()) body.password = password.trim();
      await api.patch(`/users/${me.id}/`, body);
      setMsg("✅ Datos actualizados.");
      setPassword("");
    } catch (e) {
      const s = e?.response?.status;
      const d = e?.response?.data;
      const detail = d?.detail || d?.email?.[0] || d?.password?.[0] || "No se pudo guardar.";
      if (s === 403) setMsg("❌ No tienes permisos para actualizar este perfil.");
      else setMsg(`❌ ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !me) return <div className="container"><h2>Perfil</h2><p>Cargando…</p></div>;

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h2>Perfil de Usuario</h2>
      {msg && <p className={msg.startsWith("✅") ? "msg-ok" : "msg-error"}>{msg}</p>}

      <form className="card" onSubmit={guardar} style={{ marginBottom: 16, paddingBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label>Nombre de usuario</label>
            <input value={me.username} disabled />
          </div>
          <div>
            <label>Rol</label>
            <input value={role} disabled />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label>Correo electrónico</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isAdmin}
              placeholder="Correo"
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!isAdmin}
              placeholder="Dejar en blanco para no cambiar"
            />
          </div>
        </div>

        {isAdmin ? (
          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        ) : (
          <p style={{ marginTop: 16, color: "#999" }}>
            Solo lectura. Pide a un administrador cambios de correo o contraseña.
          </p>
        )}
      </form>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Información adicional</h3>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: "1.8em" }}>
          <li><strong>ID:</strong> {me.id}</li>
          <li><strong>Staff:</strong> {me.is_staff ? " Sí" : "— No"}</li>
          <li><strong>Superuser:</strong> {me.is_superuser ? " Sí" : "— No"}</li>
        </ul>
      </section>
    </div>
  );
}
