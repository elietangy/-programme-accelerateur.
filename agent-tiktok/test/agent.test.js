'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifier } = require('../src/conformite');
const { creneauxEchus } = require('../src/planning');
const { lireConfig, RACINE } = require('../src/config');
const { creerContexte, executerCycle, approuver, traiterCreneaux, publications } = require('../src/pipeline');
const { creerTikTok } = require('../src/tiktok');
const { creerStockage } = require('../src/stockage');

const produit = { id: 'p', nom: 'Pack Notion', description: 'Modèles Notion', promesse: 'Organiser son activité', prix: '29 USD', garantie: 'remboursement sous 14 jours', faitsVerifies: ['14 jours de remboursement'], cta: 'Le lien est dans ma bio.' };
const bon = { hook: 'Still losing time?', voixOff: 'Pack Notion for 29 USD. Le lien est dans ma bio.', promptVideo: 'A phone, 9:16', legende: 'Organize your work', hashtags: ['#tips'] };

function ctxTemp(env = {}, deps = {}) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-'));
  const cfg = lireConfig({ MODE_SIMULATION: '1', DOSSIER_DONNEES: dossier, ...env }, RACINE);
  return { ctx: creerContexte(cfg, deps), dossier };
}

test('conformité : script valide accepté', () => assert.equal(verifier(bon, produit).ok, true));
test('conformité : promesse de gain bloquée', () => {
  const v = verifier({ ...bon, voixOff: 'Learn how to make money fast' }, produit);
  assert.equal(v.ok, false); assert.match(v.bloquants[0], /gain/i);
});
test('conformité : prix inventé bloqué, prix de la fiche accepté', () => {
  assert.equal(verifier({ ...bon, voixOff: 'Only 9 USD today' }, produit).ok, false);
  assert.equal(verifier({ ...bon, voixOff: 'Seulement 29 USD' }, produit).ok, true);
});
test('conformité : chiffre de clients inventé bloqué', () => {
  assert.equal(verifier({ ...bon, voixOff: 'Already 5000 customers trust it' }, produit).ok, false);
});
test('conformité : faux témoignage bloqué sans témoignage vérifié', () => {
  assert.equal(verifier({ ...bon, legende: 'Read this testimonial' }, produit).ok, false);
  assert.equal(verifier({ ...bon, legende: 'Read this testimonial' }, { ...produit, temoignagesVerifies: ['Merci ! - A.'] }).ok, true);
});

test('planning : créneau dans la fenêtre, jamais deux fois, ancien créneau ignoré', () => {
  const t = new Date('2026-10-14T12:10:00Z'); // 13:10 à Porto-Novo (UTC+1)
  assert.deepEqual(creneauxEchus(t, ['13:00', '18:30'], 'Africa/Porto-Novo', [], 90), ['2026-10-14 13:00']);
  assert.deepEqual(creneauxEchus(t, ['13:00'], 'Africa/Porto-Novo', ['2026-10-14 13:00'], 90), []);
  assert.deepEqual(creneauxEchus(new Date('2026-10-14T15:00:00Z'), ['13:00'], 'Africa/Porto-Novo', [], 90), []);
});

