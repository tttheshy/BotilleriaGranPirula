import axios from "axios";
import { getAccessToken, getRefreshToken, setAccessToken, clearToken } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
});

api.interceptors.request.use((cfg) => {
  const t = getAccessToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config || {};
    const status = error?.response?.status;
    if (status === 401 && !original._retry) {
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          original._retry = true;
          const { data } = await axios.post(
            (import.meta.env.VITE_API_URL || "http://localhost:8000/api") + "/auth/refresh/",
            { refresh }
          );
          if (data?.access) {
            setAccessToken(data.access);
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${data.access}`;
            return api(original);
          }
        } catch (e) {
          // refresh falló: limpiar sesión
          clearToken();
          try { if (window?.location) window.location.href = "/login"; } catch {}
        }
      } else {
        // no hay refresh, limpiar
        clearToken();
        try { if (window?.location) window.location.href = "/login"; } catch {}
      }
    }
    return Promise.reject(error);
  }
);

export default api;
