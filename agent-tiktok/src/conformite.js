// Contrôle de conformité : tourne AVANT la génération vidéo (donc avant toute dépense).
// Un script « bloquant » n'est jamais transformé en vidéo ni publié.
// Règles universelles (valables pour tout client) + règles propres à chaque produit.
'use strict';

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const chiffres = s => String(s).replace(/\D/g, '');

const PROMESSES_DE_GAIN = [
  'gagner de l\'argent', 'gagnez de l\'argent', 'gagne de l\'argent', 'revenu passif', 'revenus passifs', 'devenir riche',
  'argent facile', 'millionnaire', 'resultats garantis', 'succes garanti', 'gains garantis', 'liberte financiere',
  'make money', 'get rich', 'passive income', 'financial freedom', 'easy money', 'millionaire',
  'guaranteed results', 'guaranteed income', 'guaranteed profit', 'guaranteed success'
];
const TEMOIGNAGES = ['temoignage', 'testimonial', 'client satisfait', 'avis client', 'customer review', 'happy customer', 'avant/apres', 'before and after'];
const DEVISES = '(?:fcfa|f cfa|xof|xaf|eur|euros?|usd|cad|gbp|dollars?)';
const PRIX = new RegExp('(\\d[\\d\\s.,]*)\\s*(?:' + DEVISES + '|€|\\$|£)|(?:€|\\$|£)\\s*(\\d[\\d.,]*)', 'g');
const STATS = /(\d[\d\s.,]*)\s*(clients?|ventes?|vendus?|eleves?|etudiants?|participants?|utilisateurs?|abonnes?|customers?|sales|students|users|downloads|telechargements|personnes formees)/g;

// Nombres que le script a le droit de citer : uniquement ceux de la fiche produit.
function chiffresAutorises(produit) {
  const sources = [produit.nom, produit.description, produit.promesse, produit.prix, produit.offre, produit.garantie]
    .concat(produit.faitsVerifies || [], produit.prixAnnexes || []);
  const set = new Set();
  for (const s of sources) for (const m of String(s || '').matchAll(/\d[\d\s.,]*/g)) { const c = chiffres(m[0]); if (c) set.add(c); }
  return set;
}

function verifier(contenu, produit, cfg = {}) {
  const bloquants = [], avertissements = [];
  const texte = norm([contenu.hook, contenu.voixOff, contenu.legende, (contenu.hashtags || []).join(' ')].join(' \n '));
  const autorises = chiffresAutorises(produit);

  for (const mot of PROMESSES_DE_GAIN) if (texte.includes(norm(mot))) bloquants.push('Promesse de gain interdite : « ' + mot + ' ».');
  if (!(produit.temoignagesVerifies && produit.temoignagesVerifies.length)) {
    for (const mot of TEMOIGNAGES) if (texte.includes(norm(mot))) bloquants.push('Témoignage ou avis cité alors que la fiche produit n\'en contient aucun de vérifié : « ' + mot + ' ».');
  }
  for (const m of texte.matchAll(PRIX)) {
    const c = chiffres(m[1] || m[2]);
    if (c && !autorises.has(c)) bloquants.push('Prix ou montant absent de la fiche produit : « ' + m[0].trim() + ' ».');
  }
  for (const m of texte.matchAll(STATS)) {
    const c = chiffres(m[1]);
    if (c && !autorises.has(c)) bloquants.push('Chiffre de vente ou de clients non vérifié : « ' + m[0].trim() + ' » (à ajouter dans « faitsVerifies » si c\'est vrai).');
  }
  for (const mot of produit.motsInterdits || []) if (texte.includes(norm(mot))) bloquants.push('Mot interdit pour ce produit : « ' + mot + ' ».');
  const legendeComplete = (contenu.legende || '') + ' ' + (contenu.hashtags || []).join(' ');
  if (legendeComplete.length > 2200) bloquants.push('Légende trop longue pour TikTok (2200 caractères maximum).');
  if (!String(contenu.voixOff || '').trim()) bloquants.push('Texte de la voix off vide.');
  if (!String(contenu.promptVideo || '').trim()) bloquants.push('Description visuelle de la vidéo vide.');

  const mots = String(contenu.voixOff || '').split(/\s+/).filter(Boolean).length;
  if (cfg.dureeVideo && mots > cfg.dureeVideo * 3) avertissements.push('Voix off longue (' + mots + ' mots pour ' + cfg.dureeVideo + ' s) : risque de texte coupé.');
  if (produit.cta && !norm(contenu.voixOff + ' ' + contenu.legende).includes(norm(produit.cta).slice(0, 12))) avertissements.push('L\'appel à l\'action de la fiche produit n\'apparaît pas tel quel.');

  return { ok: bloquants.length === 0, bloquants, avertissements };
}

module.exports = { verifier, chiffresAutorises, norm };
