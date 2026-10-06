'use strict';
const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path');
process.env.DEV_PAYMENTS = '1';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'troc-'));
const { score, findMatches } = require('./matching');
const server = require('./server');

// Matching
assert(score('vélo électrique', 'Velos electriques') >= 0.9);
assert(score('vélo', 'canapé') === 0);
assert(score('un vélo', 'vélo électrique adulte') >= 0.6);
const base = { id: 'x', email: 'a@a.fr', type: 'want', text: 'vélo', city: 'Lyon', active: true };
assert.strictEqual(findMatches(base, [{ id: 'y', email: 'b@b.fr', type: 'have', text: 'vélo', city: 'Paris', active: true }]).length, 0);
assert.strictEqual(findMatches(base, [{ id: 'y', email: 'b@b.fr', type: 'have', text: 'vélo', city: '', active: true }]).length, 1);
assert.strictEqual(findMatches(base, [{ id: 'y', email: 'a@a.fr', type: 'have', text: 'vélo', city: '', active: true }]).length, 0);

// API de bout en bout
server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (b) => fetch(base + '/api/posts', { method: 'POST', body: JSON.stringify(b) });
  try {
    let r = await post({ type: 'have', text: 'Vélo électrique', email: 'alice@ex.fr', consent: true });
    assert.strictEqual(r.status, 201); const a = await r.json(); assert.strictEqual(a.matches, 0);
    r = await post({ type: 'want', text: 'un vélo', email: 'bob@ex.fr', consent: true });
    const b = await r.json(); assert.strictEqual(b.matches, 1);
    const out = fs.readFileSync(path.join(process.env.DATA_DIR, 'outbox.log'), 'utf8');
    assert(out.includes('→ alice@ex.fr') && out.includes('→ bob@ex.fr'));
    assert(!out.includes('bob@ex.fr\n') || !/Pour le\/la contacter/.test(out), 'le contact ne doit pas être dans le mail');
    assert(/règle 2,99 €/.test(out));
    let st = await (await fetch(`${base}/api/posts/${a.token}`)).json();
    assert.strictEqual(st.matches[0].unlocked, false);
    assert.strictEqual(st.matches[0].email, undefined, 'contact masqué avant paiement');
    const pr = await fetch(`${base}/api/posts/${a.token}/pay`, { method: 'POST', body: JSON.stringify({ matchId: st.matches[0].id }) });
    assert.strictEqual(pr.status, 200);
    st = await (await fetch(`${base}/api/posts/${a.token}`)).json();
    assert.strictEqual(st.matches[0].email, 'bob@ex.fr');
    // l'autre côté n'a pas payé : toujours verrouillé
    const sb = await (await fetch(`${base}/api/posts/${b.token}`)).json();
    assert.strictEqual(sb.matches[0].email, undefined);
    assert.strictEqual((await fetch(`${base}/api/stripe-webhook`, { method: 'POST', body: '{}' })).status, 503);
    assert.strictEqual((await post({ type: 'have', text: 'x', email: 'bad', consent: true })).status, 400);
    assert.strictEqual((await post({ type: 'have', text: 'table', email: 'c@c.fr' })).status, 400);
    assert.strictEqual((await fetch(`${base}/api/posts/${a.token}`, { method: 'DELETE' })).status, 200);
    assert.strictEqual((await fetch(`${base}/api/posts/${a.token}`)).status, 404);
    assert.strictEqual((await fetch(`${base}/p/${b.token}`)).status, 200);
    console.log('Tous les tests passent ✅');
  } catch (e) { console.error(e); process.exitCode = 1; }
  server.close();
});
