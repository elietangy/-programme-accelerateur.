# DIRECTOIRE MARKETING IA — Audit et conception (Mission 1)

> Date : 9 octobre 2026 · Version 1.0 · Propriétaire : Kouagou
> Statut des informations : **[V]** vérifié dans le dépôt · **[H]** hypothèse à confirmer · **[?]** à vérifier avant décision.
> Aucun chiffre de marché n'est donné ici : je n'ai pas fait de recherche en ligne dans cette mission. Tout chiffre de marché devra être sourcé (module 1) avant d'être utilisé.

---

## 1. Diagnostic de tes besoins

### 1.1 Ce que le dépôt montre déjà [V]
- **Une offre concrète et datée** : formation présentielle « L'IA Pratique pour Tous », samedi 31 octobre 2026, 9h–13h, ONG ADIL à Porto-Novo, 15 000 FCFA, 40 places, inscriptions closes le 27 octobre, avance de 5 000 FCFA remboursable (`strategie-video.js`).
- **Un parcours déjà pensé** : post/vidéo → page de réservation TinyPages → agent IA → groupe WhatsApp → avance → paiement du solde.
- **Des règles de conformité déjà écrites** : aucune promesse de gain, aucun faux témoignage, aucune adresse inventée, rien de publié ni dépensé sans ton accord.
- **Des outils déjà construits** : générateur de posts (`posts.html`, `posts-du-jour.html`), module vidéo + petit serveur local avec plafonds de crédits (`video.html`, `serveur/`), et une page d'accompagnement trading (`index.html`, `outil-trading.html`).

### 1.2 Les vrais problèmes (par ordre d'importance)
| # | Problème | Pourquoi c'est important |
|---|---|---|
| 1 | **Compte à rebours** : 18 jours avant la clôture (27 oct.), 22 jours avant la formation. | Chaque semaine sans mesure est une semaine perdue. La priorité est de remplir cette session, pas de construire un système parfait. |
| 2 | **Aucune donnée mesurée dans le dépôt** : ni nombre de contacts, ni réservations, ni sources. | Impossible de dire quel canal marche. Le système doit commencer par mesurer. |
| 3 | **Beaucoup de production, peu de distribution et de suivi** : outils de génération (vidéo, posts) avant d'avoir un tableau de suivi des prospects. | Le goulot est probablement la conversation WhatsApp et le suivi, pas la création de contenu [H]. |
| 4 | **Incohérence de canaux** : `strategie-video.js` liste TikTok comme plateforme et prévoit des posts Facebook, alors que tu m'as dit ne pas utiliser ces deux plateformes pour diffuser tes activités. | À trancher (voir §7, question 3). Je construis sans ces deux canaux. |
| 5 | **Un seul point d'entrée** (lien de réservation) sans preuve sociale réelle visible dans le dépôt. | Les objections « est-ce que ça vaut 15 000 FCFA ? » se lèvent par des preuves réelles (photos, retours de participants), pas par des mots. |
| 6 | **Activités multiples** (formation IA, trading/prop firm, réseau, applications). | Disperser l'effort réduit les résultats. Une mission à la fois. |

### 1.3 Point de vigilance : l'activité « Programme Accélérateur Prop Firm »
Le dépôt contient une page d'accompagnement au trading prop firm. Le trading comporte un risque élevé de perte et fait l'objet d'une réglementation sur la communication commerciale dans plusieurs pays [?]. **Je ne l'inclus pas dans la mission 1.** Si tu veux l'inclure plus tard : aucune promesse de gain, avertissement de risque visible, et vérification de la réglementation locale avant toute prospection. Même règle pour le marketing de réseau : pas de promesse de revenu, pas de pression sur les recrues.

### 1.4 Ce que je ne sais pas (à confirmer, voir §7)
Ton budget réel, tes outils payants actuels, la taille de ta liste de contacts WhatsApp, ton nombre de réservations à ce jour, ton temps disponible par jour, ton niveau technique sur Google Sheets / automatisations, tes comptes réseaux actifs.

---

