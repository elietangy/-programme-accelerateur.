// Calcul des créneaux de publication dans le fuseau du client.
'use strict';

function jourLocal(date, fuseau) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuseau, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function minutesLocales(date, fuseau) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: fuseau, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Number(p.find(x => x.type === 'hour').value) * 60 + Number(p.find(x => x.type === 'minute').value);
}
function enMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error('Heure invalide dans HEURES_PUBLICATION : « ' + hhmm + ' » (format attendu 12:00).');
  return Number(m[1]) * 60 + Number(m[2]);
}

// Créneaux échus : heure passée depuis au plus « fenetreMin » minutes et pas encore traitée.
// Un créneau plus ancien est ignoré : on ne publie pas 3 vidéos d'un coup au redémarrage.
function creneauxEchus(maintenant, heures, fuseau, dejaFaits, fenetreMin) {
  const jour = jourLocal(maintenant, fuseau);
  const nowMin = minutesLocales(maintenant, fuseau);
  return heures
    .filter(h => { const ecart = nowMin - enMinutes(h); return ecart >= 0 && ecart <= fenetreMin; })
    .map(h => jour + ' ' + h)
    .filter(cle => !dejaFaits.includes(cle));
}

module.exports = { jourLocal, minutesLocales, enMinutes, creneauxEchus };
