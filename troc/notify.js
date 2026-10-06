'use strict';
const fs = require('fs');
const path = require('path');

// Envoie un e-mail via Resend si RESEND_API_KEY est défini ; sinon écrit dans data/outbox.log
// (utile pour tester sans rien configurer).
async function sendMail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const dir = process.env.DATA_DIR || path.join(__dirname, 'data');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'outbox.log'), `--- ${new Date().toISOString()} → ${to}\n${subject}\n${text}\n\n`);
    console.log(`[mail simulé] → ${to} : ${subject}`);
    return { simulated: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Troc <onboarding@resend.dev>', to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { simulated: false };
}

module.exports = { sendMail };
