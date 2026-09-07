import PDFDocument from "pdfkit";
import { isoToFr } from "../utils/dateFr.js";
import { formatFCFA } from "../utils/montant.js";

function enTete(doc, parametres, titre) {
  doc.fontSize(16).text(parametres?.nom_ecole || "École Maternelle et Primaire Publique", { align: "center" });
  if (parametres?.adresse) doc.fontSize(10).text(parametres.adresse, { align: "center" });
  if (parametres?.telephone) doc.fontSize(10).text(`Tél : ${parametres.telephone}`, { align: "center" });
  doc.moveDown(1);
  doc.fontSize(14).text(titre, { align: "center", underline: true });
  doc.moveDown(1);
}

export function genererRecuFacturePdf(res, { facture, lignes, paiements, eleve, classeNom, parametres }) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="recu-${facture.numero}.pdf"`);
  doc.pipe(res);

  enTete(doc, parametres, "Reçu de paiement / Facture");

  doc.fontSize(11);
  doc.text(`N° facture : ${facture.numero}`);
  doc.text(`Date d'émission : ${isoToFr(facture.date_emission)}`);
  doc.text(`Élève : ${eleve.nom} ${eleve.prenom || ""}`.trim());
  doc.text(`Classe : ${classeNom || "-"}`);
  doc.moveDown(1);

  doc.fontSize(12).text("Détail des frais", { underline: true });
  doc.moveDown(0.5);
  let total = 0;
  lignes.forEach((l) => {
    doc.fontSize(10).text(`${l.libelle}`, { continued: true }).text(`${formatFCFA(l.montant)}`, { align: "right" });
    total += l.montant;
  });
  doc.moveDown(0.3);
  doc.fontSize(11).text(`Total facturé :`, { continued: true }).text(`${formatFCFA(total)}`, { align: "right" });

  const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
  doc.moveDown(1);
  doc.fontSize(12).text("Paiements enregistrés", { underline: true });
  doc.moveDown(0.5);
  if (paiements.length === 0) {
    doc.fontSize(10).text("Aucun paiement enregistré.");
  } else {
    paiements.forEach((p) => {
      doc
        .fontSize(10)
        .text(`${isoToFr(p.date_paiement)} — ${p.mode_paiement}`, { continued: true })
        .text(`${formatFCFA(p.montant)}`, { align: "right" });
    });
  }

  doc.moveDown(1);
  doc.fontSize(11).text(`Total encaissé :`, { continued: true }).text(`${formatFCFA(totalPaye)}`, { align: "right" });
  doc.fontSize(11).text(`Reste dû :`, { continued: true }).text(`${formatFCFA(total - totalPaye)}`, { align: "right" });

  doc.moveDown(2);
  doc.fontSize(9).fillColor("gray").text(`Document généré le ${isoToFr(new Date().toISOString())}`, { align: "right" });

  doc.end();
}

export function genererRapportPdf(res, { rapport, paiements, depenses, parametres }) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="rapport-${rapport.date}.pdf"`);
  doc.pipe(res);

  enTete(doc, parametres, `Rapport d'activité journalière — ${isoToFr(rapport.date)}`);

  doc.fontSize(11);
  doc.text(`Recettes du jour :`, { continued: true }).text(`${formatFCFA(rapport.recettes_total)}`, { align: "right" });
  doc.text(`Dépenses du jour :`, { continued: true }).text(`${formatFCFA(rapport.depenses_total)}`, { align: "right" });
  doc.fontSize(12).text(`Solde du jour :`, { continued: true }).text(`${formatFCFA(rapport.solde)}`, { align: "right" });

  doc.moveDown(1);
  doc.fontSize(12).text("Paiements reçus", { underline: true });
  doc.moveDown(0.5);
  if (paiements.length === 0) {
    doc.fontSize(10).text("Aucun paiement ce jour.");
  } else {
    paiements.forEach((p) => {
      doc
        .fontSize(10)
        .text(`${p.eleve_nom || ""} — ${p.mode_paiement}`, { continued: true })
        .text(`${formatFCFA(p.montant)}`, { align: "right" });
    });
  }

  doc.moveDown(1);
  doc.fontSize(12).text("Dépenses", { underline: true });
  doc.moveDown(0.5);
  if (depenses.length === 0) {
    doc.fontSize(10).text("Aucune dépense ce jour.");
  } else {
    depenses.forEach((d) => {
      doc
        .fontSize(10)
        .text(`${d.libelle} (${d.categorie_nom || "-"})`, { continued: true })
        .text(`${formatFCFA(d.montant)}`, { align: "right" });
    });
  }

  if (rapport.notes) {
    doc.moveDown(1);
    doc.fontSize(12).text("Notes / observations", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(rapport.notes);
  }

  doc.end();
}