## 2. Architecture recommandée

### 2.1 Principe : « modulaire, manuel d'abord, automatisé ensuite »
Pas d'application sur mesure. Le Directoire est un **ensemble de fiches-instructions (prompts) + une mémoire + un tableau de suivi**, utilisables dans n'importe quel assistant IA (Claude, ChatGPT, Gemini…). Tu gardes le contrôle : l'IA prépare, **tu valides, tu envoies**.

```
                         ┌───────────────────────────┐
   TOI (décideur) ─────▶ │  DIRECTEUR MARKETING IA   │ ◀──── MÉMOIRE (fiche vérité,
   objectif + validation │  (1 prompt maître)        │       décisions, résultats)
                         └─────────────┬─────────────┘
                                       │ mobilise seulement les modules utiles
   ┌──────────┬──────────┬─────────────┼──────────────┬────────────┬──────────┐
   │ M1 Marché│ M3 Client│ M4 Stratégie│ M5 Copywrit.│ M7 Acquis. │ M8 Vente │
   │ M2 Concur│          │             │ M6 Artistiq.│ M9 Automat.│ M10 Perf │
   └──────────┴──────────┴─────────────┴──────────────┴────────────┴──────────┘
                                       │                        M11 Veille ──▶ retour mémoire
                                       ▼
                        LIVRABLES  ──▶  TOI : validation  ──▶  ENVOI MANUEL
                                                                    │
                                          Tableau de suivi (Google Sheets) ◀── mesures réelles
```

