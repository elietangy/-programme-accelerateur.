'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { findMatches } = require('./matching');
const { sendMail } = require('./notify');

const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC = path.join(__dirname, 'public');
const PRICE_CENTS = parseInt(process.env.PRICE_CENTS || '299', 10);
const CURRENCY = (process.env.CURRENCY || 'eur').toLowerCase();
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const DEV_PAYMENTS = process.env.DEV_PAYMENTS === '1'; // simule le paiement (tests uniquement)
const priceLabel = () => (PRICE_CENTS / 100).toFixed(2).replace('.', ',') + (CURRENCY === 'eur' ? ' €' : ' ' + CURRENCY.toUpperCase());

fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { posts: [], matches: [] };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

const rate = new Map(); // ip -> [timestamps]
function limited(ip, max = 20, windowMs = 3600_000) {
  const now = Date.now();
  const hits = (rate.get(ip) || []).filter(t => now - t < windowMs);
  hits.push(now);
  rate.set(ip, hits);
  return hits.length > max;
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type + '; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req, max = 10_000) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > max) { reject(new Error('trop gros')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}
async function readJson(req) {
  const raw = await readBody(req);
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('JSON invalide'); }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

function publicPost(p) { return { type: p.type, text: p.text, city: p.city }; }

async function notify(me, other) {
  const sujet = me.type === 'want' ? `Bonne nouvelle : quelqu’un a « ${me.text} »` : `Quelqu’un cherche ce que tu as : « ${me.text} »`;
  const corps = [
    me.type === 'want' ? 'Bonne nouvelle : on a trouvé une réponse à ta demande !' : 'Bonne nouvelle : on a trouvé quelqu’un pour ton annonce !',
    '',
    `Ton annonce : ${me.type === 'want' ? 'je cherche' : 'je propose'} « ${me.text} »`,
    `Correspondance : ${other.type === 'want' ? 'cherche' : 'propose'} « ${other.text} »${other.city ? ' (' + other.city + ')' : ''}`,
    '',
    `Pour recevoir le contact de cette personne, règle ${priceLabel()} (paiement sécurisé, une seule fois pour cette correspondance) :`,
    `${BASE_URL}/p/${me.token}`,
    '',
    'Déposer et être mis en relation est gratuit : tu ne paies que pour débloquer le contact.',
    'Reste prudent : rencontre-vous dans un lieu public et ne paie jamais l’autre personne à l’avance.',
  ].join('\n');
  try { await sendMail({ to: me.email, subject: sujet, text: corps }); return true; }
  catch (e) { console.error('Envoi échoué', me.email, e.message); return false; }
}

async function createPost(req, res, ip) {
  if (limited(ip)) return send(res, 429, { error: 'Trop de dépôts, réessaie plus tard.' });
  let b; try { b = await readJson(req); } catch (e) { return send(res, 400, { error: e.message }); }
  const post = {
    id: crypto.randomUUID(), token: crypto.randomBytes(16).toString('hex'),
    type: b.type === 'have' ? 'have' : b.type === 'want' ? 'want' : null,
    text: clean(b.text, 200), city: clean(b.city, 60), email: clean(b.email, 120).toLowerCase(),
    active: true, createdAt: new Date().toISOString(),
  };
  if (!post.type) return send(res, 400, { error: 'Choisis « J’ai » ou « Je cherche ».' });
  if (post.text.length < 3) return send(res, 400, { error: 'Décris ce que tu as / cherches (3 caractères minimum).' });
  if (!EMAIL_RE.test(post.email)) return send(res, 400, { error: 'E-mail invalide.' });
  if (b.consent !== true) return send(res, 400, { error: 'Accepte les conditions : contact débloqué après paiement, et ton e-mail transmis à la personne correspondante.' });

  const found = findMatches(post, db.posts);
  db.posts.push(post);
  const made = [];
  for (const { post: other, score } of found) {
    const already = db.matches.filter(m => m.a === other.id || m.b === other.id).length;
    if (already >= 5) continue; // évite de spammer une annonce très populaire
    db.matches.push({ id: crypto.randomUUID(), a: post.id, b: other.id, score, at: new Date().toISOString(), paid: { a: false, b: false } });
    made.push(other);
  }
  save();
  for (const other of made) { await notify(post, other); await notify(other, post); }
  send(res, 201, { token: post.token, link: `${BASE_URL}/p/${post.token}`, matches: made.length });
}

function postByToken(token) { return db.posts.find(p => p.token === token); }

function sideOf(m, p) { return m.a === p.id ? 'a' : 'b'; }

function status(res, token) {
  const p = postByToken(token);
  if (!p) return send(res, 404, { error: 'Annonce introuvable.' });
  const matches = db.matches.filter(m => m.a === p.id || m.b === p.id).map(m => {
    const o = db.posts.find(x => x.id === (m.a === p.id ? m.b : m.a));
    if (!o) return null;
    const unlocked = !!m.paid?.[sideOf(m, p)];
    return { id: m.id, ...publicPost(o), unlocked, email: unlocked ? o.email : undefined, at: m.at };
  }).filter(Boolean);
  send(res, 200, { ...publicPost(p), active: p.active, createdAt: p.createdAt, price: priceLabel(), matches });
}

function unlock(matchId, side) {
  const m = db.matches.find(x => x.id === matchId);
  if (!m || (side !== 'a' && side !== 'b')) return false;
  m.paid = m.paid || { a: false, b: false };
  m.paid[side] = true; save(); return true;
}

async function pay(req, res, token) {
  const p = postByToken(token);
  if (!p) return send(res, 404, { error: 'Annonce introuvable.' });
  let b; try { b = await readJson(req); } catch (e) { return send(res, 400, { error: e.message }); }
  const m = db.matches.find(x => x.id === b.matchId && (x.a === p.id || x.b === p.id));
  if (!m) return send(res, 404, { error: 'Correspondance introuvable.' });
  const side = sideOf(m, p);
  if (m.paid?.[side]) return send(res, 200, { url: `${BASE_URL}/p/${token}` });
  if (!STRIPE_KEY) {
    if (!DEV_PAYMENTS) return send(res, 503, { error: 'Paiement non configuré.' });
    unlock(m.id, side); return send(res, 200, { url: `${BASE_URL}/p/${token}` });
  }
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': CURRENCY,
    'line_items[0][price_data][unit_amount]': String(PRICE_CENTS),
    'line_items[0][price_data][product_data][name]': 'Contact de ta correspondance',
    'metadata[matchId]': m.id, 'metadata[side]': side,
    customer_email: p.email,
    success_url: `${BASE_URL}/p/${token}?paid=1`, cancel_url: `${BASE_URL}/p/${token}`,
  });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
  });
  const j = await r.json();
  if (!r.ok) { console.error('Stripe', j.error?.message); return send(res, 502, { error: 'Paiement indisponible, réessaie.' }); }
  send(res, 200, { url: j.url });
}

