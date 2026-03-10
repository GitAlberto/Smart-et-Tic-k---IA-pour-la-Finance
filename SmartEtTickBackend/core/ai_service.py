import io
import re
import cv2
import numpy as np
import pandas as pd
import easyocr
import torch
import joblib
from transformers import AutoTokenizer, AutoModel
import os

# --- INITIALISATION GÉnÉRALE (Singleton pour éviter le rechargement à chaque requête) ---

print("[INFO] Chargement du modele OCR (EasyOCR)...")
# On force le chargement sur CPU si on n'a pas de GPU compatible CUDA, selon la config système
reader = easyocr.Reader(['fr', 'en'], gpu=False) 

print("[INFO] Chargement de CamemBERT...")
tokenizer = AutoTokenizer.from_pretrained("camembert-base")
camembert = AutoModel.from_pretrained("camembert-base")

cerveau = None
MODELE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cerveau_budget.pkl")

if os.path.exists(MODELE_PATH):
    print("[INFO] Chargement du modele classificatif (cerveau_budget.pkl)...")
    cerveau = joblib.load(MODELE_PATH)
else:
    print(f"[WARN] Le modele {MODELE_PATH} est introuvable. Prediction desactivee.")

# --- RÈGLES DE NETTOYAGE AMÉLIORÉES ---
def est_une_impurete(texte):
    texte = str(texte).strip().upper()
    if len(texte) < 3: return True
    if re.match(r'^\d+([.,]\d+)?$', texte): return True
    if re.match(r'^[\d/\s]+$', texte) and '/' in texte: return True
    if re.search(r'\d{2}:\d{2}(:\d{2})?', texte): return True
    if sum(c.isdigit() for c in texte) > 7 and sum(c.isalpha() for c in texte) < 3: return True
    mots_bannis = ["TOTAL", "TVA", "CARTE BANCAIRE", "CB", "MERCI", "VISITE", "DUPLICATA", "SIRET", "CAISSE", "RENDU", "MONNAIE", "EUR", "TTC", "HT", "ESPECES", "SOUS-TOTAL", "PAYE", "TICKET"]
    mots_texte = texte.replace('-', ' ').replace(':', ' ').split()
    if any(mot in mots_texte for mot in mots_bannis): return True
    return False

# --- TRANSFORMER EN VECTEUR (CamemBERT) ---
def transformer_en_nombres(texte):
    texte = str(texte).strip()
    inputs = tokenizer(texte, return_tensors="pt", truncation=True, max_length=32)
    with torch.no_grad():
        outputs = camembert(**inputs)
    vecteur = outputs.last_hidden_state[:, 0, :].squeeze().numpy()
    return vecteur

