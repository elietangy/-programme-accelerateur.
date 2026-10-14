// Un cycle complet : choix du produit → script → conformité → vidéo → publication.
// Garde-fous : fichier STOP, plafonds de vidéos et de dépense par jour, conformité AVANT la dépense,
// jamais de nouvelle génération automatique après un échec, reprise de publication SANS regénérer.
'use strict';
const fs = require('fs');
const { creerStockage } = require('./stockage');
const { creerScenariste, choisirAngle } = require('./scenario');
const { creerVideo } = require('./video');
const { creerTikTok } = require('./tiktok');
const { verifier } = require('./conformite');
const { jourLocal, creneauxEchus } = require('./planning');

const MAX_ESSAIS_PUBLICATION = 3;
const MAX_ESSAIS_SCRIPT = 3;

function creerContexte(cfg, deps = {}) {
  const stock = deps.stock || creerStockage(cfg.dossierDonnees);
  return {
    cfg, stock,
    scenariste: deps.scenariste || creerScenariste(cfg),
    video: deps.video || creerVideo(cfg),
    tiktok: deps.tiktok || creerTikTok(cfg, stock),
    maintenant: deps.maintenant || (() => new Date())
  };
}

function chargerCatalogue(cfg) {
  let fichier = cfg.catalogue;
  if (!fs.existsSync(fichier)) {
    const exemple = require('path').join(cfg.racine, 'catalogue.exemple.json');
    if (cfg.simulation && cfg.catalogueExemple !== false && fs.existsSync(exemple)) fichier = exemple;
    else throw new Error('Catalogue introuvable : copie catalogue.exemple.json en catalogue.json et remplis tes produits.');
  }
  const c = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  return (c.produits || []).filter(p => p.actif !== false);
}

const publications = ctx => ctx.stock.lire('publications.json', []);
function sauver(ctx, pub) {
  const liste = publications(ctx); const i = liste.findIndex(p => p.id === pub.id);
  if (i >= 0) liste[i] = pub; else liste.push(pub);
  ctx.stock.ecrire('publications.json', liste);
  return pub;
}
const titreTikTok = pub => (pub.legende + ' ' + pub.hashtags.join(' ')).trim().slice(0, 2200);

function bilanDuJour(ctx) {
  const jour = jourLocal(ctx.maintenant(), ctx.cfg.fuseau);
  const duJour = publications(ctx).filter(p => p.jour === jour && p.videoId);
  return { videos: duJour.length, depense: duJour.reduce((s, p) => s + (p.coutEstime || 0), 0) };
}

async function publier(ctx, pub) {
  pub.essaisPublication = (pub.essaisPublication || 0) + 1;
  try {
    const r = await ctx.tiktok.publier({ fichier: pub.fichier, titre: titreTikTok(pub) });
    pub.publishId = r.publishId; pub.statut = r.prive ? 'publie_prive' : 'publie'; pub.publieLe = ctx.maintenant().toISOString();
    pub.note = r.prive ? 'Publiée en PRIVÉ : l\'application TikTok n\'est pas encore auditée (TIKTOK_AUDITE=1 une fois l\'audit obtenu).' : undefined;
    ctx.stock.journal({ evt: 'publie', id: pub.id, statut: pub.statut, confidentialite: r.confidentialite });
  } catch (e) {
    pub.statut = 'echec_publication'; pub.note = e.message;
    ctx.stock.journal({ evt: 'echec_publication', id: pub.id, essai: pub.essaisPublication, message: e.message });
  }
  return sauver(ctx, pub);
}

// Les vidéos déjà payées dont la publication a échoué sont republiées (aucune nouvelle génération).
async function reprendrePublications(ctx) {
  for (const pub of publications(ctx)) {
    if (pub.statut === 'echec_publication' && pub.fichier && fs.existsSync(pub.fichier) && (pub.essaisPublication || 0) < MAX_ESSAIS_PUBLICATION) await publier(ctx, pub);
  }
}

