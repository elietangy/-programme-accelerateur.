// Mode multi-clients : un registre de clients/crédits, un dossier de données par client,
// un cycle par client et par créneau, et un plafond global de dépense (TON budget d'API).
'use strict';
const fs = require('fs');
const path = require('path');
const { creerStockage } = require('./stockage');
const { creerRegistre } = require('./registre');
const { creerContexte, traiterCreneaux, publications } = require('./pipeline');
const { creerVideo } = require('./video');

function chargerPlans(cfg) {
  let fichier = cfg.plans;
  if (!fs.existsSync(fichier)) {
    const exemple = path.join(cfg.racine, 'plans.exemple.json');
    if (cfg.simulation && fs.existsSync(exemple)) fichier = exemple;
    else throw new Error('plans.json introuvable : copie plans.exemple.json en plans.json et fixe tes forfaits.');
  }
  const plans = JSON.parse(fs.readFileSync(fichier, 'utf8')).plans || [];
  if (!plans.length) throw new Error('Aucun forfait défini dans ' + path.basename(fichier) + '.');
  return plans;
}

function creerPlateforme(cfg, deps = {}) {
  const stock = deps.stock || creerStockage(cfg.dossierDonnees);
  const maintenant = deps.maintenant || (() => new Date());
  const plans = deps.plans || chargerPlans(cfg);
  const registre = creerRegistre(stock, plans, maintenant);
  const video = deps.video || creerVideo(cfg);   // une seule clé Higgsfield : la tienne, partagée par tous les clients

  function dossierClient(id) { return path.join(cfg.dossierDonnees, 'clients', id); }

  // Contexte d'un client : ses produits, son jeton TikTok, son fuseau, les limites de son forfait.
  function contexteClient(c) {
    const plan = plans.find(p => p.id === c.planId);
    const r = c.reglages || {};
    const cfgClient = {
      ...cfg,
      dossierDonnees: dossierClient(c.id), catalogue: path.join(dossierClient(c.id), 'catalogue.json'), catalogueExemple: false,
      fuseau: r.fuseau || cfg.fuseau, heures: r.heures || cfg.heures, publication: r.publication || cfg.publication,
      maxVideosJour: plan.videosParJour ?? cfg.maxVideosJour, dureeVideo: plan.dureeVideo ?? cfg.dureeVideo
    };
    const ctx = creerContexte(cfgClient, { stock: creerStockage(dossierClient(c.id)), video, scenariste: deps.scenariste, tiktok: deps.tiktok, maintenant });
    ctx.credits = {
      reserver: () => registre.reserver(c.id),
      confirmer: res => registre.confirmer(c.id, res.reservationId),
      rembourser: (res, motif) => registre.rembourser(c.id, res.reservationId, motif)
    };
    return ctx;
  }

  // Dépense estimée du jour (date UTC) sur tous les clients.
  function depenseDuJour() {
    const jour = maintenant().toISOString().slice(0, 10);
    return registre.liste().reduce((total, c) => {
      const ctx = { stock: creerStockage(dossierClient(c.id)) };
      return total + publications(ctx).filter(p => p.videoId && String(p.creeLe).startsWith(jour)).reduce((s, p) => s + (p.coutEstime || 0), 0);
    }, 0);
  }

  return {
    registre, contexteClient, depenseDuJour, dossierClient,
    async traiter() {
      const resultats = [];
      // Plafond revérifié AVANT CHAQUE CLIENT : un seul passage ne doit jamais dépasser ton budget.
      const plafondAtteint = () => !cfg.simulation && depenseDuJour() >= cfg.maxDepensePlateformeJourUsd;
      const enPause = () => {
        stock.journal({ evt: 'plafond_plateforme', depense: depenseDuJour() });
        return { statut: 'plafond_plateforme', note: 'Plafond global de ' + cfg.maxDepensePlateformeJourUsd + ' USD atteint pour aujourd\'hui : les clients restants sont en pause.' };
      };
      for (const c of registre.liste()) {
        if (c.statut !== 'actif') continue;
        if (plafondAtteint()) { resultats.push(enPause()); break; }
        try { for (const r of await traiterCreneaux(contexteClient(c))) resultats.push({ client: c.id, ...r }); }
        catch (e) { stock.journal({ evt: 'erreur_client', client: c.id, message: e.message }); resultats.push({ client: c.id, statut: 'erreur', note: e.message }); }
      }
      return resultats;
    }
  };
}

module.exports = { creerPlateforme, chargerPlans };
