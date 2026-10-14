// Registre des clients et de leurs crédits. C'est LUI qui protège ton budget :
// une vidéo n'est lancée que si un crédit a été réservé, et un client qui n'a plus rien est arrêté seul.
//
// Règles :
//  - 1 crédit = 1 vidéo (durée définie par le plan).
//  - Le quota mensuel du forfait se consomme d'abord ; il se remet à zéro à chaque date anniversaire (non reporté).
//  - Les crédits achetés ne s'effacent pas et ne sont consommés qu'une fois le quota épuisé.
//  - Pas d'abonnement actif = aucune vidéo, même s'il reste des crédits achetés.
//  - Un remboursement revient à sa source : au quota (si la période n'a pas changé) sinon en crédit acheté.
'use strict';

const MAX_RESERVATIONS = 200;
const MAX_REFERENCES = 500;

function ajouterMois(iso, n) {
  const d = new Date(iso), jour = d.getUTCDate();
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  const dernierJour = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(jour, dernierJour));   // 31 janvier + 1 mois = 28/29 février
  return r;
}

function debutPeriode(abonnementDebut, maintenant) {
  let k = 0;
  while (k < 1200 && ajouterMois(abonnementDebut, k + 1) <= maintenant) k++;
  return ajouterMois(abonnementDebut, k).toISOString();
}

function creerRegistre(stock, plans, maintenant = () => new Date()) {
  const lire = () => stock.lire('clients.json', { clients: {} });
  const ecrire = donnees => stock.ecrire('clients.json', donnees);
  const planDe = c => plans.find(p => p.id === c.planId);

  // Remet le quota à zéro quand une nouvelle période d'abonnement commence.
  function actualiser(c) {
    const debut = debutPeriode(c.abonnementDebut, maintenant());
    if (c.periodeDebut !== debut) { c.periodeDebut = debut; c.quotaUtilise = 0; }
  }
  function charger(id) {
    const donnees = lire(), c = donnees.clients[id];
    if (!c) throw new Error('Client inconnu : ' + id);
    actualiser(c);
    return { donnees, c };
  }
  function quotaRestant(c) {
    const p = planDe(c);
    return c.statut === 'actif' && p ? Math.max(0, p.videosParMois - c.quotaUtilise) : 0;
  }

  return {
    ajouterClient({ id, nom, planId, abonnementDebut, reglages = {} }) {
      if (!plans.find(p => p.id === planId)) throw new Error('Plan inconnu : ' + planId);
      const donnees = lire();
      if (donnees.clients[id]) throw new Error('Ce client existe déjà : ' + id);
      const debut = abonnementDebut || maintenant().toISOString();
      donnees.clients[id] = { id, nom: nom || id, planId, statut: 'actif', abonnementDebut: debut, periodeDebut: debutPeriode(debut, maintenant()), quotaUtilise: 0, credits: 0, reservations: {}, references: [], reglages };
      ecrire(donnees);
      stock.journal({ evt: 'client_ajoute', client: id, plan: planId });
      return donnees.clients[id];
    },
    liste() { return Object.values(lire().clients); },
    client(id) { return charger(id).c; },

    // Le paiement du forfait (ou son échec) met le statut à jour : 'actif' | 'impaye' | 'annule'.
    changerStatut(id, statut) {
      if (!['actif', 'impaye', 'annule'].includes(statut)) throw new Error('Statut invalide : ' + statut);
      const { donnees, c } = charger(id); c.statut = statut; ecrire(donnees);
      stock.journal({ evt: 'client_statut', client: id, statut });
    },
    changerPlan(id, planId) {
      if (!plans.find(p => p.id === planId)) throw new Error('Plan inconnu : ' + planId);
      const { donnees, c } = charger(id); c.planId = planId; ecrire(donnees);
      stock.journal({ evt: 'client_plan', client: id, plan: planId });
    },

    disponible(id) {
      const { c } = charger(id);
      const q = quotaRestant(c);
      return { actif: c.statut === 'actif', quotaRestant: q, credits: c.credits, total: c.statut === 'actif' ? q + c.credits : 0 };
    },

    // Achat d'un pack : idempotent. La même référence de paiement ne crédite jamais deux fois
    // (les services de paiement renvoient parfois la même notification plusieurs fois).
    crediter(id, nombre, reference) {
      if (!Number.isInteger(nombre) || nombre <= 0) throw new Error('Nombre de crédits invalide.');
      if (!reference) throw new Error('Référence de paiement obligatoire.');
      const { donnees, c } = charger(id);
      if (c.references.includes(reference)) return { ok: true, deja: true, credits: c.credits };
      c.credits += nombre; c.references = [...c.references, reference].slice(-MAX_REFERENCES);
      ecrire(donnees);
      stock.journal({ evt: 'credits_achetes', client: id, nombre, reference });
      return { ok: true, deja: false, credits: c.credits };
    },

    // Réserve (= débite) un crédit AVANT de lancer la vidéo.
    reserver(id) {
      const { donnees, c } = charger(id);
      if (c.statut !== 'actif') return { ok: false, raison: 'Abonnement non actif (' + c.statut + ').' };
      let source;
      if (quotaRestant(c) > 0) { c.quotaUtilise += 1; source = 'quota'; }
      else if (c.credits > 0) { c.credits -= 1; source = 'credit'; }
      else return { ok: false, raison: 'Quota du forfait épuisé et aucun crédit acheté.' };
      const reservationId = 'res-' + maintenant().getTime() + '-' + Math.random().toString(36).slice(2, 6);
      c.reservations[reservationId] = { source, periode: c.periodeDebut, etat: 'reservee' };
      const ids = Object.keys(c.reservations);
      for (const vieux of ids.slice(0, Math.max(0, ids.length - MAX_RESERVATIONS))) delete c.reservations[vieux];
      ecrire(donnees);
      return { ok: true, reservationId, source };
    },
    confirmer(id, reservationId) {
      const { donnees, c } = charger(id); const r = c.reservations[reservationId];
      if (r && r.etat === 'reservee') { r.etat = 'confirmee'; ecrire(donnees); }
    },
    // Rend le crédit à sa source. Sans effet si déjà remboursé (pas de double remboursement).
    rembourser(id, reservationId, motif) {
      const { donnees, c } = charger(id); const r = c.reservations[reservationId];
      if (!r || r.etat === 'remboursee') return { ok: false };
      if (r.source === 'quota' && r.periode === c.periodeDebut) c.quotaUtilise = Math.max(0, c.quotaUtilise - 1);
      else c.credits += 1;
      r.etat = 'remboursee'; ecrire(donnees);
      stock.journal({ evt: 'credit_rembourse', client: id, reservation: reservationId, motif });
      return { ok: true };
    }
  };
}

module.exports = { creerRegistre, ajouterMois, debutPeriode };
