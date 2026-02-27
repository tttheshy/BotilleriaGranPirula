import { useEffect, useRef, useState } from "react";
import api from "../api";

export default function Categorias() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (text, type = "info", delay = 2500) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(text ? { text, type } : null);
    if (text && delay > 0) {
      toastTimeout.current = setTimeout(() => setToast(null), delay);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/categories/");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(
        e?.response?.status === 403
          ? "Sin permisos para ver categorias."
          : "Error cargando categorias.",
        "error",
        3500
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Ingresa un nombre de categoria.", "warn");
      return;
    }
    try {
      await api.post("/categories/", { name: name.trim() });
      setName("");
      showToast("Categoria creada.", "success");
      load();
    } catch (e) {
      showToast(
        e?.response?.status === 403 ? "Sin permisos para crear." : "No se pudo crear.",
        "error",
        3500
      );
    }
  };

  const guardar = async (id, newName) => {
    if (!newName.trim()) {
      showToast("El nombre no puede estar vacio.", "warn");
      return;
    }
    try {
      await api.patch(`/categories/${id}/`, { name: newName.trim() });
      showToast("Categoria actualizada.", "success");
      load();
    } catch (e) {
      showToast(
        e?.response?.status === 403 ? "Sin permisos para editar." : "No se pudo editar.",
        "error",
        3500
      );
    }
  };

  const eliminar = async (id) => {
    try {
      await api.delete(`/categories/${id}/`);
      showToast("Categoria eliminada correctamente.", "success");
      load();
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message;
      if (status === 400) {
        showToast(
          detail || "Esta categoria no puede ser borrada porque tiene productos asociados.",
          "warn",
          3500
        );
      } else if (status === 403) {
        showToast("No tienes permisos para eliminar categorias.", "error", 3500);
      } else {
        showToast("Ocurrio un error al eliminar la categoria.", "error", 3500);
      }
    }
  };

  const filtered = rows.filter((c) =>
    (c.name || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="container">
      <h2>Categorias</h2>

      <section className="card" style={{ marginBottom: 16 }}>
        <form
          onSubmit={crear}
          style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}
        >
          <input
            placeholder="Nueva categoria..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button>Agregar</button>
        </form>
      </section>

      <section className="card">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <Row key={c.id} c={c} onSave={guardar} onDelete={() => setDeleteTarget(c)} />
            ))}
            {!filtered.length && !loading && (
              <tr>
                <td colSpan={2} style={{ padding: 8, color: "#666" }}>
                  Sin categorias
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card" style={{ width: "min(520px, 100%)", padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              Eliminar categoria
            </div>
            <div style={{ marginTop: 8, color: "var(--muted)" }}>
              Estas seguro de eliminar "{deleteTarget.name}"?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = deleteTarget.id;
                  setDeleteTarget(null);
                  await eliminar(id);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast?.text && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 20,
            minWidth: 260,
            maxWidth: 360,
            padding: "12px 14px",
            borderRadius: 12,
            color: "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.1)",
            background:
              toast.type === "success"
                ? "linear-gradient(135deg, rgba(40,167,69,0.95), rgba(32,201,151,0.95))"
                : toast.type === "error"
                ? "linear-gradient(135deg, rgba(220,53,69,0.95), rgba(255,99,132,0.95))"
                : "linear-gradient(135deg, rgba(255,193,7,0.95), rgba(255,159,28,0.95))",
          }}
          role="status"
          aria-live="polite"
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {toast.type === "success"
              ? "Operacion exitosa"
              : toast.type === "error"
              ? "Error"
              : "Aviso"}
          </div>
          <div>{toast.text}</div>
        </div>
      )}
    </div>
  );
}

function Row({ c, onSave, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(c.name || "");
  return (
    <tr>
      <td>
        {edit ? (
          <input value={val} onChange={(e) => setVal(e.target.value)} />
        ) : (
          c.name
        )}
      </td>
      <td style={{ textAlign: "right" }}>
        {edit ? (
          <>
            <button
              onClick={() => {
                onSave(c.id, val);
                setEdit(false);
              }}
            >
              Guardar
            </button>{" "}
            <button
              className="btn-secondary"
              onClick={() => {
                setVal(c.name || "");
                setEdit(false);
              }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEdit(true)}>Editar</button>{" "}
            <button className="btn-secondary" onClick={() => onDelete(c.id)}>
              Eliminar
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
