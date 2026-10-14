'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { creerStockage } = require('../src/stockage');
const { creerRegistre } = require('../src/registre');
const { creerPlateforme } = require('../src/plateforme');
const { lireConfig, RACINE } = require('../src/config');
const { executerCycle, publications } = require('../src/pipeline');

const PLANS = [{ id: 'mini', nom: 'Mini', videosParMois: 2, videosParJour: 5, dureeVideo: 15 }];
const fiche = { produits: [{ id: 'p1', nom: 'Pack Notion', description: 'Modèles', promesse: 'Organiser son activité', prix: '29 USD', langue: 'en', cta: 'Link in bio.' }] };
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pf-'));

function registreTemp(horloge = { t: new Date('2026-01-31T10:00:00Z') }) {
  const stock = creerStockage(temp());
  const reg = creerRegistre(stock, PLANS, () => horloge.t);
  reg.ajouterClient({ id: 'a', planId: 'mini', abonnementDebut: '2026-01-31T10:00:00Z' });
  return { reg, horloge, stock };
}

test('registre : quota d\'abord, puis crédits achetés, puis refus', () => {
  const { reg } = registreTemp();
  reg.crediter('a', 1, 'pay-1');
  assert.equal(reg.reserver('a').source, 'quota');
  assert.equal(reg.reserver('a').source, 'quota');
  assert.equal(reg.reserver('a').source, 'credit');
  const r = reg.reserver('a');
  assert.equal(r.ok, false); assert.match(r.raison, /épuisé/);
});
test('registre : le même paiement ne crédite jamais deux fois', () => {
  const { reg } = registreTemp();
  assert.equal(reg.crediter('a', 5, 'pay-9').deja, false);
  assert.equal(reg.crediter('a', 5, 'pay-9').deja, true);
  assert.equal(reg.disponible('a').credits, 5);
  assert.throws(() => reg.crediter('a', 5, ''), /Référence/);
});
test('registre : le quota se remet à zéro à la date anniversaire, les crédits achetés restent', () => {
  const { reg, horloge } = registreTemp();
  reg.crediter('a', 3, 'p'); reg.reserver('a'); reg.reserver('a');
  assert.equal(reg.disponible('a').quotaRestant, 0);
  horloge.t = new Date('2026-02-27T10:00:00Z');   // pas encore le 28 février
  assert.equal(reg.disponible('a').quotaRestant, 0);
  horloge.t = new Date('2026-02-28T10:00:00Z');   // 31 janvier + 1 mois = 28 février
  assert.deepEqual([reg.disponible('a').quotaRestant, reg.disponible('a').credits], [2, 3]);
});
test('registre : abonnement impayé ou annulé = aucune vidéo, même avec des crédits', () => {
  const { reg } = registreTemp(); reg.crediter('a', 10, 'p');
  reg.changerStatut('a', 'impaye');
  assert.equal(reg.reserver('a').ok, false); assert.equal(reg.disponible('a').total, 0);
  reg.changerStatut('a', 'actif'); assert.equal(reg.reserver('a').ok, true);
});
test('registre : remboursement à la source, une seule fois', () => {
  const { reg } = registreTemp(); reg.crediter('a', 1, 'p');
  const q = reg.reserver('a'); reg.reserver('a'); const c = reg.reserver('a');
  reg.rembourser('a', q.reservationId, 'test'); assert.equal(reg.rembourser('a', q.reservationId, 'x').ok, false);
  reg.rembourser('a', c.reservationId, 'test');
  assert.deepEqual([reg.disponible('a').quotaRestant, reg.disponible('a').credits], [1, 1]);
});
test('registre : remboursement d\'une réservation d\'une ancienne période devient un crédit acheté', () => {
  const { reg, horloge } = registreTemp(); const q = reg.reserver('a');
  horloge.t = new Date('2026-03-31T10:00:00Z');
  reg.rembourser('a', q.reservationId, 'test');
  assert.deepEqual([reg.disponible('a').quotaRestant, reg.disponible('a').credits], [2, 1]);
});

function plateformeTemp(env = {}, deps = {}) {
  const dossier = temp();
  const cfg = lireConfig({ MODE_SIMULATION: '1', DOSSIER_DONNEES: dossier, HEURES_PUBLICATION: '12:00', FUSEAU: 'UTC', ...env }, RACINE);
  const pf = creerPlateforme(cfg, { plans: PLANS, maintenant: () => new Date('2026-10-14T12:05:00Z'), ...deps });
  pf.ajouter = id => {
    pf.registre.ajouterClient({ id, planId: 'mini', abonnementDebut: '2026-10-01T00:00:00Z' });
    fs.mkdirSync(pf.dossierClient(id), { recursive: true });
    fs.writeFileSync(path.join(pf.dossierClient(id), 'catalogue.json'), JSON.stringify(fiche));
  };
  return pf;
}

