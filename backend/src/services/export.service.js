import PDFDocument from "pdfkit";

function escapeCsv(valeur) {
  if (valeur === null || valeur === undefined) return "";
  const str = String(valeur);
  if (/[",;\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function versCsv(colonnes, lignes) {
  const entete = colonnes.map((c) => escapeCsv(c.libelle)).join(";");
  const corps = lignes
    .map((ligne) => colonnes.map((c) => escapeCsv(c.valeur(ligne))).join(";"))
    .join("\n");
  return "﻿" + entete + "\n" + corps;
}

export function envoyerCsv(res, nomFichier, colonnes, lignes) {
  const csv = versCsv(colonnes, lignes);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nomFichier}"`);
  res.send(csv);
}

export function envoyerPdfTableau(res, nomFichier, titre, colonnes, lignes) {
  const doc = new PDFDocument({ margin: 40, layout: "landscape" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${nomFichier}"`);
  doc.pipe(res);

  doc.fontSize(14).text(titre, { align: "center" });
  doc.moveDown(1);

  const largeurPage = doc.page.width - 80;
  const largeurColonne = largeurPage / colonnes.length;

  let y = doc.y;
  doc.fontSize(9).font("Helvetica-Bold");
  colonnes.forEach((c, i) => {
    doc.text(c.libelle, 40 + i * largeurColonne, y, { width: largeurColonne });
  });
  doc.moveDown(0.5);
  doc.font("Helvetica");

  lignes.forEach((ligne) => {
    if (doc.y > doc.page.height - 60) {
      doc.addPage({ layout: "landscape", margin: 40 });
      doc.fontSize(9).font("Helvetica-Bold");
      colonnes.forEach((c, i) => {
        doc.text(c.libelle, 40 + i * largeurColonne, doc.y, { width: largeurColonne });
      });
      doc.moveDown(0.5);
      doc.font("Helvetica");
    }
    const yLigne = doc.y;
    colonnes.forEach((c, i) => {
      doc.text(String(c.valeur(ligne) ?? ""), 40 + i * largeurColonne, yLigne, { width: largeurColonne });
    });
    doc.moveDown(0.3);
  });

  doc.end();
}
