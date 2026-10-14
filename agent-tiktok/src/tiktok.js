// Publication sur TikTok via l'API officielle « Content Posting API » (publication directe).
// IMPORTANT : tant que l'application TikTok n'a pas passé l'audit, TikTok n'accepte que des vidéos PRIVÉES
// (SELF_ONLY). L'agent le détecte et le dit dans le journal au lieu de faire semblant.
// Les noms de champs suivent la documentation officielle à la date d'écriture : à revérifier au premier essai réel.
'use strict';
const fs = require('fs');
const http = require('http');

const API = 'https://open.tiktokapis.com';
const erreur = (code, message) => Object.assign(new Error(message), { code });
const attendre = ms => new Promise(r => setTimeout(r, ms));

function creerTikTok(cfg, stock, deps = {}) {
  const appel = deps.fetch || fetch;
  const pause = deps.pause || attendre;
  const t = cfg.tiktok;

  if (cfg.simulation) {
    return {
      simulation: true,
      async publier({ titre }) { return { publishId: 'simu-pub-' + Date.now(), statut: 'PUBLISH_COMPLETE', confidentialite: 'SIMULATION', titre }; }
    };
  }

  // Le jeton de rafraîchissement change à chaque renouvellement : on garde le dernier dans donnees/, jamais dans .env.
  async function jetonAcces() {
    if (!t.clientKey || !t.clientSecret) throw erreur(503, 'TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET absents.');
    const sauve = stock.lire('tiktok-jeton.json', {});
    const refresh = sauve.refreshToken || t.refreshToken;
    if (!refresh) throw erreur(503, 'Aucun compte TikTok connecté. Lance : node agent.js tiktok-connecter');
    const rep = await appel(API + '/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: t.clientKey, client_secret: t.clientSecret, grant_type: 'refresh_token', refresh_token: refresh }).toString() });
    const j = await rep.json().catch(() => ({}));
    if (!rep.ok || !j.access_token) throw erreur(401, 'TikTok a refusé le renouvellement de la connexion (le client doit reconnecter son compte).');
    stock.ecrire('tiktok-jeton.json', { refreshToken: j.refresh_token || refresh, majLe: new Date().toISOString() });
    return j.access_token;
  }

  async function api(chemin, jeton, corps) {
    const rep = await appel(API + chemin, { method: 'POST', headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(corps || {}) });
    const j = await rep.json().catch(() => ({}));
    const code = j.error && j.error.code;
    if (!rep.ok || (code && code !== 'ok')) throw erreur(rep.status || 502, 'TikTok : ' + (j.error && j.error.message || 'erreur ' + rep.status) + (code ? ' (' + code + ')' : ''));
    return j.data || {};
  }

  return {
    simulation: false,
    async publier({ fichier, titre }) {
      const jeton = await jetonAcces();
      const info = await api('/v2/post/publish/creator_info/query/', jeton);
      const options = info.privacy_level_options || [];
      let confidentialite = t.confidentialite;
      if (!options.includes(confidentialite)) confidentialite = options.includes('SELF_ONLY') ? 'SELF_ONLY' : options[0];
      if (!confidentialite) throw erreur(409, 'TikTok n\'autorise aucune confidentialité pour ce compte.');
      const taille = fs.statSync(fichier).size;
      if (taille > 64 * 1024 * 1024) throw erreur(413, 'Vidéo trop lourde pour l\'envoi en un seul bloc (64 Mo maximum).');

      const init = await api('/v2/post/publish/video/init/', jeton, {
        post_info: { title: titre, privacy_level: confidentialite, disable_comment: false, disable_duet: false, disable_stitch: false, is_aigc: true },
        source_info: { source: 'FILE_UPLOAD', video_size: taille, chunk_size: taille, total_chunk_count: 1 }
      });
      const envoi = await appel(init.upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(taille), 'Content-Range': 'bytes 0-' + (taille - 1) + '/' + taille }, body: fs.readFileSync(fichier) });
      if (!envoi.ok) throw erreur(502, 'Envoi de la vidéo refusé par TikTok (code ' + envoi.status + ').');

      let statut = 'PROCESSING_UPLOAD';
      for (let i = 0; i < 24; i++) {
        const s = await api('/v2/post/publish/status/fetch/', jeton, { publish_id: init.publish_id });
        statut = s.status || statut;
        if (statut === 'PUBLISH_COMPLETE') break;
        if (statut === 'FAILED') throw erreur(422, 'TikTok a refusé la vidéo : ' + (s.fail_reason || 'raison inconnue') + '.');
        await pause(5000);
      }
      return { publishId: init.publish_id, statut, confidentialite, prive: confidentialite === 'SELF_ONLY' };
    },

    // Assistant de connexion : le client autorise son compte, le jeton est rangé dans donnees/ (jamais affiché).
    async connecter() {
      if (!t.clientKey || !t.clientSecret) throw erreur(503, 'TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET absents du fichier .env.');
      const etat = Math.random().toString(36).slice(2);
      const url = 'https://www.tiktok.com/v2/auth/authorize/?' + new URLSearchParams({ client_key: t.clientKey, scope: 'user.info.basic,video.publish', response_type: 'code', redirect_uri: t.redirectUri, state: etat });
      const port = Number(new URL(t.redirectUri).port || 3456);
      console.log('Ouvre ce lien dans ton navigateur et autorise ton compte TikTok :\n' + url + '\n');
      const code = await new Promise((ok, ko) => {
        const srv = http.createServer((req, res) => {
          const u = new URL(req.url, 'http://localhost');
          if (u.pathname !== new URL(t.redirectUri).pathname) { res.writeHead(404); return res.end(); }
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          if (u.searchParams.get('state') !== etat || !u.searchParams.get('code')) { res.end('Connexion refusée. Reviens au terminal.'); srv.close(); return ko(erreur(400, 'Connexion TikTok annulée ou invalide.')); }
          res.end('Compte connecté. Tu peux fermer cette page.'); srv.close(); ok(u.searchParams.get('code'));
        }).listen(port, '127.0.0.1');
        setTimeout(() => { srv.close(); ko(erreur(408, 'Délai dépassé (5 minutes).')); }, 300000);
      });
      const rep = await appel(API + '/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_key: t.clientKey, client_secret: t.clientSecret, code, grant_type: 'authorization_code', redirect_uri: t.redirectUri }).toString() });
      const j = await rep.json().catch(() => ({}));
      if (!rep.ok || !j.refresh_token) throw erreur(401, 'TikTok n\'a pas donné de jeton de connexion.');
      stock.ecrire('tiktok-jeton.json', { refreshToken: j.refresh_token, majLe: new Date().toISOString() });
      return { ok: true };
    }
  };
}

module.exports = { creerTikTok };