test('plateforme : chaque client a son catalogue, ses publications et son quota', async () => {
  const pf = plateformeTemp(); pf.ajouter('a'); pf.ajouter('b');
  const res = await pf.traiter();
  assert.deepEqual(res.map(r => [r.client, r.statut]), [['a', 'publie'], ['b', 'publie']]);
  assert.equal(pf.registre.disponible('a').quotaRestant, 1);
  assert.equal(publications(pf.contexteClient(pf.registre.client('a'))).length, 1);
});
test('plateforme : client sans crédit arrêté seul, aucune vidéo lancée pour lui', async () => {
  let lances = 0;
  const video = { async lancer() { lances++; return { id: 'v' }; }, async attendre() { return { url: 'u' }; }, async telecharger(u, f) { fs.writeFileSync(f, 'x'); } };
  const pf = plateformeTemp({}, { video }); pf.ajouter('a');
  pf.registre.reserver('a'); pf.registre.reserver('a');   // quota vide
  const res = await pf.traiter();
  assert.equal(res[0].statut, 'credits_epuises'); assert.equal(lances, 0);
  pf.registre.crediter('a', 1, 'pay-1');
  const ctx = pf.contexteClient(pf.registre.client('a'));
  assert.equal((await executerCycle(ctx)).statut, 'publie'); assert.equal(lances, 1);
});
test('plateforme : un script bloqué ne consomme aucun crédit', async () => {
  const scenariste = { async creer() { return { hook: 'h', voixOff: 'Make money fast', promptVideo: 'x', legende: 'l', hashtags: [] }; } };
  const pf = plateformeTemp({}, { scenariste }); pf.ajouter('a');
  const res = await pf.traiter();
  assert.equal(res[0].statut, 'bloque'); assert.equal(pf.registre.disponible('a').quotaRestant, 2);
});
test('plateforme : échec de génération = crédit rendu au client', async () => {
  const video = { async lancer() { return { id: 'v' }; }, async attendre() { throw new Error('échec'); } };
  const pf = plateformeTemp({}, { video }); pf.ajouter('a');
  const res = await pf.traiter();
  assert.equal(res[0].statut, 'echec_video'); assert.equal(pf.registre.disponible('a').quotaRestant, 2);
});
test('plateforme : REMBOURSER_ECHEC=0 garde le crédit consommé quand la demande a été acceptée', async () => {
  const video = { async lancer() { return { id: 'v' }; }, async attendre() { throw new Error('échec'); } };
  const pf = plateformeTemp({ REMBOURSER_ECHEC: '0' }, { video }); pf.ajouter('a');
  await pf.traiter(); assert.equal(pf.registre.disponible('a').quotaRestant, 1);
});
test('plateforme : abonnement impayé = client ignoré', async () => {
  const pf = plateformeTemp(); pf.ajouter('a'); pf.registre.changerStatut('a', 'impaye');
  assert.deepEqual(await pf.traiter(), []);
});
test('plateforme : plafond global de dépense met tous les clients en pause (mode réel)', async () => {
  let lances = 0;
  const video = { async lancer() { lances++; return { id: 'v' }; }, async attendre() { return { url: 'u' }; }, async telecharger(u, f) { fs.writeFileSync(f, 'x'); } };
  const tiktok = { async publier() { return { publishId: 'p', confidentialite: 'SELF_ONLY', prive: true }; } };
  // 15 s x 1 USD/s = 15 USD par vidéo ; plafond global 20 USD ; plafond client assez haut pour ne pas interférer
  const pf = plateformeTemp({ MODE_SIMULATION: '0', PRIX_PAR_SECONDE_USD: '1', MAX_DEPENSE_PLATEFORME_JOUR_USD: '20', MAX_DEPENSE_PAR_JOUR_USD: '100' }, { video, tiktok });
  pf.ajouter('a'); pf.ajouter('b'); pf.ajouter('c');
  const r1 = await pf.traiter();
  // a dépense 15 (< 20) donc b passe et dépense 15 (total 30 >= 20) : c doit être arrêté DANS ce même passage.
  assert.equal(lances, 2, 'le plafond global doit être revérifié avant chaque client');
  assert.equal(r1[r1.length - 1].statut, 'plafond_plateforme');
  const r2 = await pf.traiter();
  assert.equal(r2[0].statut, 'plafond_plateforme'); assert.equal(lances, 2);
});
