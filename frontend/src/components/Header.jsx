import { Link, useLocation, useNavigate } from "react-router-dom";
import { isLoggedIn, clearToken } from "../auth";
import { useMe } from "../useMe";

export default function Header() {
  const loc = useLocation();
  const nav = useNavigate();
  const { me } = useMe();
  const logout = () => { clearToken(); nav("/login"); };

  const is = (path) => (loc.pathname === path ? "active" : "");


  const role = (me?.role || "").toString().toUpperCase();
  const isAdmin = ["OWNER","ADMIN"].includes(role) || me?.is_staff || me?.is_superuser;

  return (
    <nav className="navbar">
      <strong className="brand">GranPirula · POS</strong>
      {isLoggedIn() && (
        <>
          <Link className={`nav-link ${is("/pos")}`} to="/pos">Punto de Venta</Link>
          <Link className={`nav-link ${is("/ventas/hoy")}`} to="/ventas/hoy">Ventas del día</Link>
          <Link className={`nav-link ${is("/caja")}`} to="/caja">Caja</Link>
          <Link className={`nav-link ${is("/promos")}`} to="/promos">Promociones</Link>
          <Link className={`nav-link ${is("/stock")}`} to="/stock">Stock</Link>
          <Link className={`nav-link ${is("/categorias")}`} to="/categorias">Categorías</Link>
          <Link className={`nav-link ${is("/bitacora")}`} to="/bitacora">Bitácora</Link>
          {isAdmin && (
            <Link className={`nav-link ${is("/admin")}`} to="/admin">Administración</Link>
          )}
          <span className="spacer" />
          <Link className={`nav-link ${is("/perfil")}`} to="/perfil">Ver perfil</Link>
          <button className="btn-ghost" onClick={logout}>Salir</button>
        </>
      )}
    </nav>
  );
}
