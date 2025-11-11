import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Login from "./pages/Login.jsx";
import Pos from "./pages/Pos.jsx";
import Stock from "./pages/Stock.jsx";
import Caja from "./pages/Caja.jsx";
import Promos from "./pages/Promos.jsx";
import Bitacora from "./pages/Bitacora.jsx";
import Categorias from "./pages/Categorias.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import ProductoNuevo from "./pages/ProductoNuevo.jsx";
import VentasDia from "./pages/VentasDia.jsx";
import Perfil from "./pages/Perfil.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/pos" element={<PrivateRoute><Pos /></PrivateRoute>} />
        <Route path="/ventas/hoy" element={<PrivateRoute><VentasDia /></PrivateRoute>} />
        <Route path="/stock" element={<PrivateRoute><Stock /></PrivateRoute>} />
        <Route path="/productos/nuevo" element={<PrivateRoute><ProductoNuevo /></PrivateRoute>} />
        <Route path="/promos" element={<PrivateRoute><Promos /></PrivateRoute>} />
        <Route path="/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
        <Route path="/bitacora" element={<PrivateRoute><Bitacora /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/caja" element={<PrivateRoute><Caja /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
