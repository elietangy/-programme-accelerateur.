#!/usr/bin/env node
// Agent TikTok : crée et publie automatiquement des vidéos pour des produits numériques.
'use strict';
const path = require('path');
const { chargerEnv, lireConfig } = require('./src/config');
const { creerContexte, executerCycle, approuver, traiterCreneaux, bilanDuJour, publications } = require('./src/pipeline');
const { creerPlateforme } = require('./src/plateforme');

chargerEnv(path.join(__dirname, '.env'));
const cfg = lireConfig();
const ctx = creerContexte(cfg);
const [commande = 'aide', ...args] = process.argv.slice(2);
const opt = nom => { const i = args.indexOf('--' + nom); return i >= 0 ? args[i + 1] : undefined; };

function etat() {
  const b = bilanDuJour(ctx);
  console.log('Mode               : ' + (cfg.simulation ? 'SIMULATION (rien n\'est dépensé ni publié)' : 'RÉEL (dépenses et publications réelles)'));
  console.log('Publication        : ' + (cfg.publication === 'auto' ? 'automatique' : 'avec validation'));
  console.log('Créneaux           : ' + cfg.heures.join(', ') + ' (' + cfg.fuseau + ')');
  console.log('Aujourd\'hui        : ' + b.videos + '/' + cfg.maxVideosJour + ' vidéo(s), ' + b.depense.toFixed(2) + '/' + cfg.maxDepenseJourUsd + ' USD');
  console.log('Clé Higgsfield     : ' + (cfg.higgsfield.keyId && cfg.higgsfield.keySecret ? 'présente' : 'absente'));
  console.log('Clé Anthropic      : ' + (cfg.llm.apiKey ? 'présente' : 'absente (scripts par modèles intégrés)'));
  console.log('TikTok             : ' + (cfg.tiktok.clientKey && cfg.tiktok.clientSecret ? 'application configurée' : 'non configuré') + ' / confidentialité ' + cfg.tiktok.confidentialite + (cfg.tiktok.audite ? '' : ' (application non auditée : vidéos privées uniquement)'));
  console.log('Pause (STOP)       : ' + (require('fs').existsSync(ctx.stock.chemin('STOP')) ? 'OUI, l\'agent est en pause' : 'non'));
}

async function main() {
  if (commande === 'etat') return etat();
  if (commande === 'une-fois') { const r = await executerCycle(ctx, { produitId: opt('produit') }); console.log(JSON.stringify(r, null, 2)); return; }
  if (commande === 'approuver') { const p = await approuver(ctx, args[0]); console.log('Statut : ' + p.statut + (p.note ? ' — ' + p.note : '')); return; }
  if (commande === 'publications') { for (const p of publications(ctx).slice(-20)) console.log(p.id + '  ' + p.statut.padEnd(22) + ' ' + p.produitId + ' / ' + p.angle + '  « ' + p.hook + ' »'); return; }
  if (commande === 'tiktok-connecter') { await ctx.tiktok.connecter(); console.log('Compte TikTok connecté.'); return; }
  if (commande === 'demarrer') {
    console.log('Agent démarré. Ctrl+C pour arrêter. Pause immédiate : créer le fichier donnees/STOP.\n'); etat();
    let enCours = false;
    const tick = async () => {
      if (enCours) return; enCours = true;
      try { for (const r of await traiterCreneaux(ctx)) console.log(new Date().toISOString() + ' ' + JSON.stringify(r)); }
      catch (e) { console.error('Erreur : ' + e.message); } finally { enCours = false; }
    };
    await tick(); setInterval(tick, 60000); return;
  }
  // ----- Mode plateforme (multi-clients) -----
  if (commande.startsWith('client') || commande === 'crediter' || commande === 'plateforme') {
    const pf = creerPlateforme(cfg);
    if (commande === 'client-ajouter') { const c = pf.registre.ajouterClient({ id: args[0], planId: args[1], nom: opt('nom') }); console.log('Client créé : ' + c.id + ' (plan ' + c.planId + ')'); return; }
    if (commande === 'clients') { for (const c of pf.registre.liste()) { const d = pf.registre.disponible(c.id); console.log(c.id.padEnd(16) + c.statut.padEnd(8) + c.planId.padEnd(10) + 'quota ' + d.quotaRestant + ' + crédits ' + d.credits); } return; }
    if (commande === 'client-statut') { pf.registre.changerStatut(args[0], args[1]); console.log('Statut mis à jour.'); return; }
    if (commande === 'client-connecter') { await pf.contexteClient(pf.registre.client(args[0])).tiktok.connecter(); console.log('Compte TikTok du client connecté.'); return; }
    if (commande === 'crediter') { const r = pf.registre.crediter(args[0], Number(args[1]), args[2]); console.log(r.deja ? 'Déjà crédité (même référence) : rien changé.' : 'Crédits ajoutés. Solde acheté : ' + r.credits); return; }
    if (commande === 'plateforme-demarrer') {
      console.log('Plateforme démarrée (' + (cfg.simulation ? 'SIMULATION' : 'RÉEL') + '). Ctrl+C pour arrêter.\n');
      let enCours = false;
      const tick = async () => { if (enCours) return; enCours = true;
        try { for (const r of await pf.traiter()) console.log(new Date().toISOString() + ' ' + JSON.stringify(r)); }
        catch (e) { console.error('Erreur : ' + e.message); } finally { enCours = false; } };
      await tick(); setInterval(tick, 60000); return;
    }
  }
  console.log('Commandes (un seul utilisateur) : etat | une-fois [--produit id] | demarrer | approuver <id> | publications | tiktok-connecter');
  console.log('Commandes (plateforme) : client-ajouter <id> <plan> [--nom X] | clients | client-statut <id> actif|impaye|annule | client-connecter <id> | crediter <id> <nombre> <référence-paiement> | plateforme-demarrer');
}
main().catch(e => { console.error('Erreur : ' + e.message); process.exit(1); });