def analyser_image_ticket(image_bytes: bytes):
    """
    Reçoit les octets d'une image, applique un pré-traitement (bruit, ombres), 
    lance l'OCR, extrait le montant, la date, le magasin, 
    et classe *chaque ligne d'article* avec CamemBERT.
    Retourne un dictionnaire complet pour le frontend.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("L'image n'a pas pu être décodée.")
    except Exception as e:
        raise ValueError(f"Erreur de lecture OpenCV : {e}")

    # --- 1. PRÉ-TRAITEMENT DE L'IMAGE POUR OCR ---
    # Convertir en niveaux de gris
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Amélioration du contraste (CLAHE - Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Binarisation adaptative pour supprimer les ombres (bon pour les tickets naturels)
    thresh = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 5)

    # 2. Extraction OCR avec l'image nettoyée
    resultats_ocr = reader.readtext(thresh, detail=1)
    
    lignes_texte = []
    prix_trouves = []
    dates_trouvees = []

    # Tolérance Y pour regrouper Produit <-> Prix sur la même ligne physique
    y_tolerance = 25 
    
    for bbox, texte, confiance in resultats_ocr:
        texte = texte.strip()
        if len(texte) < 2: continue
        
        y_centre = (bbox[0][1] + bbox[3][1]) / 2
        x_gauche = bbox[0][0]
        
        # Regex Date Tolérante (ex: 24 / 12 / 2023, 24-12-23, 24/l2/2023)
        match_date = re.search(r'(\d{2})[\s\-\/\.Il]+(\d{2})[\s\-\/\.Il]+(\d{4}|\d{2})', texte)
        if match_date:
            dates_trouvees.append((match_date.group(1), match_date.group(2), match_date.group(3)))
            
        # Regex Prix Tolérante (ex: 12.50, 14,99, 12€50, 5 00) - capture le nombre final
        match_prix = re.search(r'(\d+)[\.,€\s]+(\d{2})(?!\d)', texte)
        est_prix = False
        valeur_prix = 0.0
        if match_prix:
            est_prix = True
            valeur_prix = float(match_prix.group(1) + "." + match_prix.group(2))
            prix_trouves.append(valeur_prix)

        lignes_texte.append({
            "texte": texte,
            "y": y_centre,
            "x": x_gauche,
            "est_prix": est_prix,
            "valeur_prix": valeur_prix,
            "confiance": confiance
        })

    # --- Synthèse Globale (Marchand, Total, Date) ---
    nom_marchand = "Marchand Inconnu"
    lignes_triees_y = sorted(lignes_texte, key=lambda i: i["y"])
    for item in lignes_triees_y[:7]: # Chercher dans les premières lignes du haut
        if not item["est_prix"] and sum(c.isalpha() for c in item["texte"]) > 3:
            nom_marchand = item["texte"]
            break

    montant_total = 0.0
    if len(prix_trouves) > 0:
         montant_total = float(max(prix_trouves))
         
    date_achat = "2024-01-01" 
    if len(dates_trouvees) > 0:
        j, m, a = dates_trouvees[0]
        if len(a) == 2: a = "20" + a
        # Format correct pour input type="date" : YYYY-MM-DD
        date_achat = f"{a}-{m}-{j}"

    # --- Prédiction des Lignes d'Articles Individuels ---
    candidats_articles = []
    
    for item in lignes_texte:
        if item["est_prix"]: continue
        if re.search(r'\d{2}[\s\-\/\.]\d{2}[\s\-\/\.]\d{2,4}', item["texte"]): continue # c'est une date
        if est_une_impurete(item["texte"]): continue
        
        # Trouver un prix sur la même ligne horizontale (tolérance Y)
        prix_associe = 0.0
        for autre_item in lignes_texte:
            if autre_item["est_prix"] and abs(autre_item["y"] - item["y"]) < y_tolerance:
                prix_associe = autre_item["valeur_prix"]
                break
                
        candidats_articles.append({
            "nom": item["texte"],
            "prix": prix_associe,
            "confiance_ocr": item["confiance"]
        })

    articles = []
    categorie_dominante = None
    
    if cerveau is not None and len(candidats_articles) > 0:
        textes_a_predire = [art["nom"] for art in candidats_articles]
        
        # Encodage NLP via CamemBERT
        vecteurs = np.stack([transformer_en_nombres(t) for t in textes_a_predire])
        
        # Classification via RL
        predictions = cerveau.predict(vecteurs)
        
        unique, counts = np.unique(predictions, return_counts=True)
        if len(unique) > 0:
            categorie_dominante = unique[np.argmax(counts)]

        for i, art in enumerate(candidats_articles):
            articles.append({
                "nom": art["nom"],
                "prix": float(art["prix"]),
                "categorie": str(predictions[i]),
                "confiance_ocr": float(art["confiance_ocr"])
            })
    else:
        # Fallback si modèle non chargé
        articles = [{"nom": a["nom"], "prix": float(a["prix"]), "categorie": "Inconnue", "confiance_ocr": float(a["confiance_ocr"])} for a in candidats_articles]

    return {
        "nom_marchand": nom_marchand,
        "montant_total": montant_total,
        "date_achat": date_achat,
        "categorie_recommandee": str(categorie_dominante) if categorie_dominante else None,
        "confiance_globale": 85.0, # Indice global de qualité
        "articles": articles
    }
