# Serveur vidéo : guide pas à pas (Windows)

Ce petit serveur tourne **sur ton ordinateur seulement**. Il garde ta clé Higgsfield secrète et applique tes plafonds de crédits. Il ne publie rien.

**Règle d'or : ta clé API ne se colle jamais dans le chat, jamais dans un fichier envoyé sur GitHub, jamais dans une capture d'écran.** Elle va seulement dans le fichier `.env` de ton PC.

---

## Étape A : installer Node.js (une seule fois)

Node.js est le programme qui fait tourner le serveur.

1. Va sur **nodejs.org** et télécharge la version **LTS** (le gros bouton vert).
2. Ouvre le fichier téléchargé et clique sur « Next » jusqu'à la fin (garde les options par défaut).
3. Vérifie : appuie sur la touche **Windows**, tape **cmd**, appuie sur Entrée. Dans la fenêtre noire, tape :
   ```
   node -v
   ```
   Tu dois voir un numéro comme `v22.x.x`. Il faut **18 ou plus**. Si Windows dit que « node » n'est pas reconnu, redémarre l'ordinateur et recommence.

## Étape B : récupérer le dossier du projet

(Après que le projet a été publié sur GitHub.)

1. Ouvre ton dépôt GitHub `elietangy/-programme-accelerateur.`
2. Clique sur le bouton vert **Code**, puis **Download ZIP**.
3. Clic droit sur le fichier ZIP téléchargé, puis **Extraire tout**. Mets le dossier sur le Bureau.
4. Ouvre le dossier extrait, puis le dossier **serveur**.

## Étape C : créer ton fichier de réglages `.env`