// Webhook Stripe : seul moyen de débloquer (on ne fait jamais confiance au navigateur).
async function webhook(req, res) {
  let raw; try { raw = await readBody(req, 64_000); } catch { return send(res, 400, { error: 'trop gros' }); }
  if (!WEBHOOK_SECRET) return send(res, 503, { error: 'Webhook non configuré' });
  const sig = Object.fromEntries((req.headers['stripe-signature'] || '').split(',').map(kv => kv.split('=')));
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${sig.t}.${raw}`).digest('hex');
  const ok = sig.v1 && sig.v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig.v1), Buffer.from(expected));
  if (!ok || Math.abs(Date.now() / 1000 - Number(sig.t)) > 600) return send(res, 400, { error: 'signature invalide' });
  const ev = JSON.parse(raw);
  if (ev.type === 'checkout.session.completed' && ev.data.object.payment_status === 'paid') {
    const md = ev.data.object.metadata || {}; unlock(md.matchId, md.side);
  }
  send(res, 200, { received: true });
}

function remove(res, token) {
  const p = postByToken(token);
  if (!p) return send(res, 404, { error: 'Annonce introuvable.' });
  db.posts = db.posts.filter(x => x.id !== p.id);
  db.matches = db.matches.filter(m => m.a !== p.id && m.b !== p.id);
  save();
  send(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  try {
    if (req.method === 'POST' && url.pathname === '/api/posts') return await createPost(req, res, ip);
    if (url.pathname === '/api/stats') return send(res, 200, { posts: db.posts.length, matches: db.matches.length, price: priceLabel() });
    if (req.method === 'POST' && url.pathname === '/api/stripe-webhook') return await webhook(req, res);
    const pm = url.pathname.match(/^\/api\/posts\/([a-f0-9]{32})\/pay$/);
    if (pm && req.method === 'POST') return await pay(req, res, pm[1]);
    const m = url.pathname.match(/^\/api\/posts\/([a-f0-9]{32})$/);
    if (m && req.method === 'GET') return status(res, m[1]);
    if (m && req.method === 'DELETE') return remove(res, m[1]);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/p/')))
      return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8'), 'text/html');
    send(res, 404, { error: 'Introuvable' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Erreur serveur' });
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`Troc prêt sur ${BASE_URL}`));
module.exports = server;
