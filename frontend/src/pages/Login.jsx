import { useState } from "react";
import api from "../api";
import { setToken, isLoggedIn } from "../auth";
import { useNavigate } from "react-router-dom";

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
      setErr("Credenciales inválidas o servidor no disponible.");
    }
  };

  if (isLoggedIn()) {
    nav("/pos");
    return null;
  }

  return (
    <div style={{maxWidth:360,margin:"40px auto"}}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={submit} style={{display:"grid",gap:8}}>
        <input placeholder="Usuario" value={username} onChange={(e)=>setU(e.target.value)} />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e)=>setP(e.target.value)} />
        <button>Entrar</button>
        {err && <p style={{color:"crimson"}}>{err}</p>}
      </form>
      <p style={{marginTop:12, fontSize:12, color:"#666"}}>
        Usa el usuario creado en <code>createsuperuser</code> o uno con rol de vendedor.
      </p>
    </div>
  );
}