1. Dans le dossier **serveur**, tu vois un fichier `.env.example` (c'est un modèle, sans clé).
2. Ouvre une fenêtre noire **dans ce dossier** : clique dans la barre d'adresse de l'explorateur de fichiers (en haut), tape `cmd`, appuie sur Entrée.
3. Tape cette ligne, puis Entrée :
   ```
   copy .env.example .env
   ```
4. Le fichier `.env` existe maintenant. (S'il reste invisible, dans l'explorateur : onglet **Affichage**, cocher **Extensions de noms de fichiers**.)

## Étape D : tester SANS clé et SANS frais

Le modèle `.env` est réglé sur `MODE_SIMULATION=1` : le serveur fait semblant, il n'appelle pas Higgsfield et ne coûte rien.

1. Double-clique sur **demarrer.bat** (dans le dossier serveur).
2. Une fenêtre noire s'ouvre et affiche « Serveur vidéo prêt ». **Ne la ferme pas** pendant que tu travailles.
3. Ouvre ton navigateur et va sur : **http://localhost:3000/api/etat**
   Tu dois voir un texte avec `"simulation":true`. C'est bon.
4. Pour arrêter le serveur : ferme la fenêtre noire.

Tu peux ouvrir la page vidéo par : **http://localhost:3000/video.html** (ouvre-la toujours par cette adresse quand tu veux générer, pas par la version sur GitHub).

## Étape E : mettre ta clé (seulement quand tu es prêt à utiliser le vrai service)

À faire plus tard, avec moi, après l'étape 4. Rappel de la marche à suivre :

1. Dans ta console Higgsfield (d'après les informations que j'ai lues : **console.higgsfield.ai**, les menus peuvent différer), crée une clé API. Elle a **deux parties** : un identifiant et un secret. **Le secret ne s'affiche qu'une seule fois** : copie-le tout de suite.
2. Ferme le serveur. Ouvre le fichier `.env` avec le **Bloc-notes** (clic droit, Ouvrir avec, Bloc-notes).
3. Remplace seulement ce qui est après le signe `=` :
   ```
   HIGGSFIELD_KEY_ID=ton-identifiant
   HIGGSFIELD_KEY_SECRET=ton-secret
   ```
   Pas d'espace, pas de guillemets.
4. Quand je te le dirai, change `MODE_SIMULATION=1` en `MODE_SIMULATION=0`.
5. Enregistre (Ctrl + S), ferme le Bloc-notes, relance **demarrer.bat**. La fenêtre doit afficher « Clé Higgsfield : trouvée dans .env » (elle n'affiche jamais la clé elle-même).

**Si tu penses que ta clé a fuité** (partagée par erreur, capture d'écran montrée, etc.) : supprime-la tout de suite dans la console Higgsfield et crée-en une nouvelle.

## Étape F : générer une vidéo depuis la page (sans copier le prompt)

1. Lance **demarrer.bat** et ouvre **http://localhost:3000/video.html** (pas la version GitHub : elle ne peut pas parler à ton serveur).
2. Va tout en bas, section **« 6. Générer la vidéo avec Higgsfield »**. Le haut de cette section te dit en vert, orange ou rouge si tout est prêt (mode, clé, réglage, plafonds).
3. Choisis le **hook** (le D pour ton premier test) et la **résolution** (480p ou 720p coûtent moins que 1080p). Le prompt est déjà écrit : tu peux le relire et le modifier.
4. Dans la section 1, saisis le **prix par seconde** de ta console Higgsfield pour voir le coût estimé.
5. Clique sur **« Générer UNE vidéo test… »**. Un encadré jaune te résume tout. Coche la case de confirmation, puis **« Oui, lancer cette vidéo »**. Rien ne part avant.
6. La page suit l'état toute seule (en attente, en cours, terminée, échouée). Quand c'est **terminée**, la vidéo s'affiche et un bouton te permet de la **télécharger**. Regarde-la avant de publier : l'application ne publie rien.
7. Si ça échoue, la page affiche l'erreur en français et **ne relance rien**. C'est toi qui décides.

**Important sur l'argent :** d'après les informations que j'ai lues, l'API Higgsfield se paie **à l'usage, en dollars, séparément de l'abonnement de l'application web**. Les crédits de ton plan Pro ne servent peut-être pas pour l'API (à vérifier dans ta console). Le prix par seconde est à lire dans ta console : je ne le connais pas.

## Tes plafonds de crédits

Dans `.env` :
- `MAX_VIDEOS_PAR_JOUR=3` : le serveur refuse la 4e génération du jour.
- `MAX_VIDEOS_PAR_SESSION=2` : le serveur refuse la 3e depuis son démarrage (fermer puis rouvrir le serveur recommence une session).

Seules les demandes **acceptées** par Higgsfield sont comptées.

## Ce que le serveur ne fait jamais

- Il ne publie rien et ne partage rien.
- Il ne lance une génération que si la page envoie ton accord explicite pour cette génération.
- Il ne relance jamais une génération qui échoue : il affiche l'erreur en français et attend ta décision.
- Il n'affiche et ne sauvegarde jamais ta clé.
- Il n'accepte que les connexions venant de ton propre ordinateur.

## Réglage Higgsfield (fichier `higgsfield-reglage.json`)

Ce fichier contient le chemin du modèle vidéo et les noms exacts des champs à envoyer à Higgsfield. **Je ne les connais pas encore** : ils viennent de la documentation officielle. Tant qu'il est vide, le serveur refuse de générer avec le vrai service (le mode simulation fonctionne quand même). On le remplira ensemble à l'étape 4.

## Messages d'erreur courants

| Message | Que faire |
|---|---|
| « node n'est pas reconnu » | Redémarre le PC après l'installation de Node.js, ou réinstalle-le. |
| La fenêtre se ferme tout de suite | Ouvre une fenêtre noire dans le dossier serveur et tape `node serveur.js` pour voir l'erreur. |
| « EADDRINUSE » | Le serveur tourne déjà ailleurs, ou le port 3000 est pris : ferme l'autre fenêtre, ou mets `PORT=3001` dans `.env`. |
| « Aucune clé Higgsfield » | La clé n'est pas dans `.env` (étape E). |
| « Higgsfield refuse ta clé » | Identifiant ou secret mal copié, ou clé supprimée. Recrée une clé. |
| « Crédits insuffisants » | Recharge ton compte dans la console Higgsfield. |
| « Plafond atteint » | Voulu : change les plafonds dans `.env` seulement si tu le décides. |