### 2.2 Les trois couches
1. **Cerveau** : un assistant IA + les fiches modules (dossier `modules/`, à créer à l'étape 2).
2. **Mémoire** : fichier `memoire.md` dans ce dépôt (non sensible uniquement) + tableau Google Sheets pour les chiffres. **Aucune mémoire n'est supposée dans l'assistant IA** : à chaque session, tu colles `memoire.md` (ou l'assistant le lit dans le dépôt s'il y a accès).
3. **Exécution** : WhatsApp Business, tes comptes réseaux, TinyPages (page de réservation), Bitly (liens suivis par source). Envoi toujours par toi.

### 2.3 Le Directeur — boucle de travail à chaque mission
1. Reformuler l'objectif commercial (chiffré, daté). 2. Identifier produit et public. 3. Lire `memoire.md` et signaler les trous. 4. Mobiliser **2 à 4 modules maximum**. 5. Comparer leurs propositions et trancher les contradictions. 6. Produire **un** plan d'action daté. 7. Fixer les indicateurs de réussite. 8. Lister risques, coûts, limites. 9. **Demander ta validation** avant toute action externe. 10. Enregistrer la décision dans la mémoire.

### 2.4 Contrôle qualité commun à tous les modules (checklist de 8 points)
Avant livraison, chaque sortie passe : ① pas de statistique ni témoignage inventé ② faits étiquetés [V]/[H]/[?] ③ aucune promesse de gain/résultat ④ cohérent avec la fiche vérité (prix, date, lieu) ⑤ cohérent avec les décisions déjà prises ⑥ canaux interdits absents (Facebook/TikTok pour toi) ⑦ consentement et désinscription prévus pour tout message de masse ⑧ un seul appel à l'action clair.

### 2.5 Fiches des modules (version synthétique)
| Module | Entrées | Méthode (résumé) | Livrables | Indicateur | Contrôle qualité spécifique |
|---|---|---|---|---|---|
| **M1 Marché** | Pays, offre, questions | Recherche en ligne si dispo, sinon hypothèses étiquetées ; 10 entretiens courts avec de vrais prospects | Note de marché 1 page : faits / estimations / hypothèses | % d'affirmations sourcées | Chaque chiffre a une source + date |
| **M2 Concurrence** | Liste de 5–10 concurrents | Relevé offre/prix/promesse/canal ; tableau comparatif | Grille concurrentielle + 3 angles de différenciation | Nb de différenciateurs retenus | Aucun contenu copié |
| **M3 Psychologie** | Réponses réelles de prospects (WhatsApp) | Regrouper frustrations, objectifs, peurs, objections ; persona | 2–3 personas + carte des objections | Objections couvertes par une réponse | Persona marqué [H] tant que non validé par de vrais retours |
| **M4 Stratégie** | M1–M3 + budget | Offre, prix, parcours, lancement | Fiche offre + plan de lancement | Objectif de places fixé et suivi | Prix justifié par la valeur livrée |
| **M5 Copywriting** | Fiche offre, objections, ton | 3 variantes par message (accroche × bénéfice × CTA) | Messages WhatsApp, posts, scripts, relances, messages affiliés | Taux de réponse par variante | Checklist §2.4 + un seul CTA |
| **M6 Direction artistique** | Message, format, public | Brief en français : cible, message, format, style, objectif | Briefs visuels/vidéo (génération seulement si nécessaire et validée) | Coût par visuel utilisé | Pas de visage/voix sans ton accord ; pas de clonage |
| **M7 Acquisition** | Budget, temps, canaux | Plan par canal : coût, actions, temps, KPI, limites | Plan hebdomadaire de diffusion | Prospects qualifiés par canal | Aucune promesse de résultat |
| **M8 Conversion** | Parcours + données | Diagnostic du lien contact→paiement, correctifs priorisés impact/effort | Liste de corrections classées | Taux de conversion étape par étape | Correctifs liés à une donnée mesurée |
| **M9 Automatisation** | Tâches répétitives chronométrées | Ne retenir que ce qui est fait ≥ 5 fois et stable | Modèles de messages, scripts, automatisations simples | Heures économisées | Outil gratuit d'abord ; aucune intégration affirmée sans test |
| **M10 Performance** | Tableau de suivi | Calcul des KPI, séparation mesuré/estimé | Rapport hebdo 1 page | Voir §6 | Aucune conclusion si < 30 observations [H] |
| **M11 Veille** | Sujets, concurrents, outils | Revue hebdo de 30 min | Liste : à exploiter / corriger / tester / arrêter | Tests lancés par mois | Sources datées |

---

## 3. Outils (coûts connus ou à vérifier)

Je n'ai pas vérifié les tarifs en ligne dans cette mission. **Tout prix ci-dessous est à vérifier avant achat.** Principe : gratuit d'abord, payant seulement si un blocage mesuré le justifie.

| Besoin | Outil | Coût | Statut |
|---|---|---|---|
| Assistant IA (cerveau du Directeur) | Claude / ChatGPT / Gemini en version gratuite | 0 FCFA ; limites d'usage variables | [?] limites à tester |
| Conversation et relances | WhatsApp Business (application) : étiquettes, réponses rapides, catalogue, liste de diffusion | Gratuit pour l'application [?] | À vérifier selon ton compte |
| Page de réservation | TinyPages (déjà utilisé : `kouagou-mangou.tinypages.co`) | Selon ton abonnement actuel | [V] utilisé, coût à confirmer |
| Suivi des prospects et KPI | Google Sheets | Gratuit | Recommandé |
| Liens suivis par source | Bitly (connecteur disponible dans cette session) | Plan gratuit limité [?] | Alternative : paramètres UTM sur le lien TinyPages |
| Visuels / affiches | Canva (version gratuite) | 0 FCFA [?] | Seulement si un visuel est nécessaire |
| Vidéo IA | Module vidéo existant (Higgsfield, crédits payants) | Crédits payants | **En pause** tant que le suivi n'est pas en place (voir §4) |
| Paiement | Mobile Money (déjà utilisé) | Frais de l'opérateur [?] | [V] utilisé |
| Mémoire | `memoire.md` dans ce dépôt | 0 FCFA | Prêt |

**Ce que je recommande de ne pas acheter maintenant** : CRM payant, outil d'automatisation WhatsApp payant, publicité payante, nouvelle application sur mesure.

---

## 4. Modules à développer en premier

Critère : impact direct sur le remplissage de la session du 31 octobre, effort faible, mesurable.

| Priorité | Module | Pourquoi maintenant |
|---|---|---|
| 1 | **Directeur + Mémoire** | Fixe les règles et évite les réponses incohérentes. |
| 2 | **M10 Performance (tableau de suivi)** | Sans mesure, aucun autre module ne peut être évalué. |
| 3 | **M8 Conversion** | Le parcours existe déjà ; il faut trouver où les gens décrochent. |
| 4 | **M5 Copywriting + M3 Psychologie** | Messages WhatsApp, relances et réponses aux 7 objections déjà identifiées. |
| 5 | **M7 Acquisition** | Plan réaliste : WhatsApp, communautés, partenaires, recommandations. |
| Plus tard | M1, M2, M4, M6, M9, M11 | Utiles, mais la session actuelle est déjà définie (offre, prix, date). |

**Décision proposée** : mettre le module vidéo en pause. Une vidéo de 20 secondes n'a de valeur que si ton lien est suivi et si tu sais où va le trafic.

---

## 5. Budget minimal de démarrage

| Scénario | Montant | Contenu |
|---|---|---|
| **Minimum absolu** | **0 FCFA** | Outils gratuits (§3), diffusion manuelle sur WhatsApp et tes réseaux actifs, Google Sheets. |
| **Recommandé** | **À fixer par toi** [H : forfait internet + éventuel petit cadeau de parrainage] | Forfait data pour les conversations ; budget optionnel pour récompenser les recommandations (la règle est à décider : réduction ou bonus, jamais de promesse de revenu). |
| **Interdit sans ton accord** | — | Publicité payante, crédits vidéo, abonnements. |

Mon estimation est volontairement sans chiffre précis : je n'ai pas tes coûts réels. Pour décider si un budget est rentable, il faut connaître **tes dépenses fixes pour cette session** (salle, support, certificats, etc.) afin de calculer le **seuil de rentabilité** en nombre de places [?].

Repère de calcul (arithmétique, pas une prévision) : 40 places × 15 000 FCFA = 600 000 FCFA de chiffre d'affaires maximum ; chaque place restante non vendue réduit ce montant de 15 000 FCFA.

---

## 6. Plan de mise en œuvre étape par étape

### Phase A — Audit complet (jour 1 à 2, aujourd'hui → 11 oct.)
- Répondre aux questions du §7 (≈ 15 minutes).
- Remplir `memoire.md` (fiche vérité).
- **Sortie** : mémoire initiale validée.

### Phase B — Version minimale opérationnelle (jours 2 à 4)
1. Créer le Google Sheets **« Suivi Directoire »** avec 3 onglets :
   - **Contacts** : date, nom/pseudo, pays, source, statut (nouveau / répondu / intéressé / avance payée / solde payé / perdu), date dernier contact, objection principale, consentement (oui/non), note.
   - **Campagnes** : date, canal, message (variante A/B/C), nb envoyés, nb réponses, nb réservations, dépense.
   - **Résultats** : calculs automatiques (formules ci-dessous).
2. Créer les liens suivis par source (un lien Bitly ou paramètre UTM par canal et par affilié) [?] à tester.
3. Mettre en place dans WhatsApp Business les **étiquettes** (nouveau, intéressé, avance payée, perdu) et **réponses rapides** (présentation, prix, lieu, paiement, objections).
- **Sortie** : un prospect peut être suivi du premier message au paiement.

### Phase C — Test avec un cas réel (jours 4 à 14, soit jusqu'au 23 oct.)
Exécuter la mission « Remplir la session du 31 octobre » (§8). Un test à la fois : deux variantes de message maximum par semaine.

### Phase D — Optimisation (jours 14 à 18, jusqu'au 27 oct.)
Rapport hebdomadaire M10 : garder la variante gagnante, arrêter les canaux sans réponse, relancer les contacts intéressés non payés.

### Phase E — Clôture et automatisation (après le 31 oct.)
Rétrospective : taux de conversion par étape, source la plus rentable, ce qui a coûté du temps pour rien. **Seulement ensuite** : automatiser ce qui s'est répété ≥ 5 fois (réponses, relances, rapport).

### Formules des indicateurs (module 10)
| Indicateur | Formule | Type |
|---|---|---|
| Taux de réponse | réponses ÷ messages envoyés | Mesuré |
| Taux de conversion | avances payées ÷ contacts intéressés | Mesuré |
| Coût d'acquisition | dépenses marketing ÷ nb avances payées | Mesuré si dépenses réelles |
| CA encaissé | somme des paiements reçus | Mesuré |
| CA attendu | places réservées × 15 000 | Estimation |
| ROI | (CA encaissé − dépenses) ÷ dépenses | Mesuré, undéfini si dépenses = 0 |
| Performance par affilié | réservations via son lien ÷ contacts envoyés | Mesuré |

**Règle** : tant que moins de 30 contacts par variante, on observe, on ne conclut pas [H].

---

## 7. Informations manquantes — questions indispensables

1. Combien de contacts WhatsApp as-tu (liste, statuts, groupes) et combien ont déjà donné leur accord pour recevoir des messages sur la formation ?
2. Combien de réservations/avances à ce jour pour le 31 octobre ?
3. Quels réseaux utilises-tu réellement pour diffuser ? (`strategie-video.js` cite TikTok et une page Facebook ; tu m'as dit ne pas les utiliser. Je les retire de la stratégie sauf avis contraire.)
4. Quel est ton budget maximum pour les 3 prochaines semaines (FCFA) ?
5. Quel est ton seuil de rentabilité (coûts de la session) ?
6. Combien de temps par jour peux-tu consacrer à la prospection et aux conversations ?
7. As-tu déjà des affiliés ou partenaires actifs ? Quelle commission est prévue (si oui, montant) ?
8. As-tu de vraies preuves à utiliser (photos de formations passées, retours de participants avec leur accord) ?
9. Quelle est la priorité des 3 prochaines semaines : formation IA, trading, réseau, ou applications ? (Je recommande : formation IA seule.)

---

## 8. Premier cas pratique — « Remplir la session du 31 octobre »

**Objectif chiffré (à confirmer)** : [H] atteindre X avances payées avant le 27 octobre (X = ton choix ; 40 = capacité maximale).

### 8.1 Le Directeur lance la mission
- **Produit** : L'IA Pratique pour Tous [V]. **Public** : commerçants, entrepreneurs, artisans, salariés, étudiants à Porto-Novo et alentours [V].
- **Modules mobilisés** : M3 (objections), M5 (messages), M7 (canaux), M8 (conversion), M10 (suivi). Pas M1/M2/M6 : ils n'accélèrent pas cette échéance.

### 8.2 Plan d'acquisition réaliste (sans Facebook ni TikTok)
| Canal | Coût estimé | Actions | Temps | KPI | Limites |
|---|---|---|---|---|---|
| **Message WhatsApp personnel** aux contacts qui ont donné leur accord | Data | 10–20 messages personnalisés par jour, jamais de copier-coller identique en masse | 45 min/jour | réponses, avances | Contacts limités à ta liste ; risque de blocage si messages non sollicités |
| **Statut WhatsApp** | 0 | 1 statut/jour : démonstration courte, rappel de la date | 10 min/jour | vues, réponses au statut | Audience = tes contacts seulement |
| **Groupes/communautés où tu es déjà membre** | 0 | 1 message utile (astuce IA) + invitation, en respectant les règles du groupe | 15 min | clics, réponses | Peut être refusé par les admins ; ne pas spammer |
| **Recommandations** (participants et prospects) | À décider | Demander à chaque intéressé : « qui d'autre pourrait profiter de ça ? » | 5 min/contact | réservations via parrainage | Dépend de la satisfaction ; aucune promesse de revenu |
| **Partenaires** (ONG ADIL, associations, églises, boutiques, écoles) | 0 | Proposer une présentation de 10 minutes ou un message à leur propre liste | 2 h | réservations via partenaire | Délai de réponse incertain |
| **Affiliés** | Commission [?] | Message d'affilié + lien suivi + règles (pas de promesse de gain) | 1 h de mise en place | réservations par affilié | Qualité variable ; contrôle des messages nécessaire |

### 8.3 Exemple de messages (variantes à tester — jamais envoyés sans ta validation)
Remplacer les crochets par tes vraies données. **Aucune preuve ni témoignage n'est inventé** : tant que tu n'as pas de retours réels, la preuve = le programme précis et la remboursabilité de l'avance.

**Variante A — Problème / gain de temps**
> Bonjour [Prénom], c'est Kouagou. Tu passes combien de temps à écrire des messages, des demandes ou des posts pour ton activité ? Le samedi 31 octobre à Porto-Novo, je montre en 4 heures, sur téléphone, comment l'IA le fait en quelques secondes. Débutants complets bienvenus, 40 places. Je t'envoie le lien pour voir les détails ?

**Variante B — Curiosité / démonstration**
> Bonjour [Prénom], regarde ça : tu dictes « rédige une demande de congé » et le texte est prêt en 10 secondes. Je t'apprends à faire ça sur ton téléphone le samedi 31 octobre à Porto-Novo (ONG ADIL, 9h–13h). Tu veux le lien pour voir le programme ?

**Variante C — Objection prix**
> Bonjour [Prénom], la formation est à 15 000 FCFA : 4 heures de pratique, guide de prompts, cahier d'exercices, certificat et 30 jours d'accompagnement. Pour garder ta place, l'avance est de 5 000 FCFA, remboursée intégralement si tu es empêché(e). Je t'envoie le lien de réservation ?

**Relance (J+2, une seule fois)**
> Bonjour [Prénom], je reviens vers toi pour la formation du 31 octobre. Il reste [N] places (chiffre réel à vérifier avant l'envoi). Dis-moi si tu as une question avant que je clôture le 27 octobre.

**Message d'affilié (à adapter, sans promesse de gain)**
> Voici le lien de réservation pour la formation du 31 octobre. Partage-le à des personnes que tu connais et qui pourraient être intéressées ; ne leur promets aucun résultat financier. Tes réservations sont comptées via ton lien personnel.

### 8.4 Calendrier proposé (à valider)
| Dates | Action | Livrable |
|---|---|---|
| 9–11 oct. | Questions §7, mémoire, tableau de suivi | Système prêt |
| 12–18 oct. | Message personnel aux contacts consentants (A/B), statut quotidien, 2–3 partenaires contactés | Premières données |
| 19–23 oct. | Garder la meilleure variante, relancer les intéressés, activer affiliés/recommandations | Rapport M10 n°1 |
| 24–27 oct. | Dernière relance (rappel de clôture), traitement des objections | Clôture |
| 28–30 oct. | Confirmation des inscrits, rappel du solde | Liste confirmée |
| 31 oct. | Formation | — |
| 1–7 nov. | Collecter retours (avec accord) et rétrospective | Preuves réelles + leçons |

### 8.5 Risques et limites
- Je ne peux **garantir ni prospects ni ventes** ; seul le tableau de suivi dira ce qui fonctionne.
- Messages en masse non sollicités : risque de blocage de ton numéro WhatsApp et de perte de confiance.
- Si la liste de contacts est petite, la limite sera l'audience, pas le message : il faudra alors s'appuyer sur partenaires et recommandations.
- Les hypothèses de taux (réponse, conversion) ne sont pas données ici : elles seront **calculées à partir de tes premières 30 observations**.

---

## 9. Recommandation finale — première action

**Remplir la fiche vérité (`directoire-marketing-ia/memoire.md`) en répondant aux 9 questions du §7.**

Durée : environ 15 minutes. Dès que c'est fait, je :
1. complète la mémoire,
2. génère la structure du tableau de suivi (colonnes + formules) prête à copier dans Google Sheets,
3. prépare les 3 variantes de message finalisées avec tes vraies données,
4. te présente le plan de la semaine pour validation.

Aucune publication, aucun envoi, aucune dépense ne sera lancé sans ton accord explicite.
