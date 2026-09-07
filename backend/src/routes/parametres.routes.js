import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const parametresRouter = Router();

parametresRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parametres = db
      .prepare(
        `SELECT p.*, a.libelle AS annee_scolaire_active_libelle
         FROM parametres_ecole p
         LEFT JOIN annees_scolaires a ON a.id = p.annee_scolaire_active_id
         WHERE p.id = 1`
      )
      .get();
    res.json(parametres || {});
  })
);

parametresRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const { nom_ecole, adresse, telephone } = req.body || {};
    db.prepare(
      "UPDATE parametres_ecole SET nom_ecole = ?, adresse = ?, telephone = ? WHERE id = 1"
    ).run(nom_ecole, adresse || null, telephone || null);
    res.json(db.prepare("SELECT * FROM parametres_ecole WHERE id = 1").get());
  })
);
