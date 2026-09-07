import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { todayISO } from "../utils/dateFr.js";

export const dashboardRouter = Router();

function debutSemaine(d) {
  const jour = (d.getDay() + 6) % 7; // 0 = lundi
  const lundi = new Date(d);
  lundi.setDate(d.getDate() - jour);
  return lundi;
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function calculerPeriode(periode, dateRef, anneeScolaireId) {
  const date = dateRef ? new Date(dateRef + "T00:00:00") : new Date();

  if (periode === "semaine") {
    const debut = debutSemaine(date);
    const fin = new Date(debut);
    fin.setDate(debut.getDate() + 6);
    return { date_debut: toISO(debut), date_fin: toISO(fin) };
  }
  if (periode === "mois") {
    const debut = new Date(date.getFullYear(), date.getMonth(), 1);
    const fin = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { date_debut: toISO(debut), date_fin: toISO(fin) };
  }
  if (periode === "annee") {
    const annee = anneeScolaireId
      ? db.prepare("SELECT * FROM annees_scolaires WHERE id = ?").get(anneeScolaireId)
      : db.prepare("SELECT * FROM annees_scolaires WHERE active = 1").get();
    if (annee?.date_debut && annee?.date_fin) {
      return { date_debut: annee.date_debut, date_fin: annee.date_fin };
    }
    const debut = new Date(date.getFullYear(), 0, 1);
    const fin = new Date(date.getFullYear(), 11, 31);
    return { date_debut: toISO(debut), date_fin: toISO(fin) };
  }
  // jour (par défaut)
  const iso = toISO(date);
  return { date_debut: iso, date_fin: iso };
}

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const periode = ["jour", "semaine", "mois", "annee"].includes(req.query.periode)
      ? req.query.periode
      : "jour";
    const { date_debut, date_fin } = calculerPeriode(periode, req.query.date, req.query.annee_scolaire_id);

    const totalFacture = db
      .prepare(
        `SELECT COALESCE(SUM(fl.montant),0) AS total
         FROM facture_lignes fl JOIN factures f ON f.id = fl.facture_id
         WHERE f.date_emission BETWEEN ? AND ?`
      )
      .get(date_debut, date_fin).total;

    const totalEncaisse = db
      .prepare(`SELECT COALESCE(SUM(montant),0) AS total FROM paiements WHERE date_paiement BETWEEN ? AND ?`)
      .get(date_debut, date_fin).total;

    const totalDepenses = db
      .prepare(`SELECT COALESCE(SUM(montant),0) AS total FROM depenses WHERE date_depense BETWEEN ? AND ?`)
      .get(date_debut, date_fin).total;

    const totalRestantDuGlobal = db
      .prepare(
        `SELECT COALESCE(SUM(fl.montant),0) - COALESCE((SELECT SUM(montant) FROM paiements),0) AS reste
         FROM facture_lignes fl`
      )
      .get().reste;

    res.json({
      periode,
      date_debut,
      date_fin,
      total_facture: totalFacture,
      total_encaisse: totalEncaisse,
      total_restant_du_periode: totalFacture - totalEncaisse,
      total_restant_du_global: totalRestantDuGlobal,
      total_depenses: totalDepenses,
      solde_caisse: totalEncaisse - totalDepenses,
    });
  })
);
