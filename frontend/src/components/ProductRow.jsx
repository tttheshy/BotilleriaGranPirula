import { formatMoney } from "../utils/money";

export default function ProductRow({ p, onAdd }) {
  return (
    <li style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px dashed #eee"}}>
      <div style={{flex:1}}>
        <div><strong>{p.code}</strong> — {p.name}</div>
        <small>{p.category_name || "Sin categoría"} · Stock: {p.stock} · {formatMoney(p.price)}</small>
      </div>
      <button onClick={() => onAdd(p)}>Agregar</button>
    </li>
  );
}