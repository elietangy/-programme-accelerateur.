// =====================================================================
// SERVEUR VIDÉO (tourne sur TON ordinateur uniquement)
// - Garde ta clé Higgsfield secrète (lue dans le fichier .env, jamais affichée).
// - Applique tes plafonds de crédits.
// - Ne lance une génération que si la page envoie « confirme: true ».
// - Ne relance JAMAIS automatiquement une génération qui échoue.
// - Ne publie rien nulle part.
// Aucune installation à faire : il suffit de Node.js (version 18 ou plus).
// =====================================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

// ---------- Lecture du fichier .env (sans bibliothèque) ----------
function chargerEnv(fichier) {
  if (!fs.existsSync(fichier)) return;
  for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    if (ligne.trim().startsWith('#')) continue;
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
chargerEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const HOTE = '127.0.0.1'; // écoute seulement sur ton ordinateur : personne d'autre ne peut s'y connecter
const BASE = (process.env.HIGGSFIELD_BASE_URL || 'https://api.higgsfield.ai').replace(/\/+$/, '');
const KEY_ID = (process.env.HIGGSFIELD_KEY_ID || '').trim();
const KEY_SECRET = (process.env.HIGGSFIELD_KEY_SECRET || '').trim();
const cleExemple = v => !v || v.startsWith('colle-ici');
const CLE_OK = !cleExemple(KEY_ID) && !cleExemple(KEY_SECRET);
const SIMULATION = process.env.MODE_SIMULATION === '1';
const MAX_JOUR = Number(process.env.MAX_VIDEOS_PAR_JOUR || 3);
const MAX_SESSION = Number(process.env.MAX_VIDEOS_PAR_SESSION || 2);
const DELAI_MS = 30000;
const REGLAGE = process.env.HIGGSFIELD_REGLAGE || path.join(__dirname, 'higgsfield-reglage.json');
const DOSSIER_DONNEES = path.join(__dirname, 'donnees');
const DOSSIER_VIDEOS = path.join(__dirname, 'videos');
const RACINE_SITE = path.join(__dirname, '..');
fs.mkdirSync(DOSSIER_DONNEES, { recursive: true });
fs.mkdirSync(DOSSIER_VIDEOS, { recursive: true });

let compteSession = 0;

// ---------- Petits outils ----------
const erreur = (code, message) => Object.assign(new Error(message), { code });
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function lireJson(fichier, defaut) { try { return JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch (e) { return defaut; } }
function ecrireJson(fichier, data) { fs.writeFileSync(fichier, JSON.stringify(data, null, 2)); }
const FICHIER_COMPTEUR = path.join(DOSSIER_DONNEES, 'compteur.json');
const FICHIER_GENERATIONS = path.join(DOSSIER_DONNEES, 'generations.json');

function compteJour() {
  const c = lireJson(FICHIER_COMPTEUR, {});
  return c.date === aujourdhui() ? Number(c.nombre || 0) : 0;
}
function ajouterAuCompte() {
  ecrireJson(FICHIER_COMPTEUR, { date: aujourdhui(), nombre: compteJour() + 1 });
  compteSession += 1;
}
const generations = () => lireJson(FICHIER_GENERATIONS, []);
function sauverGeneration(g) {
  const liste = generations(); const i = liste.findIndex(x => x.id === g.id);
  if (i >= 0) liste[i] = Object.assign(liste[i], g); else liste.push(g);
  ecrireJson(FICHIER_GENERATIONS, liste);
}

function reglage() {
  const r = lireJson(REGLAGE, {});
  const complet = typeof r.endpointModele === 'string' && r.endpointModele.startsWith('/') && r.corps && Object.keys(r.corps).length > 0;
  return { endpointModele: r.endpointModele, corps: r.corps || {}, complet };
}
function remplacer(valeur, vars) {
  if (typeof valeur === 'string') {
    const m = valeur.match(/^\{\{(\w+)\}\}$/);
    if (m && m[1] in vars) return vars[m[1]];
    return valeur.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : ''));
  }
  if (Array.isArray(valeur)) return valeur.map(v => remplacer(v, vars));
  if (valeur && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, remplacer(v, vars)]));
  return valeur;
}

