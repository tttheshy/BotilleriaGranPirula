import { useEffect, useState, useRef } from "react";
import api from "../api";
import BarcodeScanner from "/src/components/BarcodeScanner";

// ⬇️ import dinámico dentro del modal, no hace falta aquí arriba

export default function ProductoNuevo() {
  const [form, setForm] = useState({
    code: "", name: "", category: "", price: "", stock: 0, active: true, top_seller: false
  });
  const [cats, setCats] = useState([]);
  const [msg, setMsg] = useState("");
  const [scanning, setScanning] = useState(false);   // estado de teclado/lector
  const [cameraOpen, setCameraOpen] = useState(false); // ⬅️ nuevo: modal cámara

  // Ref para el input del código para enfocarlo automáticamente
  const codeInputRef = useRef(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await api.get("/categories/");
        setCats(data || []);
      } catch { 
        setCats([]); 
      }
    };
    run();
  }, []);

  // Manejador para captura con lector tipo teclado (barcode wedge).
  // Si el modal de cámara está abierto, se ignora.
  useEffect(() => {
    let buffer = "";
    let timeout = null;

    const handleKeyPress = (e) => {
      if (cameraOpen) return; // ⬅️ no interferir con la cámara

      // Si el usuario está escribiendo en otro campo, no capturamos
      if (document.activeElement !== codeInputRef.current && 
          document.activeElement.tagName === 'INPUT') {
        return;
      }

      // Si presionan Enter, asumimos que terminó el escaneo
      if (e.key === "Enter" && buffer.length > 0) {
        e.preventDefault();
        setForm(f => ({ ...f, code: buffer }));
        setScanning(false);
        buffer = "";
        if (timeout) clearTimeout(timeout);
        return;
      }

      // Acumulamos caracteres
      if (e.key.length === 1) {
        if (buffer.length === 0) setScanning(true);
        buffer += e.key;
        
        // Reset del buffer después de 100ms sin nuevas teclas
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (buffer.length > 0) {
            setForm(f => ({ ...f, code: buffer }));
            setScanning(false);
          }
          buffer = "";
        }, 100);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (timeout) clearTimeout(timeout);
    };
  }, [cameraOpen]); // ⬅️ depende de cameraOpen

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const crearCategoriaRapida = async () => {
    const nombre = prompt("Nombre de la categoría:");
    if (!nombre) return;
    try {
      const { data } = await api.post("/categories/", { name: nombre });
      setCats(c => [...c, data]);
      setForm(f => ({ ...f, category: data.id }));
      setMsg("✅ Categoría creada.");
      setTimeout(() => setMsg(""), 2000);
    } catch { 
      setMsg("❌ No se pudo crear la categoría (¿permisos?)."); 
    }
  };

  const guardar = async (e) => {
    e.preventDefault(); 
    setMsg("");

    if (!form.code || !form.name || !form.price) {
      setMsg("❌ Código, nombre y precio son obligatorios."); 
      return;
    }
    
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category || null,
        price: String(form.price),
        stock: Number(form.stock || 0),
        active: !!form.active,
        top_seller: !!form.top_seller
      };
      await api.post("/products/", payload);
      setMsg("✅ Producto creado correctamente.");
      setForm({ 
        code: "", name: "", category: "", price: "", 
        stock: 0, active: true, top_seller: false 
      });
      
      // Enfocamos el campo de código para el siguiente producto
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
      
    } catch (err) {
      if (err?.response?.status === 403) {
        setMsg("❌ Sin permisos: solo Dueño/Admin pueden crear productos.");
      } else if (err?.response?.status === 400) {
        const detail = err?.response?.data?.code?.[0] || 
                      err?.response?.data?.detail || 
                      "Datos inválidos o código duplicado.";
        setMsg(`❌ ${detail}`);
      } else {
        setMsg("❌ Error al crear producto. Revisa el backend.");
      }
    }
  };

  const limpiar = () => {
    setForm({ 
      code: "", name: "", category: "", price: "", 
      stock: 0, active: true, top_seller: false 
    });
    setMsg("");
    codeInputRef.current?.focus();
  };

  return (
    <div className="container" style={{maxWidth:700}}>
      <h2>Agregar Producto</h2>
      
      {scanning && (
        <div style={{
          padding: 10, 
          marginBottom: 12, 
          background: "rgba(212,175,55,.1)", 
          border: "1px solid var(--gold)",
          borderRadius: 8,
          textAlign: "center"
        }}>
           Escaneando código de barras...
        </div>
      )}

      {msg && (
        <p className={msg.startsWith("✅") ? "msg-ok" : "msg-error"}>
          {msg}
        </p>
      )}

      <section className="card">
        <form onSubmit={guardar} style={{display:"grid",gap:12}}>
          <div>
            <label style={{display:"block", marginBottom:4, fontWeight:500}}>
              Código de barras
            </label>
            <div style={{ display:"flex", gap:8 }}>
              <input 
                ref={codeInputRef}
                name="code" 
                value={form.code} 
                onChange={onChange} 
                placeholder="Escanea o escribe el código"
                autoFocus
                style={{ flex:1 }}
              />
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                title="Escanear con cámara"
              >
                 Escanear
              </button>
            </div>
            <small style={{color:"var(--muted)", fontSize:11}}>
              Puedes usar un lector de código de barras, escribir manualmente o escanear con la cámara.
            </small>
          </div>

          <div>
            <label style={{display:"block", marginBottom:4, fontWeight:500}}>
              Nombre del producto
            </label>
            <input 
              name="name" 
              value={form.name} 
              onChange={onChange} 
              placeholder="Ej: Coca-Cola 350ml" 
            />
          </div>

          <div>
            <label style={{display:"block", marginBottom:4, fontWeight:500}}>
              Categoría
            </label>
            <div style={{display:"flex",gap:8}}>
              <select 
                name="category" 
                value={form.category} 
                onChange={onChange} 
                style={{flex:1}}
              >
                <option value="">(Sin categoría)</option>
                {cats.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="button" onClick={crearCategoriaRapida}>
                + Nueva
              </button>
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <div>
              <label style={{display:"block", marginBottom:4, fontWeight:500}}>
                Precio
              </label>
              <input 
                name="price" 
                type="number" 
                step="0.01" 
                min="0"
                value={form.price} 
                onChange={onChange}
                placeholder="$"
              />
            </div>

            <div>
              <label style={{display:"block", marginBottom:4, fontWeight:500}}>
                Stock inicial
              </label>
              <input 
                name="stock" 
                type="number" 
                min="0"
                value={form.stock} 
                onChange={onChange} 
              />
            </div>
          </div>

          <div style={{
            display:"flex",
            gap:24,
            padding:"10px 0",
            borderTop:"1px solid var(--border)",
            borderBottom:"1px solid var(--border)"
          }}>
            <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer"}}>
              <input 
                type="checkbox" 
                name="active" 
                checked={form.active} 
                onChange={onChange} 
              />
              <span>Producto activo</span>
            </label>
            
            <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer"}}>
              <input 
                type="checkbox" 
                name="top_seller" 
                checked={form.top_seller} 
                onChange={onChange} 
              />
              <span>⭐ Top seller</span>
            </label>
          </div>

          <div style={{display:"flex", gap:10, justifyContent:"flex-end"}}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={limpiar}
            >
              Limpiar
            </button>
            <button type="submit">
              Guardar Producto
            </button>
          </div>
        </form>
      </section>

      <div style={{
        marginTop: 16, 
        padding: 12, 
        background: "rgba(255,255,255,.02)",
        borderRadius: 8,
        fontSize: 13,
        color: "var(--muted)"
      }}>

      </div>

        {/* ⬇️ Modal de escaneo con cámara */}
        <ScannerModal
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onDetected={(code) => {
            setForm(f => ({ ...f, code }));
            setMsg(`✅ Código detectado: ${code}`);
            alert(`Código detectado: ${code}`);
            setCameraOpen(false);
            setTimeout(() => codeInputRef.current?.focus(), 50);
          }}
          
        />

    </div>
  );
}

// ⬇️ Modal de escaneo con cámara usando BarcodeScanner
function ScannerModal({ open, onClose, onDetected }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="card" style={{ width: "min(720px, 100%)", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Escanear producto</h3>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <BarcodeScanner
            facingMode="environment"
            onResult={(text) => {
              if (!text) return;
              onDetected?.(text); // solo delega el texto
              onClose?.(); // cierra el modal
            }}
          />
        </div>

      </div>
    </div>
  );
}
