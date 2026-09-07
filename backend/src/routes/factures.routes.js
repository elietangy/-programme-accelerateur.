import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/errorHandler.js";
import { genererNumeroFacture, recalculerStatutFacture, totalFacture, totalPaiements } from "../services/facture.service.js";
import { genererRecuFacturePdf } from "../services/pdf.service.js";
import { todayISO } from "../utils/dateFr.js";

export const facturesRouter = Router();

function creerFacturePourEleve({ eleve_id, annee_scolaire_id, date_emission, lignes }) {
  if (!lignes.length) throw new ApiError(400, "Au moins une ligne de frais est requise.");
  const numero = genererNumeroFacture();
  const info = db
    .prepare(
      "INSERT INTO factures (numero, eleve_id, annee_scolaire_id, date_emission) VALUES (?, ?, ?, ?)"
    )
    .run(numero, eleve_id, annee_scolaire_id, date_emission || todayISO());
  const factureId = info.lastInsertRowid;
  const insererLigne = db.prepare(
    "INSERT INTO facture_lignes (facture_id, type_frais_id, libelle, montant) VALUES (?, ?, ?, ?)"
  );
  for (const l of lignes) {
    insererLigne.run(factureId, l.type_frais_id || null, l.libelle, l.montant);
  }
  recalculerStatutFacture(factureId);
  return factureId;
}

// Génère une facture pour un élève à partir d'une liste de types de frais (montants pris dans les tarifs de l'année active)
facturesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { eleve_id, annee_scolaire_id, type_frais_ids, date_emission } = req.body || {};
    if (!eleve_id || !annee_scolaire_id || !Array.isArray(type_frais_ids) || type_frais_ids.length === 0) {
      throw new ApiError(400, "Élève, année scolaire et au moins un type de frais sont requis.");
    }
    const eleve = db.prepare("SELECT * FROM eleves WHERE id = ?").get(eleve_id);
    if (!eleve) throw new ApiError(404, "Élève introuvable.");

    const lignes = [];
    for (const typeFraisId of type_frais_ids) {
      const typeFrais = db.prepare("SELECT * FROM types_frais WHERE id = ?").get(typeFraisId);
      if (!typeFrais) continue;
      const tarif =
        db
          .prepare(
            "SELECT * FROM tarifs WHERE type_frais_id = ? AND annee_scolaire_id = ? AND classe_id = ?"
          )
          .get(typeFraisId, annee_scolaire_id, eleve.classe_id) ||
        db
          .prepare(
            "SELECT * FROM tarifs WHERE type_frais_id = ? AND annee_scolaire_id = ? AND classe_id IS NULL"
          )
          .get(typeFraisId, annee_scolaire_id);
      if (!tarif) {
        throw new ApiError(400, `Aucun tarif configuré pour "${typeFrais.nom}" sur cette année scolaire.`);
      }
      lignes.push({ type_frais_id: typeFraisId, libelle: typeFrais.nom, montant: tarif.montant });
    }

    const factureId = creerFacturePourEleve({ eleve_id, annee_scolaire_id, date_emission, lignes });
    res.status(201).json(db.prepare("SELECT * FROM factures WHERE id = ?").get(factureId));
  })
);