async function executerCycle(ctx, opts = {}) {
  const { cfg, stock } = ctx;
  if (fs.existsSync(stock.chemin('STOP'))) return { statut: 'arrete', note: 'Fichier STOP présent dans le dossier donnees : l\'agent est en pause. Supprime-le pour reprendre.' };
  await reprendrePublications(ctx);

  const bilan = bilanDuJour(ctx);
  if (bilan.videos >= cfg.maxVideosJour) return { statut: 'plafond', note: 'Plafond de ' + cfg.maxVideosJour + ' vidéo(s) par jour atteint.' };
  const cout = cfg.dureeVideo * cfg.prixParSecondeUsd;
  if (!cfg.simulation) {
    if (!(cfg.prixParSecondeUsd > 0)) return { statut: 'refuse', note: 'PRIX_PAR_SECONDE_USD non renseigné : sans prix, le plafond de dépense ne peut pas protéger le budget. Rien n\'est lancé.' };
    if (bilan.depense + cout > cfg.maxDepenseJourUsd) return { statut: 'plafond', note: 'Plafond de dépense du jour atteint (' + cfg.maxDepenseJourUsd + ' USD).' };
  }

  const produits = chargerCatalogue(cfg);
  if (!produits.length) return { statut: 'aucun_produit', note: 'Aucun produit actif dans le catalogue.' };
  const pubs = publications(ctx);
  const dernier = p => Math.max(0, ...pubs.filter(x => x.produitId === p.id).map(x => Date.parse(x.creeLe)));
  const produit = opts.produitId ? produits.find(p => p.id === opts.produitId) : [...produits].sort((a, b) => dernier(a) - dernier(b))[0];
  if (!produit) return { statut: 'aucun_produit', note: 'Produit inconnu : ' + opts.produitId };

  const angle = choisirAngle(produit, pubs);
  const hooksRecents = pubs.filter(p => p.produitId === produit.id).slice(-8).map(p => p.hook);
  const base = { id: 'pub-' + ctx.maintenant().getTime(), produitId: produit.id, creeLe: ctx.maintenant().toISOString(), jour: jourLocal(ctx.maintenant(), cfg.fuseau), angle, simulation: cfg.simulation, coutEstime: cout };

  // 1) Script + conformité : aucune dépense tant que le script n'est pas conforme.
  let contenu, verdict, retours = [];
  for (let essai = 1; essai <= MAX_ESSAIS_SCRIPT; essai++) {
    contenu = await ctx.scenariste.creer(produit, { angle, hooksRecents, retours });
    verdict = verifier(contenu, produit, cfg);
    if (verdict.ok) break;
    retours = verdict.bloquants;
  }
  const pub = Object.assign(base, { hook: contenu.hook, voixOff: contenu.voixOff, legende: contenu.legende, hashtags: contenu.hashtags, avertissements: verdict.avertissements });
  if (!verdict.ok) {
    pub.statut = 'bloque'; pub.note = verdict.bloquants.join(' | '); delete pub.coutEstime;
    sauver(ctx, pub); stock.journal({ evt: 'bloque', id: pub.id, produit: produit.id, raisons: verdict.bloquants });
    return { statut: 'bloque', id: pub.id, bloquants: verdict.bloquants };
  }

  // 2) Crédit : réservé APRÈS la conformité (un script bloqué ne coûte rien au client) et AVANT la dépense.
  let reservation = null;
  if (ctx.credits) {
    reservation = await ctx.credits.reserver();
    if (!reservation.ok) {
      stock.journal({ evt: 'credits_epuises', produit: produit.id, raison: reservation.raison });
      return { statut: 'credits_epuises', note: reservation.raison };
    }
    pub.credit = reservation.source;
  }

  // 3) Vidéo : une seule tentative, jamais relancée automatiquement.
  pub.statut = 'generation';
  let acceptee = false;
  try {
    const { id: videoId } = await ctx.video.lancer({ prompt: contenu.promptVideo, duree: cfg.dureeVideo, format: cfg.format, resolution: cfg.resolution });
    acceptee = true;
    pub.videoId = videoId; sauver(ctx, pub);   // compté dès que la demande est acceptée
    if (reservation) await ctx.credits.confirmer(reservation);
    const { url } = await ctx.video.attendre(videoId);
    pub.fichier = stock.chemin('videos/' + pub.id + (cfg.simulation ? '.simu' : '.mp4'));
    fs.mkdirSync(stock.chemin('videos'), { recursive: true });
    await ctx.video.telecharger(url, pub.fichier);
  } catch (e) {
    // Le client ne paie pas un échec de la plateforme (désactivable : REMBOURSER_ECHEC=0).
    if (reservation && (!acceptee || cfg.rembourserEchec !== false)) { await ctx.credits.rembourser(reservation, e.message); pub.creditRembourse = true; }
    pub.statut = 'echec_video'; pub.note = e.message; sauver(ctx, pub);
    stock.journal({ evt: 'echec_video', id: pub.id, message: e.message, creditRembourse: !!pub.creditRembourse });
    return { statut: 'echec_video', id: pub.id, note: e.message };
  }

  // 4) Publication (automatique, ou mise en attente si MODE_PUBLICATION=validation).
  if (cfg.publication === 'validation') {
    pub.statut = 'en_attente_validation'; sauver(ctx, pub);
    stock.journal({ evt: 'en_attente_validation', id: pub.id });
    return { statut: 'en_attente_validation', id: pub.id };
  }
  await publier(ctx, pub);
  return { statut: pub.statut, id: pub.id, note: pub.note };
}

async function approuver(ctx, id) {
  const pub = publications(ctx).find(p => p.id === id);
  if (!pub) throw new Error('Publication inconnue : ' + id);
  if (pub.statut !== 'en_attente_validation' && pub.statut !== 'echec_publication') throw new Error('Cette publication n\'est pas en attente (statut : ' + pub.statut + ').');
  return publier(ctx, pub);
}

// Appelé chaque minute par le mode « demarrer » : lance un cycle pour chaque créneau échu.
async function traiterCreneaux(ctx) {
  const etat = ctx.stock.lire('etat.json', { creneauxFaits: [] });
  const resultats = [];
  for (const cle of creneauxEchus(ctx.maintenant(), ctx.cfg.heures, ctx.cfg.fuseau, etat.creneauxFaits, ctx.cfg.fenetreMin)) {
    etat.creneauxFaits = [...etat.creneauxFaits, cle].slice(-50);
    ctx.stock.ecrire('etat.json', etat);   // créneau marqué AVANT le cycle : jamais deux fois
    try { resultats.push({ creneau: cle, ...(await executerCycle(ctx)) }); }
    catch (e) { ctx.stock.journal({ evt: 'erreur_cycle', creneau: cle, message: e.message }); resultats.push({ creneau: cle, statut: 'erreur', note: e.message }); }
  }
  return resultats;
}

module.exports = { creerContexte, executerCycle, approuver, traiterCreneaux, bilanDuJour, publications, chargerCatalogue };
