# Registre-École

Application de gestion administrative et comptable pour une école maternelle et primaire publique (secrétariat, facturation, paiements, dépenses, rapports). Application mono-école, à un seul utilisateur (la secrétaire-comptable).

## Structure du projet

```
backend/    API Node.js/Express + base SQLite (node:sqlite)
frontend/   Application React (Vite) + Tailwind CSS
```

## Stack technique

- **Backend** : Node.js (≥ 22.5) + Express + `node:sqlite` (module natif, encore expérimental)
- **Frontend** : React + Vite + Tailwind CSS
- **Authentification** : compte unique, mot de passe haché avec bcrypt, session via JWT stocké dans un cookie `httpOnly`
- **PDF** : génération avec `pdfkit` (reçus de factures, rapports journaliers, exports)
- **Justificatifs de dépenses** : téléversement de fichiers (image ou PDF) stockés sur disque

## Installation en local

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # ajustez JWT_SECRET notamment
npm run migrate             # crée la base SQLite et ses tables
ADMIN_IDENTIFIANT=admin ADMIN_MOT_DE_PASSE=votre-mot-de-passe npm run seed
npm run dev                 # démarre l'API sur http://localhost:4000
```

`npm run seed` crée le compte de connexion (identifiant + mot de passe fournis via les variables d'environnement, ou de façon interactive si vous lancez la commande dans un terminal sans définir ces variables) ainsi que les données de référence : les 8 classes, les 8 types de frais et les 5 catégories de dépenses par défaut, une année scolaire active.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL doit pointer vers l'API backend
npm run dev                 # démarre l'interface sur http://localhost:5173
```

Connectez-vous avec l'identifiant et le mot de passe créés à l'étape précédente.

## Déploiement en production

### Frontend → Netlify

Le fichier `netlify.toml` à la racine du dépôt configure déjà Netlify (dossier `frontend`, commande `npm run build`, publication de `frontend/dist`). Il suffit de :
1. Connecter le dépôt Git à Netlify.
2. Définir la variable d'environnement `VITE_API_URL` dans les paramètres du site Netlify, pointant vers l'URL de votre backend déployé.
3. Déployer.

### Backend + base SQLite → hébergeur avec disque persistant

**Le fichier SQLite doit être stocké sur un disque persistant.** Un hébergement dont le système de fichiers est réinitialisé à chaque redémarrage (ex. Render en plan gratuit) ferait perdre toutes les données. Options recommandées, par ordre de préférence pour ce projet :

| Option | Avantages | Inconvénients |
|---|---|---|
| **Railway** (recommandé) | Déploiement simple depuis Git, volume persistant facile à attacher | Facturation à l'usage |
| VPS léger (droplet, Hostinger, o2switch…) | Contrôle total, disque persistant natif, coût fixe | Maintenance manuelle (nginx, process manager, SSL) |
| Render (plan payant avec disque persistant) | Simplicité proche de Railway | Coût plus élevé que Railway à ressources égales |

Étapes générales de déploiement backend :
1. Provisionner un volume/disque persistant et pointer `DB_DIR` vers ce volume.
2. Définir les variables d'environnement de production (`JWT_SECRET` fort et unique, `NODE_ENV=production`, `FRONTEND_ORIGIN` = URL Netlify du frontend).
3. Exécuter `npm run migrate` puis `npm run seed` (avec `ADMIN_IDENTIFIANT`/`ADMIN_MOT_DE_PASSE`) au premier déploiement.
4. Démarrer avec `npm start`.

## Sauvegardes

**Le disque du serveur n'est pas une sauvegarde.** Un script est fourni (`backend/scripts/backup.js`, exécutable via `npm run backup` depuis `backend/`) qui archive le fichier SQLite et le dossier des justificatifs dans `backend/backups/`. Il est fortement recommandé de :
- Planifier son exécution régulière (quotidienne) via une tâche planifiée (cron sur VPS, ou tâche planifiée de l'hébergeur).
- Copier régulièrement le contenu de `backend/backups/` vers un espace de stockage externe (cloud, disque externe), car une sauvegarde qui reste sur le même serveur ne protège pas contre une panne de ce serveur.

## Sécurité et données des élèves

- Les mots de passe ne sont jamais stockés en clair (hachage bcrypt).
- La session est authentifiée par un cookie `httpOnly` (non accessible en JavaScript), limitant les risques de vol de session par script malveillant (XSS).
- L'application contient des données sensibles (identité des élèves, coordonnées des parents, informations financières) : l'accès au serveur, à la base de données et aux sauvegardes doit être strictement limité à la secrétaire-comptable et aux personnes autorisées de l'école.
- Pensez à activer HTTPS en production (fourni automatiquement par Netlify côté frontend ; à configurer côté hébergeur backend — Railway le fournit automatiquement, un VPS nécessite un certificat, par exemple via Let's Encrypt).

## Limites connues

- `node:sqlite` est un module encore marqué expérimental par Node.js : son comportement peut évoluer dans de futures versions de Node. Node ≥ 22.5 est requis en production.
- Application conçue pour une seule école et un seul utilisateur ; une gestion multi-écoles ou multi-utilisateurs nécessiterait une évolution du modèle de données et de l'authentification.
- Les justificatifs de dépenses sont stockés sur le disque du serveur : assurez-vous que le plan d'hébergement retenu dispose d'un espace disque suffisant et est inclus dans la stratégie de sauvegarde.