// Génération en masse pour une classe entière
facturesRouter.post(
  "/generer-classe",
  asyncHandler(async (req, res) => {
    const { classe_id, annee_scolaire_id, type_frais_ids, date_emission } = req.body || {};
    if (!classe_id || !annee_scolaire_id || !Array.isArray(type_frais_ids) || type_frais_ids.length === 0) {
      throw new ApiError(400, "Classe, année scolaire et au moins un type de frais sont requis.");
    }
    const eleves = db.prepare("SELECT * FROM eleves WHERE classe_id = ? AND actif = 1").all(classe_id);
    if (eleves.length === 0) throw new ApiError(400, "Aucun élève actif dans cette classe.");

    const facturesCreees = [];
    const erreurs = [];
    for (const eleve of eleves) {
      try {
        const lignes = [];
        for (const typeFraisId of type_frais_ids) {
          const typeFrais = db.prepare("SELECT * FROM types_frais WHERE id = ?").get(typeFraisId);
          if (!typeFrais) continue;
          const tarif =
            db
              .prepare(
                "SELECT * FROM tarifs WHERE type_frais_id = ? AND annee_scolaire_id = ? AND classe_id = ?"
              )
              .get(typeFraisId, annee_scolaire_id, classe_id) ||
            db
              .prepare(
                "SELECT * FROM tarifs WHERE type_frais_id = ? AND annee_scolaire_id = ? AND classe_id IS NULL"
              )
              .get(typeFraisId, annee_scolaire_id);
          if (!tarif) throw new ApiError(400, `Aucun tarif configuré pour "${typeFrais.nom}".`);
          lignes.push({ type_frais_id: typeFraisId, libelle: typeFrais.nom, montant: tarif.montant });
        }
        const factureId = creerFacturePourEleve({
          eleve_id: eleve.id,
          annee_scolaire_id,
          date_emission,
          lignes,
        });
        facturesCreees.push(factureId);
      } catch (e) {
        erreurs.push({ eleve: `${eleve.nom} ${eleve.prenom || ""}`.trim(), message: e.message });
      }
    }
    res.status(201).json({ nb_factures_creees: facturesCreees.length, erreurs });
  })
);

facturesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clauses = [];
    const params = [];
    if (req.query.classe_id) {
      clauses.push("e.classe_id = ?");
      params.push(req.query.classe_id);
    }
    if (req.query.annee_scolaire_id) {
      clauses.push("f.annee_scolaire_id = ?");
      params.push(req.query.annee_scolaire_id);
    }
    if (req.query.statut) {
      clauses.push("f.statut = ?");
      params.push(req.query.statut);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const factures = db
      .prepare(
        `SELECT f.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom, c.nom AS classe_nom,
                (SELECT COALESCE(SUM(montant),0) FROM facture_lignes WHERE facture_id = f.id) AS total,
                (SELECT COALESCE(SUM(montant),0) FROM paiements WHERE facture_id = f.id) AS total_paye
         FROM factures f
         JOIN eleves e ON e.id = f.eleve_id
         LEFT JOIN classes c ON c.id = e.classe_id
         ${where}
         ORDER BY f.date_emission DESC, f.id DESC`
      )
      .all(...params);

    const totalClasse = factures.reduce((s, f) => s + f.total, 0);
    res.json({ factures, total_classe: totalClasse });
  })
);

facturesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const facture = db
      .prepare(
        `SELECT f.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom, c.nom AS classe_nom
         FROM factures f JOIN eleves e ON e.id = f.eleve_id LEFT JOIN classes c ON c.id = e.classe_id
         WHERE f.id = ?`
      )
      .get(req.params.id);
    if (!facture) throw new ApiError(404, "Facture introuvable.");
    const lignes = db.prepare("SELECT * FROM facture_lignes WHERE facture_id = ?").all(req.params.id);
    const paiements = db
      .prepare("SELECT * FROM paiements WHERE facture_id = ? ORDER BY date_paiement ASC")
      .all(req.params.id);
    res.json({
      ...facture,
      lignes,
      paiements,
      total: totalFacture(req.params.id),
      total_paye: totalPaiements(req.params.id),
    });
  })
);

facturesRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const facture = db.prepare("SELECT * FROM factures WHERE id = ?").get(req.params.id);
    if (!facture) throw new ApiError(404, "Facture introuvable.");
    const eleve = db.prepare("SELECT * FROM eleves WHERE id = ?").get(facture.eleve_id);
    const classe = eleve.classe_id ? db.prepare("SELECT * FROM classes WHERE id = ?").get(eleve.classe_id) : null;
    const lignes = db.prepare("SELECT * FROM facture_lignes WHERE facture_id = ?").all(req.params.id);
    const paiements = db
      .prepare("SELECT * FROM paiements WHERE facture_id = ? ORDER BY date_paiement ASC")
      .all(req.params.id);
    const parametres = db.prepare("SELECT * FROM parametres_ecole WHERE id = 1").get();
    genererRecuFacturePdf(res, { facture, lignes, paiements, eleve, classeNom: classe?.nom, parametres });
  })
);

facturesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const paye = totalPaiements(req.params.id);
    if (paye > 0) throw new ApiError(400, "Impossible de supprimer une facture ayant des paiements enregistrés.");
    db.prepare("DELETE FROM factures WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  })
);
