// frontend/src/utils/ymd.js

export default function ymd(dateString) {
  const d = new Date(dateString);
  return d.toISOString().slice(0, 10);
}
