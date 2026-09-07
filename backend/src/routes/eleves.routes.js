import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";

export const elevesRouter = Router();

function buildFiltre(query) {
  const clauses = [];
  const params = [];
  if (query.classe_id) {
    clauses.push("e.classe_id = ?");
    params.push(query.classe_id);
  }
  if (query.statut) {
    clauses.push("e.statut = ?");
    params.push(query.statut);
  }
  if (query.recherche) {
    clauses.push("(e.nom LIKE ? OR e.prenom LIKE ?)");
    params.push(`%${query.recherche}%`, `%${query.recherche}%`);
  }
  if (query.actif !== undefined) {
    clauses.push("e.actif = ?");
    params.push(Number(query.actif));
  } else {
    clauses.push("e.actif = 1");
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

elevesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { where, params } = buildFiltre(req.query);
    const eleves = db
      .prepare(
        `SELECT e.*, c.nom AS classe_nom
         FROM eleves e
         LEFT JOIN classes c ON c.id = e.classe_id
         ${where}
         ORDER BY e.nom ASC, e.prenom ASC`
      )
      .all(...params);
    res.json(eleves);
  })
);

elevesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const eleve = db
      .prepare(
        `SELECT e.*, c.nom AS classe_nom FROM eleves e LEFT JOIN classes c ON c.id = e.classe_id WHERE e.id = ?`
      )
      .get(req.params.id);
    if (!eleve) throw new ApiError(404, "Élève introuvable.");
    res.json(eleve);
  })
);

function champsEleve(body) {
  return {
    nom: body.nom?.trim(),
    prenom: body.prenom?.trim() || null,
    classe_id: body.classe_id || null,
    statut: body.statut === "Ancien" ? "Ancien" : "Nouveau",
    date_naissance: body.date_naissance || null,
    sexe: body.sexe || null,
    parent_nom: body.parent_nom || null,
    parent_telephone: body.parent_telephone || null,
    parent_email: body.parent_email || null,
    parent_adresse: body.parent_adresse || null,
  };
}

elevesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const c = champsEleve(req.body || {});
    if (!c.nom) throw new ApiError(400, "Le nom de l'élève est requis.");
    const info = db
      .prepare(
        `INSERT INTO eleves (nom, prenom, classe_id, statut, date_naissance, sexe, parent_nom, parent_telephone, parent_email, parent_adresse)
         VALUES (@nom, @prenom, @classe_id, @statut, @date_naissance, @sexe, @parent_nom, @parent_telephone, @parent_email, @parent_adresse)`
      )
      .run(c);
    res.status(201).json(db.prepare("SELECT * FROM eleves WHERE id = ?").get(info.lastInsertRowid));
  })
);

elevesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existant = db.prepare("SELECT * FROM eleves WHERE id = ?").get(req.params.id);
    if (!existant) throw new ApiError(404, "Élève introuvable.");
    const c = champsEleve({ ...existant, ...req.body });
    if (!c.nom) throw new ApiError(400, "Le nom de l'élève est requis.");
    db.prepare(
      `UPDATE eleves SET nom=@nom, prenom=@prenom, classe_id=@classe_id, statut=@statut,
       date_naissance=@date_naissance, sexe=@sexe, parent_nom=@parent_nom,
       parent_telephone=@parent_telephone, parent_email=@parent_email, parent_adresse=@parent_adresse
       WHERE id=@id`
    ).run({ ...c, id: req.params.id });
    res.json(db.prepare("SELECT * FROM eleves WHERE id = ?").get(req.params.id));
  })
);

elevesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const enUsage = db.prepare("SELECT COUNT(*) AS n FROM factures WHERE eleve_id = ?").get(req.params.id).n;
    if (enUsage > 0) {
      db.prepare("UPDATE eleves SET actif = 0 WHERE id = ?").run(req.params.id);
      return res.json({ ok: true, desactive: true });
    }
    db.prepare("DELETE FROM eleves WHERE id = ?").run(req.params.id);
    res.json({ ok: true, supprime: true });
  })
);
