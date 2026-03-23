-- Création de l'extension pgcrypto pour pouvoir générer des UUID automatiquement (gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- NETTOYAGE DES ANCIENNES TABLES
-- =========================================
DROP TABLE IF EXISTS articles_ticket CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS jetons_revoques CASCADE;
DROP TABLE IF EXISTS utilisateurs CASCADE;

-- =========================================
-- TABLE : utilisateurs (Comptes et Profils)
-- =========================================
CREATE TABLE utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudo VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hache TEXT NOT NULL,
    
    -- Informations de profil
    prenom VARCHAR(100),
    nom VARCHAR(100),
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    budget_fixe NUMERIC(10, 2) DEFAULT 1500.00,
    
    
    -- Abonnement & rôle
    abonnement VARCHAR(50) DEFAULT 'Gratuit', -- ex: 'Gratuit', 'Premium'
    est_admin BOOLEAN DEFAULT FALSE,
    
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TABLE : jetons_revoques (Sécurité / Déconnexion)
-- =========================================
CREATE TABLE jetons_revoques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jeton TEXT UNIQUE NOT NULL,
    revoque_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TABLE : categories (Catégories de dépenses)
-- =========================================
-- Ex: Alimentation, Transport, Logement, Santé...
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) UNIQUE NOT NULL,
    code_couleur_hex VARCHAR(7) DEFAULT '#000000', -- Couleur pour l'affichage (Analytique)
    icone VARCHAR(50), -- Emoji ou identifiant d'icône
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertion de quelques catégories de base génériques pour la finance
INSERT INTO categories (nom, code_couleur_hex, icone) VALUES 
('Alimentation', '#22c55e', '🛒'),
('Transport', '#3b82f6', '🚗'),
('Logement', '#eab308', '🏠'),
('Loisirs', '#a855f7', '🎉'),
('Santé', '#ef4444', '💊'),
('Services', '#64748b', '⚙️');

-- =========================================
-- TABLE : tickets (Factures et reçus scannés)
-- =========================================
-- Représente un ticket scanné par l'IA (Scanner.jsx, Historique.jsx)
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    
    -- Données extraites par l'IA / OCR
    nom_marchand VARCHAR(255) NOT NULL,
    montant_total NUMERIC(10, 2) NOT NULL,
    date_achat DATE NOT NULL,
    
    -- Catégorie globale du ticket (soit attribuée par l'IA, soit modifiée par l'utilisateur)
    categorie_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    est_exceptionnel BOOLEAN DEFAULT FALSE,
    
    -- Statut du traitement ("validé", "en attente", "erreur")
    statut VARCHAR(50) DEFAULT 'en attente',
    
    -- Méta-données de l'IA
    confiance_ocr NUMERIC(5, 2), -- Score de confiance de l'IA (0 à 100)
    url_image TEXT, -- Lien vers l'image stockée
    texte_brut_extrait TEXT, -- Le texte brut retourné par l'OCR
    
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TABLE : articles_ticket (Articles individuels)
-- =========================================
-- Optionnel : Si l'IA extrait ligne par ligne, on stocke ici le détail des achats
CREATE TABLE articles_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    
    nom VARCHAR(255) NOT NULL,
    prix NUMERIC(10, 2) NOT NULL,
    quantite NUMERIC(10, 2) DEFAULT 1.0,
    
    categorie_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TRIGGERS pour la mise à jour automatique 
-- du champ "mis_a_jour_le"
-- =========================================
CREATE OR REPLACE FUNCTION mettre_a_jour_colonne_modifiee()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mis_a_jour_le = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_maj_utilisateurs
BEFORE UPDATE ON utilisateurs
FOR EACH ROW EXECUTE PROCEDURE mettre_a_jour_colonne_modifiee();

CREATE TRIGGER trg_maj_tickets
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE PROCEDURE mettre_a_jour_colonne_modifiee();
