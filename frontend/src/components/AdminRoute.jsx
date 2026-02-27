import { Navigate } from "react-router-dom";
import { useMe } from "../useMe";

export default function AdminRoute({ children }) {
  const { me, loading } = useMe();
  if (loading) return null;
  const role = (me?.role || "").toString().toUpperCase();
  const isAdmin = ["OWNER", "ADMIN"].includes(role) || me?.is_staff || me?.is_superuser;
  if (!isAdmin) return <Navigate to="/pos" replace />;
  return children;
}

