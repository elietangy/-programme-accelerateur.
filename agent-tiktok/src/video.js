// Génération de la vidéo (Higgsfield). Ne relance JAMAIS automatiquement une génération.
// Le chemin du modèle et les champs viennent de higgsfield-reglage.json (à vérifier dans la doc officielle).
'use strict';
const fs = require('fs');
const path = require('path');

const attendre = ms => new Promise(r => setTimeout(r, ms));
const erreur = (code, message) => Object.assign(new Error(message), { code });

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
function trouverUrlVideo(obj) {
  if (typeof obj === 'string') return /^https?:\/\/\S+/.test(obj) && /\.(mp4|mov|webm)(\?|$)/i.test(obj) ? obj : null;
  if (Array.isArray(obj)) { for (const v of obj) { const u = trouverUrlVideo(v); if (u) return u; } return null; }
  if (obj && typeof obj === 'object') { for (const v of Object.values(obj)) { const u = trouverUrlVideo(v); if (u) return u; } }
  return null;
}
function messageHttp(statut, extrait) {
  if (statut === 401 || statut === 403) return 'Higgsfield refuse la clé (incorrecte ou désactivée).';
  if (statut === 402 || /credit|balance|insufficient/i.test(extrait)) return 'Crédits insuffisants sur le compte Higgsfield.';
  if (statut === 429) return 'Trop de demandes envoyées à Higgsfield.';
  if (statut === 404) return 'Chemin du modèle introuvable : vérifier « endpointModele » dans higgsfield-reglage.json.';
  if (statut === 400 || statut === 422) return 'Higgsfield a refusé la demande (réglage incorrect). Détail : ' + extrait;
  return 'Erreur Higgsfield ' + statut + '. Détail : ' + extrait;
}

function creerVideo(cfg, deps = {}) {
  const appel = deps.fetch || fetch;
  const pause = deps.pause || attendre;
  const h = cfg.higgsfield;

  async function http(methode, chemin, corps) {
    const ctrl = new AbortController();
    const minuterie = setTimeout(() => ctrl.abort(), 30000);
    try {
      const rep = await appel(h.baseUrl + chemin, { method: methode, signal: ctrl.signal, body: corps ? JSON.stringify(corps) : undefined,
        headers: { Authorization: 'Key ' + h.keyId + ':' + h.keySecret, 'Content-Type': 'application/json', Accept: 'application/json' } });
      const texte = await rep.text(); let json = null; try { json = JSON.parse(texte); } catch (e) { /* non JSON */ }
      return { ok: rep.ok, statut: rep.status, json, extrait: texte.replace(/\s+/g, ' ').slice(0, 300) };
    } catch (e) { throw erreur(502, 'Higgsfield injoignable ou trop lent (rien n\'a été relancé).'); } finally { clearTimeout(minuterie); }
  }

  if (cfg.simulation) {
    return {
      simulation: true,
      async lancer() { return { id: 'simu-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) }; },
      async attendre() { return { url: 'simulation://video' }; },
      async telecharger(url, fichier) { fs.writeFileSync(fichier, 'SIMULATION : aucune vraie vidéo.'); return fichier; }
    };
  }

  return {
    simulation: false,
    async lancer({ prompt, duree, format, resolution }) {
      if (!h.keyId || !h.keySecret) throw erreur(503, 'Clé Higgsfield absente (HIGGSFIELD_KEY_ID / HIGGSFIELD_KEY_SECRET).');
      const r = (() => { try { return JSON.parse(fs.readFileSync(h.reglage, 'utf8')); } catch (e) { return {}; } })();
      if (!r.endpointModele || !r.corps) throw erreur(503, 'higgsfield-reglage.json incomplet. Aucune demande envoyée.');
      const rep = await http('POST', r.endpointModele, remplacer(r.corps, { prompt, duree, format, resolution, audio: true }));
      if (!rep.ok) throw erreur(rep.statut, messageHttp(rep.statut, rep.extrait));
      const id = rep.json && (rep.json.request_id || rep.json.id);
      if (!id) throw erreur(502, 'Higgsfield a répondu sans numéro de demande : ' + rep.extrait);
      return { id };
    },
    async attendre(id) {
      const limite = Date.now() + h.delaiMaxMin * 60000;
      while (Date.now() < limite) {
        const rep = await http('GET', '/requests/' + encodeURIComponent(id) + '/status');
        if (!rep.ok) throw erreur(rep.statut, messageHttp(rep.statut, rep.extrait));
        const s = String(rep.json && rep.json.status || '');
        if (s === 'completed') {
          const url = (rep.json.video && rep.json.video.url) || trouverUrlVideo(rep.json);
          if (!url) throw erreur(502, 'Vidéo terminée mais adresse du fichier introuvable : ' + rep.extrait);
          return { url };
        }
        if (s === 'failed' || s === 'nsfw') throw erreur(422, 'La génération a échoué (' + s + '). Rien n\'est relancé automatiquement.');
        await pause(15000);
      }
      throw erreur(504, 'Délai de ' + h.delaiMaxMin + ' minutes dépassé. Rien n\'est relancé automatiquement.');
    },
    async telecharger(url, fichier) {
      const rep = await appel(url);
      if (!rep.ok) throw erreur(502, 'Téléchargement de la vidéo impossible (code ' + rep.status + ').');
      fs.mkdirSync(path.dirname(fichier), { recursive: true });
      fs.writeFileSync(fichier, Buffer.from(await rep.arrayBuffer()));
      return fichier;
    }
  };
}

module.exports = { creerVideo, remplacer };