test('cycle simulé : génère, publie, enregistre', async () => {
  const { ctx } = ctxTemp();
  const r = await executerCycle(ctx);
  assert.equal(r.statut, 'publie');
  assert.equal(publications(ctx).length, 1);
});
test('plafond de vidéos par jour respecté', async () => {
  const { ctx } = ctxTemp({ MAX_VIDEOS_PAR_JOUR: '1' });
  await executerCycle(ctx);
  assert.equal((await executerCycle(ctx)).statut, 'plafond');
});
test('fichier STOP met l\'agent en pause', async () => {
  const { ctx, dossier } = ctxTemp(); fs.writeFileSync(path.join(dossier, 'STOP'), '');
  assert.equal((await executerCycle(ctx)).statut, 'arrete');
});
test('mode réel sans prix par seconde : refusé avant toute dépense', async () => {
  let lance = 0;
  const { ctx } = ctxTemp({ MODE_SIMULATION: '0' }, { video: { async lancer() { lance++; return { id: 'x' }; } } });
  assert.equal((await executerCycle(ctx)).statut, 'refuse'); assert.equal(lance, 0);
});
test('script non conforme : aucune vidéo générée', async () => {
  let lance = 0;
  const scenariste = { async creer() { return { ...bon, voixOff: 'Make money fast, guaranteed results' }; } };
  const { ctx } = ctxTemp({}, { scenariste, video: { async lancer() { lance++; return { id: 'x' }; } } });
  const r = await executerCycle(ctx);
  assert.equal(r.statut, 'bloque'); assert.equal(lance, 0);
});
test('échec de génération : aucune relance automatique', async () => {
  let lance = 0;
  const video = { async lancer() { lance++; return { id: 'v' }; }, async attendre() { throw new Error('échec'); } };
  const { ctx } = ctxTemp({}, { video });
  assert.equal((await executerCycle(ctx)).statut, 'echec_video'); assert.equal(lance, 1);
});
test('échec de publication : republiée au cycle suivant SANS regénérer', async () => {
  let lance = 0, essais = 0;
  const video = { async lancer() { lance++; return { id: 'v' }; }, async attendre() { return { url: 'u' }; }, async telecharger(u, f) { fs.writeFileSync(f, 'x'); } };
  const tiktok = { async publier() { if (++essais === 1) throw new Error('réseau'); return { publishId: 'p', confidentialite: 'PUBLIC_TO_EVERYONE', prive: false }; } };
  const { ctx } = ctxTemp({ MAX_VIDEOS_PAR_JOUR: '1' }, { video, tiktok });
  assert.equal((await executerCycle(ctx)).statut, 'echec_publication');
  await executerCycle(ctx);
  assert.equal(publications(ctx)[0].statut, 'publie'); assert.equal(lance, 1);
});
test('mode validation : attend l\'approbation puis publie', async () => {
  const { ctx } = ctxTemp({ MODE_PUBLICATION: 'validation' });
  const r = await executerCycle(ctx); assert.equal(r.statut, 'en_attente_validation');
  assert.equal((await approuver(ctx, r.id)).statut, 'publie');
});
test('créneaux : un créneau n\'est traité qu\'une fois', async () => {
  const { ctx } = ctxTemp({ HEURES_PUBLICATION: '12:00' }, { maintenant: () => new Date('2026-10-14T11:05:00Z') });
  assert.equal((await traiterCreneaux(ctx)).length, 1);
  assert.equal((await traiterCreneaux(ctx)).length, 0);
});

test('TikTok : séquence d\'appels et repli en privé si l\'audit manque', async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-'));
  const cfg = lireConfig({ MODE_SIMULATION: '0', TIKTOK_CLIENT_KEY: 'k', TIKTOK_CLIENT_SECRET: 's', TIKTOK_REFRESH_TOKEN: 'r', TIKTOK_AUDITE: '1' }, RACINE);
  const stock = creerStockage(dossier); const appels = []; let init;
  const fetchFalsif = async (url, opt = {}) => {
    appels.push((opt.method || 'GET') + ' ' + url.replace('https://open.tiktokapis.com', ''));
    const rep = (j, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => j });
    if (url.endsWith('/oauth/token/')) return rep({ access_token: 'A', refresh_token: 'R2' });
    if (url.endsWith('/creator_info/query/')) return rep({ data: { privacy_level_options: ['SELF_ONLY'] }, error: { code: 'ok' } });
    if (url.endsWith('/video/init/')) { init = JSON.parse(opt.body); return rep({ data: { publish_id: 'P1', upload_url: 'https://up.example/x' }, error: { code: 'ok' } }); }
    if (url.startsWith('https://up.example')) return rep({});
    if (url.endsWith('/status/fetch/')) return rep({ data: { status: 'PUBLISH_COMPLETE' }, error: { code: 'ok' } });
  };
  const fichier = path.join(dossier, 'v.mp4'); fs.writeFileSync(fichier, 'abc');
  const r = await creerTikTok(cfg, stock, { fetch: fetchFalsif, pause: async () => {} }).publier({ fichier, titre: 'Titre' });
  assert.equal(r.prive, true);
  assert.equal(init.post_info.privacy_level, 'SELF_ONLY');
  assert.equal(init.post_info.is_aigc, true);
  assert.equal(init.source_info.video_size, 3);
  assert.equal(stock.lire('tiktok-jeton.json', {}).refreshToken, 'R2');
  assert.deepEqual(appels, ['POST /v2/oauth/token/', 'POST /v2/post/publish/creator_info/query/', 'POST /v2/post/publish/video/init/', 'PUT https://up.example/x', 'POST /v2/post/publish/status/fetch/']);
});