// ---------- Appel à Higgsfield (jamais de nouvelle tentative automatique) ----------
async function appelHiggsfield(methode, chemin, corps) {
  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    const rep = await fetch(BASE + chemin, {
      method: methode,
      headers: { 'Authorization': 'Key ' + KEY_ID + ':' + KEY_SECRET, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: ctrl.signal
    });
    const texte = await rep.text();
    let json = null; try { json = JSON.parse(texte); } catch (e) { /* réponse non JSON */ }
    return { ok: rep.ok, statut: rep.status, json, texte };
  } catch (e) {
    if (e.name === 'AbortError') throw erreur(504, "Délai dépassé : Higgsfield n'a pas répondu en 30 secondes. Rien n'a été relancé. Vérifie ta connexion, puis décide si tu veux réessayer.");
    throw erreur(502, "Impossible de joindre Higgsfield. Vérifie ta connexion internet. Rien n'a été relancé.");
  } finally { clearTimeout(minuterie); }
}
function messageHiggsfield(r) {
  const extrait = (r.texte || '').replace(/\s+/g, ' ').slice(0, 300);
  if (r.statut === 401 || r.statut === 403) return "Higgsfield refuse ta clé (identifiant ou secret incorrect, ou clé désactivée). Vérifie ton fichier .env.";
  if (r.statut === 402 || /credit|balance|insufficient/i.test(extrait)) return "Crédits insuffisants sur ton compte Higgsfield. Recharge-les dans ta console, puis réessaie.";
  if (r.statut === 429) return "Trop de demandes envoyées à Higgsfield. Attends quelques minutes avant de réessayer.";
  if (r.statut === 404) return "Adresse introuvable chez Higgsfield : vérifie « endpointModele » dans higgsfield-reglage.json.";
  if (r.statut === 400 || r.statut === 422) return "Higgsfield a refusé la demande (réglage ou paramètres incorrects). Détail : " + extrait;
  if (r.statut >= 500) return "Higgsfield a un problème de son côté (erreur " + r.statut + "). Ne relance pas tout de suite. Détail : " + extrait;
  return "Réponse inattendue de Higgsfield (code " + r.statut + "). Détail : " + extrait;
}
// Cherche une adresse de vidéo dans la réponse (sans deviner le nom du champ)
function trouverUrlVideo(obj) {
  if (typeof obj === 'string') return /^https?:\/\/\S+/.test(obj) && /\.(mp4|mov|webm)(\?|$)/i.test(obj) ? obj : null;
  if (Array.isArray(obj)) { for (const v of obj) { const u = trouverUrlVideo(v); if (u) return u; } return null; }
  if (obj && typeof obj === 'object') { for (const v of Object.values(obj)) { const u = trouverUrlVideo(v); if (u) return u; } }
  return null;
}
const LIBELLES = { queued: 'en attente', in_progress: 'en cours', completed: 'terminée', failed: 'échouée', nsfw: 'refusée (contenu)' };

// ---------- Réponses HTTP ----------
function repondre(res, code, data) {
  const corps = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(corps);
}
function lireCorps(req) {
  return new Promise((ok, ko) => {
    let t = ''; req.on('data', c => { t += c; if (t.length > 100000) { ko(erreur(413, 'Demande trop grande.')); req.destroy(); } });
    req.on('end', () => { try { ok(t ? JSON.parse(t) : {}); } catch (e) { ko(erreur(400, 'Demande illisible.')); } });
  });
}

// ---------- Les 4 actions de l'API ----------
function etat() {
  const r = reglage();
  return {
    cleConfiguree: CLE_OK, simulation: SIMULATION, reglageComplet: r.complet,
    plafondJour: MAX_JOUR, restantJour: Math.max(0, MAX_JOUR - compteJour()),
    plafondSession: MAX_SESSION, restantSession: Math.max(0, MAX_SESSION - compteSession)
  };
}

