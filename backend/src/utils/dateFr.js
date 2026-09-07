export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Convertit une date ISO (aaaa-mm-jj) en affichage français jj/mm/aaaa
export function isoToFr(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function isValidISODate(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}
