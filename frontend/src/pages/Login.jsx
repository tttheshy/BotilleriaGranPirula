import { useState } from "react";
import api from "../api";
import { setToken, isLoggedIn } from "../auth";
import { Navigate, useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/login/", { username, password });
      setToken(data.access);
      nav("/pos");
    } catch {
      setErr("❌ Credenciales inválidas o servidor no disponible.");
    }
  };

  if (isLoggedIn()) return <Navigate to="/pos" replace />;

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "60px auto",
        padding: 24,
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        textAlign: "center",
      }}
    >

      <h2 style={{ color: "var(--gold)", marginBottom: 12 }}>Bienvenido</h2>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Usuario"
          value={username}
          onChange={(e) => setU(e.target.value)}
        />
        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setP(e.target.value)}
        />
        <button>Entrar</button>
        {err && <p className="msg-error" style={{ marginTop: 6 }}>{err}</p>}
      </form>

      <p style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
        Usa un usuario registrado como vendedor o administrador.
      </p>
    </div>
  );
}
