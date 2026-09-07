import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";

export const typesFraisRouter = Router();

typesFraisRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(db.prepare("SELECT * FROM types_frais ORDER BY nom ASC").all());
  })
);

typesFraisRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { nom } = req.body || {};
    if (!nom || !nom.trim()) throw new ApiError(400, "Le nom du type de frais est requis.");
    const info = db.prepare("INSERT INTO types_frais (nom) VALUES (?)").run(nom.trim());
    res.status(201).json(db.prepare("SELECT * FROM types_frais WHERE id = ?").get(info.lastInsertRowid));
  })
);

typesFraisRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existant = db.prepare("SELECT * FROM types_frais WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Type de frais introuvable.");
    const { nom, actif } = req.body || {};
    db.prepare("UPDATE types_frais SET nom = ?, actif = ? WHERE id = ?").run(
      nom?.trim() || existant.nom,
      actif !== undefined ? Number(Boolean(actif)) : existant.actif,
      req.params.id
    );
    res.json(db.prepare("SELECT * FROM types_frais WHERE id = ?").get(req.params.id));
  })
);

typesFraisRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const enUsage = db.prepare("SELECT COUNT(*) AS n FROM facture_lignes WHERE type_frais_id = ?").get(req.params.id).n;
    if (enUsage > 0) {
      db.prepare("UPDATE types_frais SET actif = 0 WHERE id = ?").run(req.params.id);
      return res.json({ ok: true, desactive: true });
    }
    db.prepare("DELETE FROM types_frais WHERE id = ?").run(req.params.id);
    res.json({ ok: true, supprime: true });
  })
);
