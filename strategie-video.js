// =====================================================================
// FICHE STRATÉGIE VIDÉO : « L'IA Pratique pour Tous » (Porto-Novo)
// Source : brief-video-ia-pratique-pour-tous.md + tes réponses.
// Ce fichier est la SEULE source de la stratégie : le module vidéo
// (et plus tard les posts) lisent ces valeurs. Ne contient AUCUNE clé.
// Style des textes : TUTOIEMENT (choix de Kouagou).
// =====================================================================

const STRATEGIE = {

  // ---------- Le produit ----------
  produit: {
    nom: "L'IA Pratique pour Tous",
    description: "Formation présentielle d'initiation à l'intelligence artificielle pour débutants complets, directement sur téléphone.",
    date: "samedi 31 octobre 2026",
    dateISO: "2026-10-31",
    horaire: "de 9h à 13h (4 heures de formation pratique)",
    lieu: "ONG ADIL, Porto-Novo",          // RÈGLE : ne jamais ajouter d'adresse
    prix: "15 000 FCFA",
    places: 40,
    fermetureInscriptions: "27 octobre 2026, ou dès que les 40 places sont prises",
    formateur: "Kouagou",
    inclus: [
      "support de formation",
      "guide de prompts",
      "cahier d'exercices",
      "certificat de participation",
      "groupe WhatsApp et accompagnement de 30 jours (défis quotidiens, corrections, suivi)"
    ]
  },

  // ---------- Réservation ----------
  reservation: {
    lienReservation: "https://kouagou-mangou.tinypages.co/lia-pour-tous",   // lien sur lequel on clique pour réserver
    whatsapp: "01 96 48 66 26",
    messageWhatsApp: "OUI + NOM",
    parcours: [
      "La personne voit la vidéo, puis clique sur le lien de réservation (ou envoie « OUI + NOM » sur WhatsApp).",
      "Elle reçoit le lien du groupe WhatsApp « L'IA Pratique pour Tous — Porto-Novo ».",
      "La réservation garde la place jusqu'au 27 octobre.",
      "L'avance de 5 000 FCFA, envoyée avant le 27 octobre, confirme la place.",
      "Le solde de 10 000 FCFA se règle sur place le 31 octobre à 9h, par Mobile Money au plus tard le jeudi 29 octobre, ou en paiement total à l'avance."
    ],
    avance: "5 000 FCFA",
    remboursement: "L'avance est remboursée intégralement si la personne est empêchée."
  },

  // ---------- Public et message ----------
  public: {
    principal: ["commerçants", "entrepreneurs", "artisans", "salariés et professionnels", "étudiants"],
    secondaire: ["responsables d'associations", "enseignants", "personnes en reconversion", "retraités curieux du numérique"],
    niveauDeConscience: "Connaît l'IA mais ne sait pas l'utiliser.",
    ceQueOnVend: ["le gain de temps", "la simplicité", "les usages quotidiens", "la démonstration concrète"],
    ceQueOnNeVendPas: "« Apprendre l'IA » en théorie"
  },

  objections: [
    { objection: "Je ne suis pas bon en informatique", reponse: "La formation est faite pour les débutants complets." },
    { objection: "Je suis trop âgé", reponse: "Aucun prérequis, tout se fait pas à pas." },
    { objection: "L'IA est compliquée", reponse: "On apprend avec des exemples concrets du quotidien." },
    { objection: "Je n'ai qu'un téléphone", reponse: "Les exercices se font sur téléphone." },
    { objection: "Est-ce vraiment utile pour moi ?", reponse: "Démonstrations adaptées au commerce, au travail, aux études." },
    { objection: "15 000 FCFA, est-ce que ça vaut le coup ?", reponse: "4h de pratique + guide de prompts + cahier d'exercices + 30 jours d'accompagnement + certificat." },
    { objection: "Et si je ne peux plus venir ?", reponse: "L'avance de 5 000 FCFA est remboursée intégralement." }
  ],

  // ---------- Concept retenu ----------
  concept: {
    nom: "Le Miracle du Téléphone",
    angle: "Transformation immédiate",
    emotion: "Émerveillement",
    idee: "Une personne dicte une demande à l'IA. Quelques secondes plus tard : lettre prête, publication prête, idée commerciale prête.",
    // Découpage de la vidéo de 20 secondes
    decoupage: [
      { nom: "Accroche", debut: 0,  fin: 3,  role: "Hook : arrêter le pouce" },
      { nom: "Démonstration", debut: 3,  fin: 13, role: "Montrer l'IA qui répond sur un téléphone" },
      { nom: "Présentation", debut: 13, fin: 18, role: "31 octobre, Porto-Novo, 40 places" },
      { nom: "Appel à l'action", debut: 18, fin: 20, role: "CTA" }
    ],
    dureeTotale: 20
  },

  // ---------- Hooks à tester (texte du brief, passé au « tu ») ----------
  hooks: [
    { id: "A", type: "Problème",      texte: "Tu passes encore une heure à rédiger un document ?" },
    { id: "B", type: "Curiosité",     texte: "Ce que tu vas voir a été créé en 10 secondes sur un simple téléphone." },
    { id: "C", type: "Résultat",      texte: "Une demande. Dix secondes. Travail terminé." },
    { id: "D", type: "Démonstration", texte: "Une personne dit « Rédige une demande de congé. » Le texte apparaît instantanément." }
  ],

  // ---------- Appels à l'action à tester (texte du brief) ----------
  cta: [
    { id: "1", texte: "Envoie OUI + ton nom au 01 96 48 66 26." },
    { id: "2", texte: "Réserve ta place avant le 27 octobre." },
    { id: "3", texte: "40 places seulement. Samedi 31 octobre à Porto-Novo. Réserve maintenant sur WhatsApp." }
  ],

  // ---------- Formats et plateformes ----------
  format: {
    orientation: "vertical 9:16",
    textesAEcran: "lisibles",
    sousTitres: "en français",
    plateformes: ["TikTok", "Statut WhatsApp", "YouTube Shorts", "Page Facebook (partage de mes posts et reels uniquement)"],
    // RÈGLE : le visage de Kouagou n'est utilisé que si Kouagou fournit lui-même la photo ou la vidéo.
    visage: "Les vidéos TikTok se font avec le visage de Kouagou (images fournies par lui)."
  },

  // ---------- Règles impératives ----------
  regles: [
    "Aucune promesse de gain d'argent.",
    "Aucun faux témoignage, aucun faux avis.",
    "Ne jamais inventer d'adresse : écrire seulement « ONG ADIL, Porto-Novo ».",
    "Ne pas citer Facebook ni Instagram à l'intérieur des vidéos.",
    "Ne cloner aucune autre personne et n'imiter aucune voix existante.",
    "Ne copier aucune vidéo, voix ou visuel d'un autre créateur.",
    "L'application génère seulement : elle ne publie rien, ne partage rien.",
    "Facebook : aucune pub payante, aucune automatisation de publication, aucun nouveau groupe.",
    "Rien n'est supprimé et rien n'est dépensé sans l'accord de Kouagou."
  ],

  // Mots que le module SIGNALE dans un script (il ne bloque pas, il prévient).
  controles: {
    motsInterdits: ["facebook", "instagram"],
    promessesDeGain: ["gagner de l'argent", "gagnez de l'argent", "gagnez des millions", "revenu", "revenus", "devenir riche", "argent facile", "salaire", "millionnaire", "garanti"],
    adresseSuspecte: ["rue ", "avenue", "boulevard", "quartier", "carrefour", "derrière", "à côté de", "près de", "face à"]
  },

  // ---------- Crédits (valeurs de départ, tu peux les changer) ----------
  limites: {
    maxVideosParJour: 3,
    maxVideosParSession: 2
  }
};

// Permet aussi de l'utiliser dans un test (Node) sans casser le navigateur.
if (typeof module !== "undefined") module.exports = STRATEGIE;
