import { Router } from "express";
import { db } from "../db/connection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { envoyerCsv, envoyerPdfTableau } from "../services/export.service.js";
import { isoToFr } from "../utils/dateFr.js";
import { formatFCFA } from "../utils/montant.js";

export const exportRouter = Router();

const jeuxDeDonnees = {
  eleves: () => ({
    titre: "Liste des élèves",
    lignes: db
      .prepare(
        `SELECT e.*, c.nom AS classe_nom FROM eleves e LEFT JOIN classes c ON c.id = e.classe_id WHERE e.actif = 1 ORDER BY e.nom`
      )
      .all(),
    colonnes: [
      { libelle: "Nom", valeur: (l) => l.nom },
      { libelle: "Prénom", valeur: (l) => l.prenom },
      { libelle: "Classe", valeur: (l) => l.classe_nom },
      { libelle: "Statut", valeur: (l) => l.statut },
      { libelle: "Parent/Tuteur", valeur: (l) => l.parent_nom },
      { libelle: "Téléphone parent", valeur: (l) => l.parent_telephone },
    ],
  }),
  factures: () => ({
    titre: "Liste des factures",
    lignes: db
      .prepare(
        `SELECT f.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom, c.nom AS classe_nom,
                (SELECT COALESCE(SUM(montant),0) FROM facture_lignes WHERE facture_id=f.id) AS total,
                (SELECT COALESCE(SUM(montant),0) FROM paiements WHERE facture_id=f.id) AS total_paye
         FROM factures f JOIN eleves e ON e.id=f.eleve_id LEFT JOIN classes c ON c.id=e.classe_id
         ORDER BY f.date_emission DESC`
      )
      .all(),
    colonnes: [
      { libelle: "N° facture", valeur: (l) => l.numero },
      { libelle: "Élève", valeur: (l) => `${l.eleve_nom} ${l.eleve_prenom || ""}`.trim() },
      { libelle: "Classe", valeur: (l) => l.classe_nom },
      { libelle: "Date", valeur: (l) => isoToFr(l.date_emission) },
      { libelle: "Total", valeur: (l) => formatFCFA(l.total) },
      { libelle: "Payé", valeur: (l) => formatFCFA(l.total_paye) },
      { libelle: "Reste dû", valeur: (l) => formatFCFA(l.total - l.total_paye) },
      { libelle: "Statut", valeur: (l) => l.statut },
    ],
  }),
  paiements: () => ({
    titre: "Liste des paiements",
    lignes: db
      .prepare(
        `SELECT p.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom, f.numero AS facture_numero
         FROM paiements p JOIN eleves e ON e.id=p.eleve_id JOIN factures f ON f.id=p.facture_id
         ORDER BY p.date_paiement DESC`
      )
      .all(),
    colonnes: [
      { libelle: "Date", valeur: (l) => isoToFr(l.date_paiement) },
      { libelle: "Élève", valeur: (l) => `${l.eleve_nom} ${l.eleve_prenom || ""}`.trim() },
      { libelle: "N° facture", valeur: (l) => l.facture_numero },
      { libelle: "Montant", valeur: (l) => formatFCFA(l.montant) },
      { libelle: "Mode", valeur: (l) => l.mode_paiement },
    ],
  }),
  depenses: () => ({
    titre: "Liste des dépenses",
    lignes: db
      .prepare(
        `SELECT d.*, c.nom AS categorie_nom FROM depenses d LEFT JOIN categories_depenses c ON c.id=d.categorie_id
         ORDER BY d.date_depense DESC`
      )
      .all(),
    colonnes: [
      { libelle: "Date", valeur: (l) => isoToFr(l.date_depense) },
      { libelle: "Catégorie", valeur: (l) => l.categorie_nom },
      { libelle: "Description", valeur: (l) => l.libelle },
      { libelle: "Montant", valeur: (l) => formatFCFA(l.montant) },
    ],
  }),
  rapports: () => ({
    titre: "Rapports journaliers archivés",
    lignes: db.prepare(`SELECT * FROM rapports_journaliers ORDER BY date DESC`).all(),
    colonnes: [
      { libelle: "Date", valeur: (l) => isoToFr(l.date) },
      { libelle: "Recettes", valeur: (l) => formatFCFA(l.recettes_total) },
      { libelle: "Dépenses", valeur: (l) => formatFCFA(l.depenses_total) },
      { libelle: "Solde", valeur: (l) => formatFCFA(l.solde) },
    ],
  }),
};

exportRouter.get(
  "/:entite.:format",
  asyncHandler(async (req, res) => {
    const { entite, format } = req.params;
    const generateur = jeuxDeDonnees[entite];
    if (!generateur) return res.status(404).json({ erreur: "Export inconnu." });
    const { titre, lignes, colonnes } = generateur();
    if (format === "csv") {
      return envoyerCsv(res, `${entite}.csv`, colonnes, lignes);
    }
    if (format === "pdf") {
      return envoyerPdfTableau(res, `${entite}.pdf`, titre, colonnes, lignes);
    }
    res.status(400).json({ erreur: "Format non supporté (csv ou pdf)." });
  })
);
