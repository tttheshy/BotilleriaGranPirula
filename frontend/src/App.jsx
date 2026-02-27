import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Login from "./pages/Login.jsx";
import Pos from "./pages/Pos.jsx";
import Stock from "./pages/Stock.jsx";
import Caja from "./pages/Caja.jsx";
import Promos from "./pages/Promos.jsx";
// Bitácora fue reemplazado por Dashboard
import Dashboard from "./pages/Dashboard.jsx";
import Categorias from "./pages/Categorias.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import ProductoNuevo from "./pages/ProductoNuevo.jsx";
import VentasDia from "./pages/VentasDia.jsx";
import Perfil from "./pages/Perfil.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/pos" element={<PrivateRoute><Pos /></PrivateRoute>} />
        <Route path="/ventas/hoy" element={<PrivateRoute><VentasDia /></PrivateRoute>} />
        <Route path="/stock" element={<PrivateRoute><Stock /></PrivateRoute>} />
        <Route path="/productos/nuevo" element={<PrivateRoute><AdminRoute><ProductoNuevo /></AdminRoute></PrivateRoute>} />
        <Route path="/promos" element={<PrivateRoute><AdminRoute><Promos /></AdminRoute></PrivateRoute>} />
        <Route path="/categorias" element={<PrivateRoute><AdminRoute><Categorias /></AdminRoute></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminRoute><AdminPanel /></AdminRoute></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/caja" element={<PrivateRoute><Caja /></PrivateRoute>} />
        
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
