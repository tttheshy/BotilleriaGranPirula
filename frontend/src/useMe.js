import { useEffect, useState } from "react";
import api from "./api";
import { clearToken, getToken } from "./auth";

export function useMe() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const token = getToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me/");
      setMe(data || null);
    } catch (err) {
      if (err?.response?.status === 401) {
        clearToken();
      }
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { me, loading, refresh };
}
