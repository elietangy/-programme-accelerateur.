// =====================================================================
// AJOUTER MA CLÉ HIGGSFIELD (outil pour débutant)
// Tu cliques sur « Copy API key » sur la page Higgsfield (ou « Copy the
// setup prompt »), tu lances ajouter-ma-cle.bat, et ce programme :
//   1. lit ce que tu as copié (sur TON ordinateur seulement),
//   2. y trouve ton identifiant et ton secret,
//   3. les écrit dans le fichier .env,
//   4. n'affiche JAMAIS la clé en entier et ne l'envoie nulle part.
// =====================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV = process.env.FICHIER_ENV || path.join(__dirname, '.env');
const MODELE = path.join(__dirname, '.env.example');

function lireTexteCopie() {
  if (process.argv.includes('--stdin')) return fs.readFileSync(0, 'utf8'); // pour les tests
  try { return execSync('powershell -NoProfile -Command "Get-Clipboard -Raw"', { encoding: 'utf8', timeout: 15000 }); }
  catch (e) { return ''; }
}

// Refuse les textes d'exemple (YOUR_KEY_ID, <secret>, XXXX…) et les valeurs trop courtes
function plausible(id, secret) {
  const mauvais = /your|key_?id|key_?secret|secret_here|example|exemple|xxxx|colle-ici|<|>|\*\*\*|\.\.\./i;
  return !!id && !!secret && id.length >= 8 && secret.length >= 8 && !/\s/.test(id + secret) && !mauvais.test(id) && !mauvais.test(secret);
}

// Cas simple : tu as cliqué sur « Copy API key » → le texte copié est la clé seule, de la forme IDENTIFIANT:SECRET
function cleSeule(t) {
  const x = t.trim();
  if (!x || /\s/.test(x) || x.length > 400) return null;
  const morceaux = x.split(':');
  if (morceaux.length !== 2) return null;
  const sobre = /^[A-Za-z0-9_\-.~+\/]+={0,2}$/;   // lettres, chiffres et quelques signes : pas de « = » au milieu (sinon c'est une ligne de réglage)
  if (!sobre.test(morceaux[0]) || !sobre.test(morceaux[1])) return null;
  return plausible(morceaux[0], morceaux[1]) ? [morceaux[0], morceaux[1]] : null;
}
const ressembleAUneCleSansDeuxPoints = (t) => { const x = t.trim(); return x.length >= 16 && x.length <= 400 && !/\s/.test(x) && !x.includes(':') && /^[A-Za-z0-9_\-.=]+$/.test(x); };

function trouverCle(t) {
  const direct = cleSeule(t);
  if (direct) return direct;
  const V = '([^\\s"\'`:;,]+)';          // une valeur sans espace ni guillemet ni deux-points
  const paire = (re) => { const m = t.match(re); return m && plausible(m[1], m[2]) ? [m[1], m[2]] : null; };
  const essais = [
    () => paire(new RegExp('HF_CREDENTIALS\\s*[=:]\\s*["\'`]?' + V + ':' + V)),
    () => paire(new RegExp('HF_KEY\\s*[=:]\\s*["\'`]?' + V + ':' + V)),
    () => paire(new RegExp('Authorization:\\s*Key\\s+' + V + ':' + V, 'i')),
    () => paire(new RegExp('credentials\\s*:\\s*["\'`]' + V + ':' + V, 'i')),
    () => {
      const id = t.match(/HF_API_KEY\s*[=:]\s*["'`]?([^\s"'`;,]+)/), sec = t.match(/HF_API_SECRET\s*[=:]\s*["'`]?([^\s"'`;,]+)/);
      return id && sec && plausible(id[1], sec[1]) ? [id[1], sec[1]] : null;
    },
    () => { // dernier recours : un seul couple IDENTIFIANT:SECRET long dans tout le texte
      const trouves = new Set();
      for (const m of t.matchAll(/(?<![\w:\/.\-])([A-Za-z0-9_\-]{16,}):([A-Za-z0-9_\-]{16,})(?![\w:\/.\-])/g)) if (plausible(m[1], m[2])) trouves.add(m[1] + ':' + m[2]);
      if (trouves.size !== 1) return null;
      const [a, b] = [...trouves][0].split(':'); return [a, b];
    }
  ];
  for (const e of essais) { const r = e(); if (r) return r; }
  return null;
}

function ecrireEnv(id, secret) {
  let texte = fs.existsSync(ENV) ? fs.readFileSync(ENV, 'utf8') : (fs.existsSync(MODELE) ? fs.readFileSync(MODELE, 'utf8') : '');
  const eol = texte.includes('\r\n') ? '\r\n' : '\n';
  const mettre = (nom, valeur) => {
    const re = new RegExp('^[ \\t]*' + nom + '[ \\t]*=[^\\r\\n]*', 'm');   // une seule ligne, sans toucher aux retours à la ligne
    texte = re.test(texte) ? texte.replace(re, () => nom + '=' + valeur) : texte + (texte && !texte.endsWith('\n') ? eol : '') + nom + '=' + valeur + eol;
  };
  mettre('HIGGSFIELD_KEY_ID', id);
  mettre('HIGGSFIELD_KEY_SECRET', secret);
  fs.writeFileSync(ENV, texte);
}

const masque = (s) => s.slice(0, 4) + '…  (' + s.length + ' caractères)';

const texte = lireTexteCopie();
console.log('');
if (!texte.trim()) {
  console.log("Je n'ai rien trouvé dans ce que tu as copié.");
  console.log("Retourne sur la page Higgsfield, clique sur « Copy API key », puis relance ce programme.");
  process.exit(1);
}
const cle = trouverCle(texte);
if (!cle && ressembleAUneCleSansDeuxPoints(texte)) {
  console.log("Ce que tu as copié ressemble à une clé, mais en UNE seule partie (sans « : » au milieu).");
  console.log("Je n'écris rien dans .env pour ne pas me tromper. Dis-moi seulement : « clé en une partie ». Ne m'envoie pas la clé.");
  process.exit(1);
}
if (!cle) {
  console.log("Je n'ai pas trouvé de clé dans ce que tu as copié.");
  console.log("Vérifie que tu as bien cliqué sur « Copy API key » juste avant (sans copier autre chose entre-temps).");
  console.log("Si le problème continue, dis-moi seulement : « clé non trouvée ». Ne m'envoie pas ce que tu as copié.");
  process.exit(1);
}
ecrireEnv(cle[0], cle[1]);
console.log('✅ Ta clé est enregistrée dans le fichier .env :');
console.log('   Identifiant : ' + masque(cle[0]));
console.log('   Secret      : •••• (' + cle[1].length + ' caractères)');
console.log('');
console.log("Étape suivante : ferme la fenêtre noire du serveur s'il tourne, puis relance demarrer.bat.");
console.log('Garde MODE_SIMULATION=1 pour l\'instant (aucun coût).');
