# Agent TikTok : vidéos de produits numériques, créées et publiées automatiquement

Un agent générique (pas lié à un seul produit) : tu décris les produits dans `catalogue.json`, il écrit les scripts, vérifie la conformité, génère la vidéo, puis publie sur TikTok aux heures choisies. Aucune dépendance à installer, seulement Node.js 18+.

## Ce que fait un cycle

1. Choisit le produit publié le moins récemment et un angle (problème, curiosité, résultat, démonstration, objection).
2. **Claude écrit le script** dans la langue du marché du produit (sans clé Anthropic : modèles de texte intégrés).
3. **Contrôle de conformité avant toute dépense.** Un script bloqué ne devient jamais une vidéo. Sont bloqués : promesses de gain, faux témoignages, prix absent de la fiche produit, chiffres de clients ou de ventes non vérifiés, mots interdits du produit.
4. Génère la vidéo (Higgsfield), **une seule tentative, jamais relancée automatiquement**.
5. Publie via l'API officielle TikTok (contenu signalé « généré par IA »). Si la publication échoue, elle est reprise plus tard **sans payer une nouvelle vidéo**.

## Garde-fous

| Garde-fou | Réglage |
|---|---|
| Simulation par défaut : rien n'est dépensé ni publié | `MODE_SIMULATION=1` (mettre `0` pour le réel) |
| Plafond de vidéos par jour | `MAX_VIDEOS_PAR_JOUR` |
| Plafond de dépense par jour | `MAX_DEPENSE_PAR_JOUR_USD` + `PRIX_PAR_SECONDE_USD` (obligatoire en réel, sinon l'agent refuse de démarrer une génération) |
| Pause immédiate | créer un fichier `donnees/STOP` |
| Publication automatique ou avec validation | `MODE_PUBLICATION=auto` ou `validation` |
| Journal complet | `donnees/journal.jsonl` |

## Démarrage

```
cd agent-tiktok
copy .env.example .env            (Windows)   /   cp .env.example .env   (autre)
copy catalogue.exemple.json catalogue.json    puis remplace les produits
node agent.js etat                # vérifie les réglages
node agent.js une-fois            # un cycle de test (simulation)
node agent.js demarrer            # tourne et publie aux heures HEURES_PUBLICATION
node agent.js publications        # derniers posts
node agent.js approuver <id>      # en mode validation
node agent.js tiktok-connecter    # connecte un compte TikTok
npm test                          # 29 tests
```

## La fiche produit (catalogue.json)

L'agent n'a le droit de citer **que** ce qui est écrit dans la fiche : `prix`, `garantie`, `faitsVerifies`. Un chiffre vrai (« 14 jours de remboursement ») doit y figurer pour être utilisé. `temoignagesVerifies` reste vide tant que tu n'as pas de vrais témoignages. `langue` et `marche` pilotent l'écriture : un produit pour les États-Unis est écrit en anglais naturel, pas traduit du français.

## Mode plateforme : abonnement mensuel + crédits (multi-clients)

Modèle retenu : le client paie un **forfait mensuel avec un quota de vidéos**. Quand le quota est épuisé, il **achète des crédits**. Tu paies les API avec ta propre clé ; le registre empêche tout client de dépasser ce qu'il a payé.

| Règle | Détail |
|---|---|
| 1 crédit = 1 vidéo | Durée fixée par le forfait (`plans.json`) |
| Ordre de consommation | Quota du mois d'abord, puis crédits achetés |
| Quota | Remis à zéro à la date anniversaire de l'abonnement, non reporté |
| Crédits achetés | Ne s'effacent pas |
| Abonnement impayé ou annulé | Aucune vidéo, même s'il reste des crédits achetés |
| Script bloqué par la conformité | Aucun crédit consommé |
| Échec de génération | Crédit rendu au client (désactivable : `REMBOURSER_ECHEC=0`) |
| Paiement notifié deux fois | Crédité une seule fois (référence de paiement unique) |
| Budget d'API | `MAX_DEPENSE_PLATEFORME_JOUR_USD` : somme de tous les clients, revérifiée avant chaque client |

```
copy plans.exemple.json plans.json        puis fixe tes forfaits (les valeurs de l'exemple n'ont aucune valeur de recommandation)
node agent.js client-ajouter marie starter --nom "Marie"
node agent.js crediter marie 10 <référence-du-paiement>
node agent.js client-statut marie impaye     (ou actif / annule)
node agent.js client-connecter marie         (le client autorise son TikTok)
node agent.js clients                        (quota et crédits restants)
node agent.js plateforme-demarrer
```

Chaque client a son dossier `donnees/clients/<id>/` : son `catalogue.json` (ses produits), son jeton TikTok, son journal et ses publications.

**Ce qui reste à construire** (rien de tout cela n'existe encore) : le site où le client s'abonne, connecte son TikTok et dépose son produit ; le branchement du prestataire de paiement, qui doit appeler `crediter` (pack acheté) et `client-statut` (abonnement payé ou impayé) ; les notifications « quota bientôt épuisé » ; la base de données hébergée (les fichiers JSON actuels suffisent pour un seul serveur et quelques clients).

## Limites à connaître avant de le vendre

- **Audit TikTok.** Tant que l'application TikTok (portail développeur, produit « Content Posting API ») n'est pas auditée, TikTok n'accepte que des vidéos **privées**. L'agent le détecte, publie en privé et l'indique dans le journal. Passer `TIKTOK_AUDITE=1` seulement après l'audit. Pour une offre multi-clients, une application auditée unique que chaque client autorise (`tiktok-connecter`) est le modèle le plus simple. Les règles de TikTok sur la publication entièrement automatique peuvent être examinées à l'audit : prévois `MODE_PUBLICATION=validation` en repli.
- **Non testé avec les vrais services.** Les tests couvrent la logique (conformité, plafonds, reprises, séquence d'appels TikTok simulée). Les appels réels à TikTok, Higgsfield et Anthropic n'ont pas été exécutés ici : les noms de champs viennent de la documentation et sont à vérifier au premier essai réel, en commençant par une vidéo privée.
- **`higgsfield-reglage.json`** (chemin du modèle et champs) vient du dépôt `serveur/` et reste à vérifier dans la documentation Higgsfield.
- **Coût réel** : à mesurer sur quelques vidéos avant de fixer le prix de vente de l'agent.
- **Aucun résultat commercial n'est promis** : ni nombre de vues, ni ventes.
