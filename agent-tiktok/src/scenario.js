// Création du scénario : accroche, voix off, description visuelle, légende, hashtags.
// Avec ANTHROPIC_API_KEY : Claude écrit le script à partir de la fiche produit.
// Sans clé : modèles de texte intégrés (utile pour tester, moins varié).
'use strict';

const ANGLES = ['problème', 'curiosité', 'résultat', 'démonstration', 'objection'];

// Angle le moins utilisé récemment pour ce produit (variété sans effort).
function choisirAngle(produit, publications) {
  const permis = (produit.angles && produit.angles.length ? produit.angles : ANGLES);
  const recents = publications.filter(p => p.produitId === produit.id).slice(-permis.length * 2).map(p => p.angle);
  return permis.map(a => ({ a, n: recents.filter(x => x === a).length })).sort((x, y) => x.n - y.n)[0].a;
}

function modeleSecours(produit, angle, duree) {
  const fr = (produit.langue || 'fr').startsWith('fr');
  const cta = produit.cta || (fr ? 'Le lien est dans ma bio.' : 'Link in bio.');
  const hooks = fr
    ? { 'problème': 'Tu perds encore du temps là-dessus ?', 'curiosité': 'Ce que tu vois là change tout.', 'résultat': 'Une demande. Dix secondes. Terminé.', 'démonstration': 'Regarde ça en direct.', 'objection': 'Tu penses que ce n\'est pas pour toi ?' }
    : { 'problème': 'Still losing time on this?', 'curiosité': 'Watch what happens next.', 'résultat': 'One step. Ten seconds. Done.', 'démonstration': 'Watch this live.', 'objection': 'Think this is not for you?' };
  const hook = hooks[angle] || hooks['curiosité'];
  const voixOff = hook + ' ' + produit.nom + ' : ' + produit.promesse + ' ' + cta;
  return {
    angle, hook, voixOff,
    promptVideo: 'Vertical 9:16 video, ' + duree + ' seconds, person using a phone, natural lighting. A voice says in ' + (fr ? 'French' : 'English') + ': "' + voixOff + '". Clear on-screen captions.',
    legende: hook + ' ' + produit.promesse,
    hashtags: fr ? ['#astuce', '#productivite', '#fyp'] : ['#tips', '#productivity', '#fyp']
  };
}

function extraireJson(texte) {
  const debut = texte.indexOf('{'), fin = texte.lastIndexOf('}');
  if (debut < 0 || fin <= debut) throw new Error('Le modèle n\'a pas renvoyé de JSON.');
  return JSON.parse(texte.slice(debut, fin + 1));
}

function creerScenariste(cfg, deps = {}) {
  const appel = deps.fetch || fetch;
  return {
    async creer(produit, { angle, hooksRecents = [], retours = [] }) {
      if (!cfg.llm.apiKey) return modeleSecours(produit, angle, cfg.dureeVideo);
      const fiche = { nom: produit.nom, description: produit.description, promesse: produit.promesse, publicCible: produit.publicCible, prix: produit.prix, garantie: produit.garantie, cta: produit.cta, marche: produit.marche, ton: produit.ton, faitsVerifies: produit.faitsVerifies };
      const systeme = 'Tu écris des scripts de vidéos TikTok verticales courtes (' + cfg.dureeVideo + ' secondes) qui vendent un produit numérique. ' +
        'Langue de sortie : ' + (produit.langue || 'fr') + ', adaptée au marché « ' + (produit.marche || 'général') + ' » (vocabulaire naturel, pas de traduction littérale). ' +
        'RÈGLES ABSOLUES : n\'utilise QUE les faits de la fiche produit. N\'invente aucun chiffre, prix, résultat, témoignage ou statistique. ' +
        'Aucune promesse de gain d\'argent. Ne mentionne aucun autre créateur ni aucune marque tierce. ' +
        'Réponds uniquement par un objet JSON : {"hook": string (3 premières secondes), "voixOff": string (texte parlé complet, ' + (cfg.dureeVideo * 2.5 | 0) + ' mots maximum), "promptVideo": string (description visuelle et sonore pour un générateur de vidéo IA, en anglais, 9:16, avec la voix off entre guillemets), "legende": string, "hashtags": string[] (3 à 5)}.';
      const utilisateur = 'Fiche produit :\n' + JSON.stringify(fiche, null, 2) + '\n\nAngle à utiliser : ' + angle +
        (hooksRecents.length ? '\nAccroches déjà utilisées (à ne pas répéter) : ' + JSON.stringify(hooksRecents) : '') +
        (retours.length ? '\nTa version précédente a été refusée pour : ' + retours.join(' | ') + '. Corrige.' : '');
      const rep = await appel('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': cfg.llm.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: cfg.llm.modele, max_tokens: 1200, system: systeme, messages: [{ role: 'user', content: utilisateur }] })
      });
      if (!rep.ok) throw new Error('Écriture du script impossible (erreur ' + rep.status + ' de l\'API Anthropic).');
      const json = await rep.json();
      const texte = (json.content || []).map(b => b.text || '').join('');
      const s = extraireJson(texte);
      return { angle, hook: String(s.hook || ''), voixOff: String(s.voixOff || ''), promptVideo: String(s.promptVideo || ''), legende: String(s.legende || ''), hashtags: Array.isArray(s.hashtags) ? s.hashtags.map(String) : [] };
    }
  };
}

module.exports = { creerScenariste, choisirAngle, modeleSecours, ANGLES };
