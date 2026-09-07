import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";

export const tarifsRouter = Router();

tarifsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clauses = [];
    const params = [];
    if (req.query.annee_scolaire_id) {
      clauses.push("t.annee_scolaire_id = ?");
      params.push(req.query.annee_scolaire_id);
    }
    if (req.query.classe_id) {
      clauses.push("(t.classe_id = ? OR t.classe_id IS NULL)");
      params.push(req.query.classe_id);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const tarifs = db
      .prepare(
        `SELECT t.*, tf.nom AS type_frais_nom, c.nom AS classe_nom, a.libelle AS annee_libelle
         FROM tarifs t
         JOIN types_frais tf ON tf.id = t.type_frais_id
         LEFT JOIN classes c ON c.id = t.classe_id
         JOIN annees_scolaires a ON a.id = t.annee_scolaire_id
         ${where}
         ORDER BY tf.nom ASC`
      )
      .all(...params);
    res.json(tarifs);
  })
);

tarifsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { type_frais_id, annee_scolaire_id, classe_id, montant } = req.body || {};
    if (!type_frais_id || !annee_scolaire_id || montant === undefined) {
      throw new ApiError(400, "Type de frais, année scolaire et montant sont requis.");
    }
    try {
      const info = db
        .prepare(
          "INSERT INTO tarifs (type_frais_id, annee_scolaire_id, classe_id, montant) VALUES (?, ?, ?, ?)"
        )
        .run(type_frais_id, annee_scolaire_id, classe_id || null, Number(montant));
      res.status(201).json(db.prepare("SELECT * FROM tarifs WHERE id = ?").get(info.lastInsertRowid));
    } catch (e) {
      if (String(e.message).includes("UNIQUE")) {
        throw new ApiError(409, "Un tarif existe déjà pour ce type de frais / cette année / cette classe.");
      }
      throw e;
    }
  })
);

tarifsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existant = db.prepare("SELECT * FROM tarifs WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Tarif introuvable.");
    const { montant } = req.body || {};
    db.prepare("UPDATE tarifs SET montant = ? WHERE id = ?").run(
      montant !== undefined ? Number(montant) : existant.montant,
      req.params.id
    );
    res.json(db.prepare("SELECT * FROM tarifs WHERE id = ?").get(req.params.id));
  })
);

tarifsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    db.prepare("DELETE FROM tarifs WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  })
);