async function generer(demande) {
  if (demande.confirme !== true) throw erreur(400, "Confirmation requise : la page doit demander ton accord avant chaque génération.");
  const prompt = typeof demande.prompt === 'string' ? demande.prompt.trim() : '';
  if (!prompt || prompt.length > 2000) throw erreur(400, "Le prompt est vide ou trop long (2000 caractères maximum).");
  const duree = Number(demande.duree);
  if (!(duree >= 1 && duree <= 60)) throw erreur(400, "La durée doit être comprise entre 1 et 60 secondes.");
  const format = typeof demande.format === 'string' && demande.format ? demande.format : '9:16';
  const e = etat();
  if (e.restantJour <= 0) throw erreur(429, "Plafond du jour atteint (" + MAX_JOUR + " vidéo(s)). Rien n'est lancé. Tu peux changer MAX_VIDEOS_PAR_JOUR dans .env.");
  if (e.restantSession <= 0) throw erreur(429, "Plafond de la session atteint (" + MAX_SESSION + " vidéo(s)). Redémarre le serveur pour une nouvelle session, si tu le décides.");

  const base = { hook: String(demande.hook || ''), segment: String(demande.segment || ''), prompt, duree, format, coutEstime: demande.coutEstime ?? null, creeLe: new Date().toISOString() };

  if (SIMULATION) {
    const id = 'simu-' + Date.now();
    sauverGeneration(Object.assign({ id, simulation: true, statut: 'queued' }, base));
    ajouterAuCompte();
    return { id, statut: 'queued', libelle: LIBELLES.queued, simulation: true };
  }
  if (!CLE_OK) throw erreur(503, "Aucune clé Higgsfield dans le fichier .env. Suis le guide LISEZ-MOI.md (étape « Mettre ta clé »).");
  const r = reglage();
  if (!r.complet) throw erreur(503, "Le réglage Higgsfield est incomplet (fichier higgsfield-reglage.json). Il faut y copier le chemin du modèle et les champs depuis la documentation officielle. Aucune demande n'a été envoyée.");

  const rep = await appelHiggsfield('POST', r.endpointModele, remplacer(r.corps, { prompt, duree, format }));
  if (!rep.ok) throw erreur(rep.statut >= 400 && rep.statut < 600 ? rep.statut : 502, messageHiggsfield(rep));
  const id = rep.json && (rep.json.request_id || rep.json.id);
  if (!id) throw erreur(502, "Higgsfield a répondu sans numéro de demande. Je ne peux pas suivre cette vidéo. Réponse : " + (rep.texte || '').slice(0, 300));
  ajouterAuCompte(); // on ne compte que les demandes acceptées
  sauverGeneration(Object.assign({ id, statut: 'queued' }, base));
  return { id, statut: 'queued', libelle: LIBELLES.queued };
}

async function statut(id) {
  if (!/^[\w.-]{1,100}$/.test(id)) throw erreur(400, "Numéro de demande invalide.");
  const g = generations().find(x => x.id === id);
  if (g && g.simulation) {
    const age = (Date.now() - Date.parse(g.creeLe)) / 1000;
    const s = age < 3 ? 'queued' : age < 6 ? 'in_progress' : 'completed';
    sauverGeneration({ id, statut: s });
    return { id, statut: s, libelle: LIBELLES[s], simulation: true, fichierDisponible: false, note: s === 'completed' ? "Simulation terminée : aucun vrai fichier n'est créé." : undefined };
  }
  if (!CLE_OK) throw erreur(503, "Aucune clé Higgsfield dans le fichier .env.");
  const rep = await appelHiggsfield('GET', '/requests/' + encodeURIComponent(id) + '/status');
  if (!rep.ok) throw erreur(rep.statut >= 400 && rep.statut < 600 ? rep.statut : 502, messageHiggsfield(rep));
  const s = String(rep.json && rep.json.status || 'inconnu');
  const url = s === 'completed' ? trouverUrlVideo(rep.json) : null;
  sauverGeneration({ id, statut: s, urlVideo: url || undefined });
  const out = { id, statut: s, libelle: LIBELLES[s] || s, fichierDisponible: !!url };
  if (s === 'completed' && !url) out.note = "Terminée, mais je n'ai pas trouvé l'adresse de la vidéo dans la réponse. Réponse brute : " + JSON.stringify(rep.json).slice(0, 500);
  if (s === 'failed' || s === 'nsfw') out.note = "La génération n'a pas abouti. Rien n'est relancé automatiquement : décide si tu veux réessayer.";
  return out;
}

