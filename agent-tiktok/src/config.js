// Lecture des réglages (.env). Aucune clé n'est jamais affichée ni journalisée.
// SÉCURITÉ PAR DÉFAUT : sans « MODE_SIMULATION=0 » explicite, rien n'est dépensé ni publié.
'use strict';
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');

function chargerEnv(fichier, env = process.env) {
  if (!fs.existsSync(fichier)) return;
  for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    if (ligne.trim().startsWith('#')) continue;
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (env[m[1]] === undefined) env[m[1]] = v;
  }
}

function lireConfig(env = process.env, racine = RACINE) {
  const texte = (k, d = '') => (env[k] !== undefined && env[k] !== '' ? String(env[k]).trim() : d);
  const nombre = (k, d) => { const n = Number(texte(k, '')); return texte(k, '') !== '' && Number.isFinite(n) ? n : d; };
  const audite = texte('TIKTOK_AUDITE') === '1';
  return {
    racine,
    simulation: texte('MODE_SIMULATION', '1') !== '0',
    publication: texte('MODE_PUBLICATION', 'auto') === 'validation' ? 'validation' : 'auto',
    fuseau: texte('FUSEAU', 'Africa/Porto-Novo'),
    heures: texte('HEURES_PUBLICATION', '12:00,18:30').split(',').map(s => s.trim()).filter(Boolean),
    fenetreMin: nombre('FENETRE_RATTRAPAGE_MIN', 90),
    maxVideosJour: nombre('MAX_VIDEOS_PAR_JOUR', 2),
    maxDepenseJourUsd: nombre('MAX_DEPENSE_PAR_JOUR_USD', 5),
    // Garde-fou global de la plateforme : somme de TOUS les clients (c'est TON budget d'API).
    maxDepensePlateformeJourUsd: nombre('MAX_DEPENSE_PLATEFORME_JOUR_USD', 20),
    rembourserEchec: texte('REMBOURSER_ECHEC', '1') !== '0',
    plans: texte('PLANS', path.join(racine, 'plans.json')),
    prixParSecondeUsd: nombre('PRIX_PAR_SECONDE_USD', 0),
    dureeVideo: nombre('DUREE_VIDEO_SECONDES', 15),
    resolution: texte('RESOLUTION', '720p'),
    format: '9:16',
    catalogue: texte('CATALOGUE', path.join(racine, 'catalogue.json')),
    dossierDonnees: texte('DOSSIER_DONNEES', path.join(racine, 'donnees')),
    llm: { apiKey: texte('ANTHROPIC_API_KEY'), modele: texte('MODELE_SCENARIO', 'claude-sonnet-5-5') },
    higgsfield: {
      baseUrl: texte('HIGGSFIELD_BASE_URL', 'https://api.higgsfield.ai').replace(/\/+$/, ''),
      keyId: texte('HIGGSFIELD_KEY_ID'), keySecret: texte('HIGGSFIELD_KEY_SECRET'),
      reglage: texte('HIGGSFIELD_REGLAGE', path.join(racine, 'higgsfield-reglage.json')),
      delaiMaxMin: nombre('DELAI_MAX_VIDEO_MIN', 15)
    },
    tiktok: {
      clientKey: texte('TIKTOK_CLIENT_KEY'), clientSecret: texte('TIKTOK_CLIENT_SECRET'),
      refreshToken: texte('TIKTOK_REFRESH_TOKEN'), redirectUri: texte('TIKTOK_REDIRECT_URI', 'http://localhost:3456/callback'),
      // Tant que l'application TikTok n'est pas auditée, TikTok n'accepte que les vidéos privées.
      audite,
      confidentialite: texte('TIKTOK_CONFIDENTIALITE', audite ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY')
    }
  };
}

module.exports = { chargerEnv, lireConfig, RACINE };
