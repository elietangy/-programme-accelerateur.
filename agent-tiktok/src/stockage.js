// Petit stockage en fichiers JSON (aucune base de données à installer).
'use strict';
const fs = require('fs');
const path = require('path');

function creerStockage(dossier) {
  fs.mkdirSync(dossier, { recursive: true });
  const f = nom => path.join(dossier, nom);
  return {
    dossier,
    chemin: f,
    lire(nom, defaut) { try { return JSON.parse(fs.readFileSync(f(nom), 'utf8')); } catch (e) { return defaut; } },
    ecrire(nom, data) { const tmp = f(nom) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, f(nom)); },
    journal(evenement) { fs.appendFileSync(f('journal.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...evenement }) + '\n'); }
  };
}

module.exports = { creerStockage };
