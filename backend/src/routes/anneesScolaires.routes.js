import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";

export const anneesScolairesRouter = Router();

anneesScolairesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(db.prepare("SELECT * FROM annees_scolaires ORDER BY libelle DESC").all());
  })
);

anneesScolairesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { libelle, date_debut, date_fin } = req.body || {};
    if (!libelle || !libelle.trim()) throw new ApiError(400, "Le libellé de l'année scolaire est requis.");
    const info = db
      .prepare("INSERT INTO annees_scolaires (libelle, date_debut, date_fin) VALUES (?, ?, ?)")
      .run(libelle.trim(), date_debut || null, date_fin || null);
    res.status(201).json(db.prepare("SELECT * FROM annees_scolaires WHERE id = ?").get(info.lastInsertRowid));
  })
);

anneesScolairesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existant = db.prepare("SELECT * FROM annees_scolaires WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Année scolaire introuvable.");
    const { libelle, date_debut, date_fin } = req.body || {};
    db.prepare(
      "UPDATE annees_scolaires SET libelle = ?, date_debut = ?, date_fin = ? WHERE id = ?"
    ).run(libelle?.trim() || existant.libelle, date_debut ?? existant.date_debut, date_fin ?? existant.date_fin, req.params.id);
    res.json(db.prepare("SELECT * FROM annees_scolaires WHERE id = ?").get(req.params.id));
  })
);

anneesScolairesRouter.post(
  "/:id/activer",
  asyncHandler(async (req, res) => {
    const existant = db.prepare("SELECT * FROM annees_scolaires WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Année scolaire introuvable.");
    db.prepare("UPDATE annees_scolaires SET active = 0").run();
    db.prepare("UPDATE annees_scolaires SET active = 1 WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE parametres_ecole SET annee_scolaire_active_id = ? WHERE id = 1").run(req.params.id);
    res.json({ ok: true });
  })
);
