import { db } from "../db/connection.js";

export function calculerRapportJour(date) {
  const recettes = db
    .prepare("SELECT COALESCE(SUM(montant),0) AS total FROM paiements WHERE date_paiement = ?")
    .get(date).total;
  const depenses = db
    .prepare("SELECT COALESCE(SUM(montant),0) AS total FROM depenses WHERE date_depense = ?")
    .get(date).total;
  return { date, recettes_total: recettes, depenses_total: depenses, solde: recettes - depenses };
}
