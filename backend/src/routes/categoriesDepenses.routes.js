import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";

export const categoriesDepensesRouter = Router();

categoriesDepensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(db.prepare("SELECT * FROM categories_depenses ORDER BY nom ASC").all());
  })
);

categoriesDepensesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { nom } = req.body || {};
    if (!nom || !nom.trim()) throw new ApiError(400, "Le nom de la catégorie est requis.");
    const info = db.prepare("INSERT INTO categories_depenses (nom) VALUES (?)").run(nom.trim());
    res.status(201).json(db.prepare("SELECT * FROM categories_depenses WHERE id = ?").get(info.lastInsertRowid));
  })
);

categoriesDepensesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existant = db.prepare("SELECT * FROM categories_depenses WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Catégorie introuvable.");
    const { nom, actif } = req.body || {};
    db.prepare("UPDATE categories_depenses SET nom = ?, actif = ? WHERE id = ?").run(
      nom?.trim() || existant.nom,
      actif !== undefined ? Number(Boolean(actif)) : existant.actif,
      req.params.id
    );
    res.json(db.prepare("SELECT * FROM categories_depenses WHERE id = ?").get(req.params.id));
  })
);

categoriesDepensesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const enUsage = db.prepare("SELECT COUNT(*) AS n FROM depenses WHERE categorie_id = ?").get(req.params.id).n;
    if (enUsage > 0) {
      db.prepare("UPDATE categories_depenses SET actif = 0 WHERE id = ?").run(req.params.id);
      return res.json({ ok: true, desactivee: true });
    }
    db.prepare("DELETE FROM categories_depenses WHERE id = ?").run(req.params.id);
    res.json({ ok: true, supprimee: true });
  })
);
