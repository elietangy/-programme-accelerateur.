import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";

export const classesRouter = Router();

classesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const classes = db
      .prepare("SELECT * FROM classes ORDER BY ordre_affichage ASC, nom ASC")
      .all();
    res.json(classes);
  })
);

classesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { nom, niveau, ordre_affichage } = req.body || {};
    if (!nom || !nom.trim()) throw new ApiError(400, "Le nom de la classe est requis.");
    const info = db
      .prepare("INSERT INTO classes (nom, niveau, ordre_affichage) VALUES (?, ?, ?)")
      .run(nom.trim(), niveau || null, Number(ordre_affichage) || 0);
    const classe = db.prepare("SELECT * FROM classes WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(classe);
  })
);

classesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { nom, niveau, ordre_affichage, actif } = req.body || {};
    const existant = db.prepare("SELECT * FROM classes WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Classe introuvable.");
    db.prepare(
      "UPDATE classes SET nom = ?, niveau = ?, ordre_affichage = ?, actif = ? WHERE id = ?"
    ).run(
      nom?.trim() || existant.nom,
      niveau ?? existant.niveau,
      ordre_affichage !== undefined ? Number(ordre_affichage) : existant.ordre_affichage,
      actif !== undefined ? Number(Boolean(actif)) : existant.actif,
      req.params.id
    );
    res.json(db.prepare("SELECT * FROM classes WHERE id = ?").get(req.params.id));
  })
);

classesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const enUsage = db.prepare("SELECT COUNT(*) AS n FROM eleves WHERE classe_id = ?").get(req.params.id).n;
    if (enUsage > 0) {
      db.prepare("UPDATE classes SET actif = 0 WHERE id = ?").run(req.params.id);
      return res.json({ ok: true, desactivee: true });
    }
    db.prepare("DELETE FROM classes WHERE id = ?").run(req.params.id);
    res.json({ ok: true, supprimee: true });
  })
);
