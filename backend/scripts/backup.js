// Sauvegarde le fichier SQLite et le dossier des justificatifs dans une archive datée.
// Usage : npm run backup
// Recommandation : exécuter ce script régulièrement (ex. tâche planifiée quotidienne)
// et copier le contenu de backend/backups/ vers un espace de stockage externe
// (clé USB, service cloud, etc.), car le disque du serveur n'est pas une sauvegarde en soi.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DB_DIR || path.resolve(__dirname, "../data");
const backupsDir = path.resolve(__dirname, "../backups");

fs.mkdirSync(backupsDir, { recursive: true });

const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
const nomArchive = `sauvegarde-${horodatage}.zip`;
const cheminArchive = path.join(backupsDir, nomArchive);

try {
  execFileSync("zip", ["-r", cheminArchive, "."], { cwd: dataDir, stdio: "inherit" });
  console.log(`Sauvegarde créée : ${cheminArchive}`);
} catch (e) {
  console.error("Échec de la sauvegarde (l'utilitaire 'zip' est-il installé sur le serveur ?)", e.message);
  process.exit(1);
}
