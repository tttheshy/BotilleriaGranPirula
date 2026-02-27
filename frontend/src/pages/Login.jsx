import { useState } from "react";
import api from "../api";
import { setTokens, isLoggedIn } from "../auth";
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
      setTokens(data.access, data.refresh);
      nav("/pos");
    } catch {
      setErr("⚠️ Credenciales inválidas o servidor no disponible.");
    }
  };

  if (isLoggedIn()) return <Navigate to="/pos" replace />;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(circle at 20% 20%, rgba(240,180,20,0.08), transparent 32%), radial-gradient(circle at 80% 0%, rgba(240,180,20,0.06), transparent 30%), linear-gradient(180deg, #050505, #0b0b0b 45%, #050505)",
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          padding: 30,
          background: "rgba(12, 12, 12, 0.92)",
          border: "1px solid rgba(255,215,0,0.28)",
          borderRadius: 18,
          boxShadow: "0 25px 60px rgba(0,0,0,0.55), 0 0 40px rgba(255,215,0,0.08)",
          textAlign: "center",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <img
            src="/logo-login.png"
            alt="El Gran Pirula"
            style={{
              width: 140,
              height: "auto",
              margin: "0 auto 10px auto",
              filter: "drop-shadow(0 0 14px rgba(255,255,255,0.18))",
            }}
          />
          <h2 style={{ color: "#f8fafc", margin: 0, letterSpacing: 0.6 }}>Bienvenido</h2>
          <p style={{ color: "#d1a90d", marginTop: 6, fontWeight: 600 }}>El Gran Pirula · Punto de venta</p>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <input
            placeholder="Usuario"
            value={username}
            onChange={(e) => setU(e.target.value)}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,215,0,0.35)",
              background: "#0e0e0e",
              color: "#f8fafc",
              outline: "none",
            }}
          />
          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,215,0,0.35)",
              background: "#0e0e0e",
              color: "#f8fafc",
              outline: "none",
            }}
          />
          <button
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #fbbf24, #eab308)",
              color: "#0b0b0b",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 12px 30px rgba(234,179,8,0.35)",
            }}
          >
            Entrar
          </button>
          {err && <p className="msg-error" style={{ marginTop: 6 }}>{err}</p>}
        </form>
      </div>
    </div>
  );
}
