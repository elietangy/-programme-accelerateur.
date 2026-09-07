import { db } from "../db/connection.js";

export function totalFacture(factureId) {
  const r = db
    .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM facture_lignes WHERE facture_id = ?")
    .get(factureId);
  return r.total;
}

export function totalPaiements(factureId) {
  const r = db
    .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM paiements WHERE facture_id = ?")
    .get(factureId);
  return r.total;
}

export function recalculerStatutFacture(factureId) {
  const total = totalFacture(factureId);
  const paye = totalPaiements(factureId);
  let statut = "impayee";
  if (paye >= total && total > 0) statut = "payee";
  else if (paye > 0) statut = "partielle";
  db.prepare("UPDATE factures SET statut = ? WHERE id = ?").run(statut, factureId);
  return { total, paye, resteDu: total - paye, statut };
}

export function genererNumeroFacture() {
  const annee = new Date().getFullYear();
  const compteur = db
    .prepare("SELECT COUNT(*) AS n FROM factures WHERE numero LIKE ?")
    .get(`FAC-${annee}-%`).n;
  const numero = `FAC-${annee}-${String(compteur + 1).padStart(5, "0")}`;
  const existe = db.prepare("SELECT id FROM factures WHERE numero = ?").get(numero);
  if (existe) {
    return `FAC-${annee}-${String(compteur + 1 + Math.floor(Math.random() * 1000)).padStart(5, "0")}`;
  }
  return numero;
}
