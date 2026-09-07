-- Registre-École : schéma initial
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS utilisateur (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifiant TEXT NOT NULL UNIQUE,
  mot_de_passe_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS annees_scolaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle TEXT NOT NULL UNIQUE,
  date_debut TEXT,
  date_fin TEXT,
  active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  niveau TEXT,
  ordre_affichage INTEGER NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT,
  classe_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  statut TEXT NOT NULL DEFAULT 'Nouveau' CHECK (statut IN ('Nouveau','Ancien')),
  date_naissance TEXT,
  sexe TEXT,
  parent_nom TEXT,
  parent_telephone TEXT,
  parent_email TEXT,
  parent_adresse TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS types_frais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  actif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tarifs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_frais_id INTEGER NOT NULL REFERENCES types_frais(id) ON DELETE CASCADE,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id) ON DELETE CASCADE,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  montant REAL NOT NULL,
  UNIQUE (type_frais_id, annee_scolaire_id, classe_id)
);

CREATE TABLE IF NOT EXISTS factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  date_emission TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'impayee' CHECK (statut IN ('impayee','partielle','payee')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS facture_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  type_frais_id INTEGER REFERENCES types_frais(id) ON DELETE SET NULL,
  libelle TEXT NOT NULL,
  montant REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  montant REAL NOT NULL,
  date_paiement TEXT NOT NULL,
  mode_paiement TEXT NOT NULL DEFAULT 'especes' CHECK (mode_paiement IN ('especes','mobile_money','cheque','autre')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories_depenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  actif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS depenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categorie_id INTEGER REFERENCES categories_depenses(id) ON DELETE SET NULL,
  libelle TEXT NOT NULL,
  montant REAL NOT NULL,
  date_depense TEXT NOT NULL,
  justificatif_path TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rapports_journaliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  recettes_total REAL NOT NULL,
  depenses_total REAL NOT NULL,
  solde REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parametres_ecole (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nom_ecole TEXT NOT NULL DEFAULT 'École Maternelle et Primaire Publique',
  adresse TEXT,
  telephone TEXT,
  annee_scolaire_active_id INTEGER REFERENCES annees_scolaires(id)
);

CREATE INDEX IF NOT EXISTS idx_eleves_classe ON eleves(classe_id);
CREATE INDEX IF NOT EXISTS idx_factures_eleve ON factures(eleve_id);
CREATE INDEX IF NOT EXISTS idx_factures_annee ON factures(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_facture_lignes_facture ON facture_lignes(facture_id);
CREATE INDEX IF NOT EXISTS idx_paiements_facture ON paiements(facture_id);
CREATE INDEX IF NOT EXISTS idx_paiements_eleve ON paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses(date_depense);
CREATE INDEX IF NOT EXISTS idx_tarifs_annee ON tarifs(annee_scolaire_id);