async function telecharger(id, res) {
  if (!/^[\w.-]{1,100}$/.test(id)) throw erreur(400, "Numéro de demande invalide.");
  const g = generations().find(x => x.id === id);
  if (!g) throw erreur(404, "Cette génération est inconnue.");
  if (g.simulation) throw erreur(404, "C'est une simulation : il n'y a pas de vrai fichier.");
  const fichier = path.join(DOSSIER_VIDEOS, id + '.mp4');
  if (!fs.existsSync(fichier)) {
    if (!g.urlVideo) throw erreur(409, "La vidéo n'est pas encore prête (vérifie d'abord le statut).");
    const rep = await fetch(g.urlVideo);
    if (!rep.ok || !rep.body) throw erreur(502, "Impossible de récupérer le fichier vidéo (code " + rep.status + "). Les liens peuvent expirer : réessaie vite.");
    await pipeline(Readable.fromWeb(rep.body), fs.createWriteStream(fichier));
  }
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Disposition': 'attachment; filename="video-' + id + '.mp4"' });
  fs.createReadStream(fichier).pipe(res);
}

// ---------- Fichiers du site (pour ouvrir video.html depuis localhost) ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function servirSite(urlPath, res) {
  let rel; try { rel = decodeURIComponent(urlPath); } catch (e) { rel = ''; }
  if (rel === '/' || rel === '') rel = '/video.html';
  const morceaux = rel.split('/').filter(Boolean);
  const interdit = morceaux.some(m => m.startsWith('.') || m === 'serveur' || m === 'node_modules' || m === '..');
  const chemin = path.join(RACINE_SITE, ...morceaux);
  const type = TYPES[path.extname(chemin).toLowerCase()];
  if (interdit || !type || !chemin.startsWith(RACINE_SITE + path.sep) || !fs.existsSync(chemin) || !fs.statSync(chemin).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Introuvable');
  }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(chemin).pipe(res);
}

// ---------- Serveur ----------
const hotesAutorises = ['localhost:' + PORT, '127.0.0.1:' + PORT];
const serveur = http.createServer(async (req, res) => {
  try {
    // Protection : seules les pages ouvertes depuis localhost peuvent parler au serveur
    if (!hotesAutorises.includes((req.headers.host || '').toLowerCase())) { res.writeHead(403); return res.end('Interdit'); }
    const origine = req.headers.origin;
    if (req.method === 'POST' && origine && !hotesAutorises.map(h => 'http://' + h).includes(origine)) return repondre(res, 403, { erreur: "Origine refusée : ouvre la page depuis http://localhost:" + PORT + "/video.html" });

    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    if (req.method === 'GET' && p === '/api/etat') return repondre(res, 200, etat());
    if (req.method === 'POST' && p === '/api/generer') return repondre(res, 200, await generer(await lireCorps(req)));
    if (req.method === 'GET' && p === '/api/historique') return repondre(res, 200, generations().map(g => ({ id: g.id, hook: g.hook, segment: g.segment, statut: g.statut, creeLe: g.creeLe, simulation: !!g.simulation })));
    let m;
    if (req.method === 'GET' && (m = p.match(/^\/api\/statut\/(.+)$/))) return repondre(res, 200, await statut(m[1]));
    if (req.method === 'GET' && (m = p.match(/^\/api\/telecharger\/(.+)$/))) return await telecharger(m[1], res);
    if (p.startsWith('/api/')) return repondre(res, 404, { erreur: 'Action inconnue.' });
    if (req.method === 'GET') return servirSite(p, res);
    res.writeHead(405); res.end();
  } catch (e) {
    if (res.headersSent) return res.end();
    repondre(res, e.code && e.code >= 400 && e.code < 600 ? e.code : 500, { erreur: e.code ? e.message : "Erreur inattendue du serveur : " + e.message });
  }
});

serveur.listen(PORT, HOTE, () => {
  const e = etat();
  console.log('');
  console.log('Serveur vidéo prêt. Ouvre : http://localhost:' + PORT + '/video.html');
  console.log('Clé Higgsfield : ' + (CLE_OK ? 'trouvée dans .env' : 'ABSENTE (voir LISEZ-MOI.md)'));
  console.log('Mode : ' + (SIMULATION ? 'SIMULATION (aucun coût, aucun appel à Higgsfield)' : 'RÉEL (les générations consomment des crédits)'));
  console.log('Réglage Higgsfield : ' + (e.reglageComplet ? 'complet' : 'incomplet (higgsfield-reglage.json)'));
  console.log('Plafonds : ' + MAX_JOUR + ' par jour (restant : ' + e.restantJour + '), ' + MAX_SESSION + ' par session.');
  console.log('');
});
