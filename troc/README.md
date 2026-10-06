# Troc — « Dépose ce que tu as, demande ce que tu veux »

Application sans dépendance (Node 18+). Lancer : `node server.js` puis ouvrir http://localhost:3000. Tests : `node test.js`.

## Fonctionnement
1. Une personne dépose « J'ai … » ou « Je cherche … » + son e-mail (gratuit).
2. À chaque dépôt, l'appli cherche une annonce opposée compatible (mots proches, accents/pluriels ignorés, même ville si précisée).
3. En cas de correspondance, **les deux personnes reçoivent un e-mail** : « on a trouvé une réponse, règle X € pour recevoir le contact ».
4. Le contact (e-mail de l'autre) n'est affiché qu'après paiement, côté de chacun séparément.

## Configuration (variables d'environnement)
| Variable | Rôle |
|---|---|
| `BASE_URL` | URL publique du site (liens dans les e-mails) |
| `PRICE_CENTS` / `CURRENCY` | Prix du déblocage (défaut 299 / eur) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (paiement via Checkout) |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook `POST /api/stripe-webhook`, événement `checkout.session.completed` |
| `RESEND_API_KEY` / `MAIL_FROM` | Envoi réel des e-mails (sinon simulés dans `data/outbox.log`) |
| `DEV_PAYMENTS=1` | Simule le paiement, **pour tester uniquement** |

Le déblocage ne se fait que via le webhook Stripe signé. Ne mets jamais les clés dans le code ni sur GitHub.

## Avant de le montrer sur TikTok
- Héberge-le (Render, Railway, Fly…) avec un disque persistant pour `data/`, ou passe à une vraie base.
- Mets à jour tes CGV/mentions légales : service payant, données personnelles (RGPD), droit de rétractation.
