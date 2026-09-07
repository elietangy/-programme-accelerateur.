import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { db } from "./db/connection.js";

const CLASSES = ["Maternelle 1", "Maternelle 2", "CI", "CP", "CE1", "CE2", "CM1", "CM2"];

const TYPES_FRAIS = [
  "Réinscription",
  "Inscription",
  "Assurance",
  "Santé",
  "Sport",
  "Tenue scolaire",
  "Kit scolaire",
  "Autres frais",
];

const CATEGORIES_DEPENSES = [
  "Matériel et mobilier",
  "Salubrité et travaux",
  "Frais de roulement",
  "Livres",
  "Divers",
];

async function obtenirIdentifiants() {
  // Priorité aux variables d'environnement (déploiement non interactif : Railway, CI, etc.)
  if (process.env.ADMIN_IDENTIFIANT && process.env.ADMIN_MOT_DE_PASSE) {
    return { identifiant: process.env.ADMIN_IDENTIFIANT, motDePasse: process.env.ADMIN_MOT_DE_PASSE };
  }
  if (!process.stdin.isTTY) {
    throw new Error(
      "Aucun terminal interactif détecté. Définissez ADMIN_IDENTIFIANT et ADMIN_MOT_DE_PASSE dans l'environnement avant d'exécuter 'npm run seed'."
    );
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const identifiant = (await rl.question("Identifiant du compte secrétaire-comptable [admin] : ")) || "admin";
  let motDePasse = await rl.question("Mot de passe (min. 8 caractères) : ");
  while (!motDePasse || motDePasse.length < 8) {
    motDePasse = await rl.question("Mot de passe trop court, réessayez (min. 8 caractères) : ");
  }
  rl.close();
  return { identifiant, motDePasse };
}

async function seed() {
  const nbUtilisateurs = db.prepare("SELECT COUNT(*) AS n FROM utilisateur").get().n;
  if (nbUtilisateurs === 0) {
    const { identifiant, motDePasse } = await obtenirIdentifiants();
    if (!motDePasse || motDePasse.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }
    const hash = await bcrypt.hash(motDePasse, 12);
    db.prepare("INSERT INTO utilisateur (identifiant, mot_de_passe_hash) VALUES (?, ?)").run(identifiant, hash);
    console.log(`Compte créé pour "${identifiant}".`);
  } else {
    console.log("Un compte utilisateur existe déjà, aucune création.");
  }

  const insererClasse = db.prepare(
    "INSERT OR IGNORE INTO classes (nom, ordre_affichage) VALUES (?, ?)"
  );
  CLASSES.forEach((nom, i) => insererClasse.run(nom, i));

  const insererTypeFrais = db.prepare("INSERT OR IGNORE INTO types_frais (nom) VALUES (?)");
  TYPES_FRAIS.forEach((nom) => insererTypeFrais.run(nom));

  const insererCategorie = db.prepare("INSERT OR IGNORE INTO categories_depenses (nom) VALUES (?)");
  CATEGORIES_DEPENSES.forEach((nom) => insererCategorie.run(nom));

  const anneeExistante = db.prepare("SELECT id FROM annees_scolaires WHERE active = 1").get();
  let anneeId = anneeExistante?.id;
  if (!anneeExistante) {
    const now = new Date();
    const anneeDebut = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const libelle = `${anneeDebut}-${anneeDebut + 1}`;
    const info = db
      .prepare(
        "INSERT OR IGNORE INTO annees_scolaires (libelle, date_debut, date_fin, active) VALUES (?, ?, ?, 1)"
      )
      .run(libelle, `${anneeDebut}-09-01`, `${anneeDebut + 1}-08-31`);
    anneeId = info.lastInsertRowid;
    console.log(`Année scolaire ${libelle} créée et activée.`);
  }

  const parametres = db.prepare("SELECT id FROM parametres_ecole WHERE id = 1").get();
  if (!parametres) {
    db.prepare(
      "INSERT INTO parametres_ecole (id, nom_ecole, annee_scolaire_active_id) VALUES (1, ?, ?)"
    ).run("École Maternelle et Primaire Publique", anneeId);
  }

  console.log("Données de référence initialisées (classes, types de frais, catégories de dépenses).");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
