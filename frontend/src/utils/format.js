export function money(n) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0)) + " FCFA";
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Affiche une date ISO (aaaa-mm-jj) au format français jj/mm/aaaa
export function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
