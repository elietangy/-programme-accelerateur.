import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";
import { recalculerStatutFacture, totalFacture, totalPaiements } from "../services/facture.service.js";
import { todayISO } from "../utils/dateFr.js";

export const paiementsRouter = Router();

paiementsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clauses = [];
    const params = [];
    if (req.query.facture_id) {
      clauses.push("p.facture_id = ?");
      params.push(req.query.facture_id);
    }
    if (req.query.eleve_id) {
      clauses.push("p.eleve_id = ?");
      params.push(req.query.eleve_id);
    }
    if (req.query.date_debut) {
      clauses.push("p.date_paiement >= ?");
      params.push(req.query.date_debut);
    }
    if (req.query.date_fin) {
      clauses.push("p.date_paiement <= ?");
      params.push(req.query.date_fin);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const paiements = db
      .prepare(
        `SELECT p.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom, f.numero AS facture_numero
         FROM paiements p
         JOIN eleves e ON e.id = p.eleve_id
         JOIN factures f ON f.id = p.facture_id
         ${where}
         ORDER BY p.date_paiement DESC, p.id DESC`
      )
      .all(...params);
    res.json(paiements);
  })
);

paiementsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { facture_id, montant, date_paiement, mode_paiement, notes } = req.body || {};
    if (!facture_id || !montant || Number(montant) <= 0) {
      throw new ApiError(400, "Facture et montant (positif) sont requis.");
    }
    const facture = db.prepare("SELECT * FROM factures WHERE id = ?").get(facture_id);
    if (!facture) throw new ApiError(404, "Facture introuvable.");

    const total = totalFacture(facture_id);
    const dejaPaye = totalPaiements(facture_id);
    if (dejaPaye + Number(montant) > total + 0.01) {
      throw new ApiError(400, `Le montant dépasse le reste dû (${(total - dejaPaye).toFixed(0)} FCFA).`);
    }

    const info = db
      .prepare(
        `INSERT INTO paiements (facture_id, eleve_id, montant, date_paiement, mode_paiement, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        facture_id,
        facture.eleve_id,
        Number(montant),
        date_paiement || todayISO(),
        mode_paiement || "especes",
        notes || null
      );

    const statutFacture = recalculerStatutFacture(facture_id);
    res.status(201).json({
      ...db.prepare("SELECT * FROM paiements WHERE id = ?").get(info.lastInsertRowid),
      facture: statutFacture,
    });
  })
);

paiementsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const paiement = db.prepare("SELECT * FROM paiements WHERE id = ?").get(req.params.id);
    if (!paiement) throw new ApiError(404, "Paiement introuvable.");
    db.prepare("DELETE FROM paiements WHERE id = ?").run(req.params.id);
    recalculerStatutFacture(paiement.facture_id);
    res.json({ ok: true });
  })
);

export const impayesRouter = Router();

impayesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clauses = ["f.statut != 'payee'"];
    const params = [];
    if (req.query.classe_id) {
      clauses.push("e.classe_id = ?");
      params.push(req.query.classe_id);
    }
    if (req.query.recherche) {
      clauses.push("(e.nom LIKE ? OR e.prenom LIKE ?)");
      params.push(`%${req.query.recherche}%`, `%${req.query.recherche}%`);
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    const triAutorise = { eleve: "e.nom", classe: "c.nom", reste: "reste_du", date: "f.date_emission" };
    const triChamp = triAutorise[req.query.tri] || "reste_du";
    const triOrdre = req.query.ordre === "asc" ? "ASC" : "DESC";

    const impayes = db
      .prepare(
        `SELECT f.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom, c.nom AS classe_nom,
                (SELECT COALESCE(SUM(montant),0) FROM facture_lignes WHERE facture_id = f.id) AS total,
                (SELECT COALESCE(SUM(montant),0) FROM paiements WHERE facture_id = f.id) AS total_paye,
                ((SELECT COALESCE(SUM(montant),0) FROM facture_lignes WHERE facture_id = f.id) -
                 (SELECT COALESCE(SUM(montant),0) FROM paiements WHERE facture_id = f.id)) AS reste_du
         FROM factures f
         JOIN eleves e ON e.id = f.eleve_id
         LEFT JOIN classes c ON c.id = e.classe_id
         ${where}
         ORDER BY ${triChamp} ${triOrdre}`
      )
      .all(...params);
    res.json(impayes);
  })
);
