import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "migrations");

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    nom TEXT PRIMARY KEY,
    appliquee_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const applied = new Set(
  db.prepare("SELECT nom FROM _migrations").all().map((r) => r.nom)
);

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  console.log(`Application de la migration : ${file}`);
  db.exec(sql);
  db.prepare("INSERT INTO _migrations (nom) VALUES (?)").run(file);
}

console.log("Migrations terminées.");
