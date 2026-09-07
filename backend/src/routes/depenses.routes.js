import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { db, uploadsDir } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";
import { uploadJustificatif } from "../middleware/upload.js";

export const depensesRouter = Router();

depensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clauses = [];
    const params = [];
    if (req.query.categorie_id) {
      clauses.push("d.categorie_id = ?");
      params.push(req.query.categorie_id);
    }
    if (req.query.date_debut) {
      clauses.push("d.date_depense >= ?");
      params.push(req.query.date_debut);
    }
    if (req.query.date_fin) {
      clauses.push("d.date_depense <= ?");
      params.push(req.query.date_fin);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const depenses = db
      .prepare(
        `SELECT d.*, c.nom AS categorie_nom
         FROM depenses d
         LEFT JOIN categories_depenses c ON c.id = d.categorie_id
         ${where}
         ORDER BY d.date_depense DESC, d.id DESC`
      )
      .all(...params);
    res.json(depenses);
  })
);

depensesRouter.post(
  "/",
  (req, res, next) => uploadJustificatif(req, res, (err) => (err ? next(new ApiError(400, err.message)) : next())),
  asyncHandler(async (req, res) => {
    const { categorie_id, libelle, montant, date_depense, notes } = req.body || {};
    if (!libelle?.trim() || !montant || !date_depense) {
      throw new ApiError(400, "Description, montant et date sont requis.");
    }
    const justificatif_path = req.file ? req.file.filename : null;
    const info = db
      .prepare(
        `INSERT INTO depenses (categorie_id, libelle, montant, date_depense, justificatif_path, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(categorie_id || null, libelle.trim(), Number(montant), date_depense, justificatif_path, notes || null);
    res.status(201).json(db.prepare("SELECT * FROM depenses WHERE id = ?").get(info.lastInsertRowid));
  })
);

depensesRouter.get(
  "/:id/justificatif",
  asyncHandler(async (req, res) => {
    const depense = db.prepare("SELECT * FROM depenses WHERE id = ?").get(req.params.id);
    if (!depense?.justificatif_path) throw new ApiError(404, "Aucun justificatif pour cette dépense.");
    const filePath = path.join(uploadsDir, depense.justificatif_path);
    if (!fs.existsSync(filePath)) throw new ApiError(404, "Fichier introuvable.");
    res.sendFile(filePath);
  })
);

depensesRouter.put(
  "/:id",
  (req, res, next) => uploadJustificatif(req, res, (err) => (err ? next(new ApiError(400, err.message)) : next())),
  asyncHandler(async (req, res) => {
    const existant = db.prepare("SELECT * FROM depenses WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Dépense introuvable.");
    const { categorie_id, libelle, montant, date_depense, notes } = req.body || {};
    const justificatif_path = req.file ? req.file.filename : existant.justificatif_path;
    db.prepare(
      `UPDATE depenses SET categorie_id=?, libelle=?, montant=?, date_depense=?, justificatif_path=?, notes=? WHERE id=?`
    ).run(
      categorie_id ?? existant.categorie_id,
      libelle?.trim() || existant.libelle,
      montant !== undefined ? Number(montant) : existant.montant,
      date_depense || existant.date_depense,
      justificatif_path,
      notes ?? existant.notes,
      req.params.id
    );
    res.json(db.prepare("SELECT * FROM depenses WHERE id = ?").get(req.params.id));
  })
);

depensesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    db.prepare("DELETE FROM depenses WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  })
);
