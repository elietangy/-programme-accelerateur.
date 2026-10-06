'use strict';
// Logique de correspondance : pure, sans effet de bord (facile à tester).

const STOP = new Set(['les','des','une','un','le','la','du','de','et','ou','en','au','aux','pour','avec','sans','sur','dans','par','que','qui','mon','ma','mes','ton','ta','tes','son','sa','ses','je','tu','il','elle','on','nous','vous','ils','cherche','recherche','veux','voudrais','besoin','donne','vends','propose','ai','avoir','etat','bon','tres','plus','tout','tous','ce','cet','cette','ces','est','sont','the','and','for']);

function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function stem(t) {
  return t.length > 3 ? t.replace(/(s|x)$/, '') : t;
}

function tokens(text) {
  const out = new Set();
  for (const raw of normalize(text).split(/[^a-z0-9]+/)) {
    if (!raw || STOP.has(raw)) continue;
    if (raw.length < 3 && !/^\d+$/.test(raw)) continue;
    out.add(stem(raw));
  }
  return [...out];
}

function sameWord(a, b) {
  if (a === b) return true;
  // « velo » ~ « velos », « telephone » ~ « telephones » déjà géré par le stem ;
  // ici on tolère les variantes proches (« ordinateur » ~ « ordinateurs portable »).
  return a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5);
}

// Score entre 0 et 1 : part des mots de la plus courte annonce retrouvés dans l'autre.
function score(textA, textB) {
  const a = tokens(textA), b = tokens(textB);
  if (!a.length || !b.length) return 0;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const shared = short.filter(t => long.some(u => sameWord(t, u))).length;
  return shared / short.length;
}

const THRESHOLD = 0.6;

function cityOk(a, b) {
  const x = normalize(a.city).trim(), y = normalize(b.city).trim();
  return !x || !y || x === y; // ville vide = partout
}

// Trouve, pour `post`, les annonces opposées compatibles (meilleures d'abord).
function findMatches(post, all, limit = 3) {
  const opposite = post.type === 'have' ? 'want' : 'have';
  return all
    .filter(o => o.type === opposite && o.active && o.id !== post.id && o.email !== post.email && cityOk(post, o))
    .map(o => ({ post: o, score: score(post.text, o.text) }))
    .filter(m => m.score >= THRESHOLD)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

module.exports = { tokens, score, findMatches, normalize, THRESHOLD };
