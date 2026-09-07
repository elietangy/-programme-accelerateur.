import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";
import { calculerRapportJour } from "../services/rapportJournalier.service.js";
import { genererRapportPdf } from "../services/pdf.service.js";
import { todayISO } from "../utils/dateFr.js";

export const rapportsRouter = Router();

// Calcul à la volée pour une date donnée (jour courant par défaut), sans archiver
rapportsRouter.get(
  "/journalier",
  asyncHandler(async (req, res) => {
    const date = req.query.date || todayISO();
    const archive = db.prepare("SELECT * FROM rapports_journaliers WHERE date = ?").get(date);
    if (archive) return res.json({ ...archive, archive: true });
    res.json({ ...calculerRapportJour(date), notes: null, archive: false });
  })
);

rapportsRouter.post(
  "/journalier",
  asyncHandler(async (req, res) => {
    const date = req.body?.date || todayISO();
    const notes = req.body?.notes || null;
    const { recettes_total, depenses_total, solde } = calculerRapportJour(date);
    const existant = db.prepare("SELECT * FROM rapports_journaliers WHERE date = ?").get(date);
    if (existant) {
      db.prepare(
        "UPDATE rapports_journaliers SET recettes_total=?, depenses_total=?, solde=?, notes=? WHERE date=?"
      ).run(recettes_total, depenses_total, solde, notes, date);
    } else {
      db.prepare(
        "INSERT INTO rapports_journaliers (date, recettes_total, depenses_total, solde, notes) VALUES (?, ?, ?, ?, ?)"
      ).run(date, recettes_total, depenses_total, solde, notes);
    }
    res.status(201).json(db.prepare("SELECT * FROM rapports_journaliers WHERE date = ?").get(date));
  })
);

rapportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clauses = [];
    const params = [];
    if (req.query.date_debut) {
      clauses.push("date >= ?");
      params.push(req.query.date_debut);
    }
    if (req.query.date_fin) {
      clauses.push("date <= ?");
      params.push(req.query.date_fin);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    res.json(db.prepare(`SELECT * FROM rapports_journaliers ${where} ORDER BY date DESC`).all(...params));
  })
);

rapportsRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const rapport = db.prepare("SELECT * FROM rapports_journaliers WHERE id = ?").get(req.params.id);
    if (!rapport) throw new ApiError(404, "Rapport introuvable.");
    const paiements = db
      .prepare(
        `SELECT p.*, e.nom || ' ' || COALESCE(e.prenom,'') AS eleve_nom
         FROM paiements p JOIN eleves e ON e.id = p.eleve_id WHERE p.date_paiement = ?`
      )
      .all(rapport.date);
    const depenses = db
      .prepare(
        `SELECT d.*, c.nom AS categorie_nom FROM depenses d LEFT JOIN categories_depenses c ON c.id = d.categorie_id
         WHERE d.date_depense = ?`
      )
      .all(rapport.date);
    const parametres = db.prepare("SELECT * FROM parametres_ecole WHERE id = 1").get();
    genererRapportPdf(res, { rapport, paiements, depenses, parametres });
  })
);
