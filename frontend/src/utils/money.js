const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  const numeric = typeof value === "string" ? Number(value) : value;
  const amount = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  return CLP.format(amount);
}