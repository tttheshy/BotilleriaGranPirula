import { Link, useLocation, useNavigate } from "react-router-dom";
import { isLoggedIn, clearToken } from "../auth";
import { useMe } from "../useMe";

export default function Sidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { me, loading } = useMe();

  const logout = () => {
    clearToken();
    nav("/login");
  };

  const is = (path) => (loc.pathname === path ? "active" : "");

  const role = (me?.role || "").toString().toUpperCase();
  const isAdmin = ["OWNER", "ADMIN"].includes(role) || me?.is_staff || me?.is_superuser;
  const isSeller = role === "SELLER" && !isAdmin;

  return (
    <aside className="sidebar">
      <div className="brand">
        <i className="fi fi-rr-store-alt" style={{ marginRight: 8 }}></i>
        Gran Pirula
        <div className="subtitle">Sistema POS</div>
      </div>

      {loading ? (
        <div className="loading">Cargando menú…</div>
      ) : (
        isLoggedIn() && (
          <nav className="nav-links">
            <Link className={is("/pos")} to="/pos">
              <i className="fi fi-rr-shopping-cart" /> Punto de Venta
            </Link>
            <Link className={is("/ventas/hoy")} to="/ventas/hoy">
              <i className="fi fi-rr-calendar-day" /> Ventas del día
            </Link>
            <Link className={is("/caja")} to="/caja">
              <i className="fi fi-rr-wallet" /> Caja
            </Link>
            {!isSeller && (
              <Link className={is("/promos")} to="/promos">
                <i className="fi fi-rr-badge-percent" /> Promociones
              </Link>
            )}
            <Link className={is("/stock")} to="/stock">
              <i className="fi fi-rr-boxes" /> Stock
            </Link>
            {!isSeller && (
              <>
                <Link className={is("/productos/nuevo")} to="/productos/nuevo">
                  <i className="fi fi-rr-plus-small" /> Agregar Producto
                </Link>
                <Link className={is("/categorias")} to="/categorias">
                  <i className="fi fi-rr-apps" /> Categorías
                </Link>
              </>
            )}
            {isAdmin && (
              <Link className={is("/admin")} to="/admin">
                <i className="fi fi-rr-settings" /> Administración
              </Link>
            )}
            <Link className={is("/dashboard")} to="/dashboard">
              <i className="fi fi-rr-dashboard" /> Dashboard
            </Link>
            <Link className={is("/perfil")} to="/perfil">
              <i className="fi fi-rr-user" /> Perfil
            </Link>
            <button className="btn-ghost" onClick={logout}>
              <i className="fi fi-rr-sign-out-alt" /> Salir
            </button>
          </nav>
        )
      )}
    </aside>
  );
}

