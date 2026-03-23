import os
import re
import threading
from collections import defaultdict
from datetime import date, datetime, timedelta

import cv2
import easyocr
import joblib
import numpy as np
import torch
from transformers import AutoModel, AutoTokenizer


TOTAL_KEYWORDS = (
    "TOTAL",
    "TOTAL TTC",
    "TTC",
    "A PAYER",
    "NET A PAYER",
    "MONTANT",
)
PAYMENT_KEYWORDS = (
    "CARTE",
    "CB",
    "VISA",
    "MASTERCARD",
    "AMEX",
    "BANCONTACT",
)
TOTAL_NEGATIVE_KEYWORDS = (
    "SOUS TOTAL",
    "TVA",
    "REMISE",
    "FIDELITE",
    "ECONOMIE",
    "RENDU",
    "MONNAIE",
)
NON_ARTICLE_KEYWORDS = (
    "TOTAL",
    "TVA",
    "CARTE",
    "CB",
    "MERCI",
    "VISITE",
    "DUPLICATA",
    "SIRET",
    "CAISSE",
    "RENDU",
    "MONNAIE",
    "EUR",
    "TTC",
    "HT",
    "ESPECES",
    "SOUS TOTAL",
    "PAYE",
    "TICKET",
    "TEL",
    "ADRESSE",
    "AUTORISATION",
    "DATE",
    "HEURE",
    "ARTICLE",
    "ARTICLES",
    "CODE TVA",
    "DUPLICATA N",
    "TICKET N",
    "NBRE",
)
PRODUCT_HEADER_KEYWORDS = (
    "QTE",
    "DESIGNATION",
    "DESIGN.",
    "P.U",
    "PU",
    "TOT.TTC",
    "TOT TTC",
    "TTC",
)
MERCHANT_EXCLUDE_KEYWORDS = NON_ARTICLE_KEYWORDS + (
    "RUE",
    "AVENUE",
    "BOULEVARD",
    "CEDEX",
    "FRANCE",
    "PARIS",
    "ARRONDISSEMENT",
)
MONEY_PATTERN = re.compile(r"(?<![A-Z0-9])(\d{1,4}(?:[ .]\d{3})*|\d+)([,.€\s])(\d{2})(?!\d)")
DATE_PATTERNS = (
    ("%d/%m/%Y", re.compile(r"(?<!\d)(\d{2})[\s\-\/\.](\d{2})[\s\-\/\.](\d{4})(?!\d)")),
    ("%d/%m/%y", re.compile(r"(?<!\d)(\d{2})[\s\-\/\.](\d{2})[\s\-\/\.](\d{2})(?!\d)")),
    ("%Y/%m/%d", re.compile(r"(?<!\d)(\d{4})[\s\-\/\.](\d{2})[\s\-\/\.](\d{2})(?!\d)")),
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODEL_CANDIDATES = (
    os.path.join(PROJECT_ROOT, "cerveau_budget.pkl"),
    os.path.join(BASE_DIR, "cerveau_budget.pkl"),
)
reader = None
tokenizer = None
camembert = None
cerveau = None
classification_checked = False
model_lock = threading.Lock()


def _ensure_ocr_reader():
    global reader
    if reader is not None:
        return

    # Lazy-load OCR so the backend can start and answer auth/data routes immediately.
    with model_lock:
        if reader is None:
            print("[INFO] Chargement du modele OCR (EasyOCR)...")
            reader = easyocr.Reader(["fr", "en"], gpu=False)


def _ensure_classification_pipeline():
    global tokenizer, camembert, cerveau, classification_checked
    if classification_checked:
        return

    # The scan classifier is only needed during receipt analysis,
    # not during API startup or unrelated authenticated routes.
    with model_lock:
        if classification_checked:
            return

        for candidate in MODEL_CANDIDATES:
            if os.path.exists(candidate):
                print(f"[INFO] Chargement du modele classificatif ({candidate})...")
                cerveau = joblib.load(candidate)
                print("[INFO] Chargement de CamemBERT...")
                tokenizer = AutoTokenizer.from_pretrained("camembert-base")
                camembert = AutoModel.from_pretrained("camembert-base")
                break

        if cerveau is None:
            print(f"[WARN] Aucun modele de classification trouve parmi: {MODEL_CANDIDATES}")

        classification_checked = True


def est_une_impurete(texte):
    texte = str(texte).strip().upper()
    if len(texte) < 3:
        return True
    if re.match(r"^\d+([.,]\d+)?$", texte):
        return True
    if re.match(r"^[\d/\s]+$", texte) and "/" in texte:
        return True
    if re.search(r"\d{2}:\d{2}(:\d{2})?", texte):
        return True
    if sum(c.isdigit() for c in texte) > 7 and sum(c.isalpha() for c in texte) < 3:
        return True
    mots_texte = texte.replace("-", " ").replace(":", " ").split()
    if any(mot in mots_texte for mot in NON_ARTICLE_KEYWORDS):
        return True
    return False


def transformer_en_nombres(texte):
    _ensure_classification_pipeline()
    texte = str(texte).strip()
    inputs = tokenizer(texte, return_tensors="pt", truncation=True, max_length=32)
    with torch.no_grad():
        outputs = camembert(**inputs)
    vecteur = outputs.last_hidden_state[:, 0, :].squeeze().numpy()
    return vecteur


def transformer_lot_en_nombres(textes):
    """
    Batch CamemBERT inference to avoid one transformer forward-pass per article,
    which was making scans much slower on tickets with several product lines.
    """
    _ensure_classification_pipeline()
    textes = [str(texte).strip() for texte in textes]
    inputs = tokenizer(
        textes,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=32,
    )
    with torch.no_grad():
        outputs = camembert(**inputs)
    return outputs.last_hidden_state[:, 0, :].cpu().numpy()


def _normalize_space(text):
    return re.sub(r"\s+", " ", str(text or "").strip())


def _normalize_numeric_text(text):
    text = _normalize_space(text).upper()
    chars = list(text)
    replacements = {
        "O": "0",
        "Q": "0",
        "D": "0",
        "I": "1",
        "L": "1",
        "|": "1",
        "S": "5",
        "B": "8",
    }
    for index, char in enumerate(chars):
        previous_char = chars[index - 1] if index > 0 else ""
        next_char = chars[index + 1] if index + 1 < len(chars) else ""
        if char in replacements and (
            previous_char.isdigit()
            or next_char.isdigit()
            or previous_char in " ,./-:"
            or next_char in " ,./-:"
        ):
            chars[index] = replacements[char]
    return "".join(chars)


def _extract_money_candidates(text):
    normalized = _normalize_numeric_text(text)
    candidates = []

    for match in MONEY_PATTERN.finditer(normalized):
        integer_part = re.sub(r"[ .]", "", match.group(1))
        separator = match.group(2)

        if separator == " " and len(integer_part) >= 4 and not any(
            keyword in normalized for keyword in TOTAL_KEYWORDS + PAYMENT_KEYWORDS
        ):
            continue

        if len(integer_part) > 5:
            continue

        value = float(f"{integer_part}.{match.group(3)}")
        if value > 10000:
            continue

        candidates.append(
            {
                "value": value,
                "raw": match.group(0),
                "span": match.span(),
                "separator": separator,
            }
        )

    return candidates


def _extract_date_candidates(text):
    normalized = _normalize_numeric_text(text)
    today = date.today()
    candidates = []

    for date_format, pattern in DATE_PATTERNS:
        for match in pattern.finditer(normalized):
            raw_value = match.group(0)
            normalized_date = raw_value.replace("-", "/").replace(".", "/").replace(" ", "/")
            try:
                parsed = datetime.strptime(normalized_date, date_format).date()
            except ValueError:
                continue

            if parsed.year < 2018 or parsed > today + timedelta(days=2):
                continue

            candidates.append({"date": parsed, "raw": raw_value, "span": match.span()})

    return candidates


def _resize_for_ocr(image):
    height, width = image.shape[:2]
    if width >= 1280:
        return image

    scale = 1280 / max(width, 1)
    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)


def _deskew_image(gray_image):
    inverted = cv2.bitwise_not(gray_image)
    binary = cv2.threshold(inverted, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    coordinates = np.column_stack(np.where(binary > 0))

    if len(coordinates) < 50:
        return gray_image

    angle = cv2.minAreaRect(coordinates)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < 0.3:
        return gray_image

    height, width = gray_image.shape[:2]
    rotation_matrix = cv2.getRotationMatrix2D((width // 2, height // 2), angle, 1.0)
    return cv2.warpAffine(
        gray_image,
        rotation_matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _build_ocr_variants(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = _resize_for_ocr(gray)
    deskewed = _deskew_image(gray)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(deskewed)
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
    adaptive = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )

    return {
        "enhanced": enhanced,
        "adaptive": adaptive,
        "raw": deskewed,
    }


def _score_ocr_result(ocr_result):
    if not ocr_result:
        return -1.0

    texts = [_normalize_space(text) for _, text, _ in ocr_result if _normalize_space(text)]
    confidences = [confidence for _, text, confidence in ocr_result if _normalize_space(text)]
    money_hits = sum(1 for text in texts if _extract_money_candidates(text))
    total_hits = sum(
        1 for text in texts if any(keyword in _normalize_numeric_text(text) for keyword in TOTAL_KEYWORDS)
    )
    # Penalize OCR passes that merge multiple receipt rows into a single long text block.
    overmerged_penalty = sum(
        1.8
        for text in texts
        if len(text) > 40 or len(text.split()) > 8 or len(_extract_money_candidates(text)) > 1
    )

    average_confidence = float(np.mean(confidences)) if confidences else 0.0
    return len(texts) * 0.35 + average_confidence * 10 + money_hits * 1.5 + total_hits * 3 - overmerged_penalty


def _run_best_ocr(image):
    _ensure_ocr_reader()
    variants = _build_ocr_variants(image)

    # Fast path: one OCR pass on the enhanced image handles most receipts.
    primary_result = reader.readtext(
        variants["enhanced"],
        detail=1,
        paragraph=False,
    )
    primary_score = _score_ocr_result(primary_result)

    if primary_score >= 8 and len(primary_result) >= 8:
        return primary_result

    # Fallback: only try a stricter adaptive pass when the main pass looks weak.
    fallback_result = reader.readtext(
        variants["adaptive"],
        detail=1,
        paragraph=False,
        width_ths=0.12,
        y_ths=0.3,
        x_ths=0.4,
        link_threshold=0.12,
    )
    fallback_score = _score_ocr_result(fallback_result)

    if fallback_score > primary_score:
        return fallback_result

    return primary_result


def _build_ocr_items(ocr_result):
    items = []
    for bbox, text, confidence in ocr_result:
        cleaned_text = _normalize_space(text)
        if len(cleaned_text) < 1:
            continue

        x_left = min(point[0] for point in bbox)
        x_right = max(point[0] for point in bbox)
        y_top = min(point[1] for point in bbox)
        y_bottom = max(point[1] for point in bbox)

        items.append(
            {
                "text": cleaned_text,
                "confidence": float(confidence),
                "x_left": float(x_left),
                "x_right": float(x_right),
                "y_top": float(y_top),
                "y_bottom": float(y_bottom),
                "y_center": float((y_top + y_bottom) / 2),
                "height": float(y_bottom - y_top),
            }
        )

    return items


def _line_price_candidate(line):
    candidates = []

    for item in line["items"]:
        for candidate in _extract_money_candidates(item["text"]):
            candidates.append({**candidate, "x_right": item["x_right"]})

    if not candidates:
        for position, candidate in enumerate(_extract_money_candidates(line["text"])):
            candidates.append({**candidate, "x_right": float(position)})

    if not candidates:
        return None

    candidates.sort(key=lambda candidate: (candidate["x_right"], candidate["value"]))
    return candidates[-1]


def _group_items_into_lines(items):
    if not items:
        return []

    sorted_items = sorted(items, key=lambda item: item["y_center"])
    # Prefer a simpler y-based grouping because overlap-based grouping was
    # over-merging adjacent receipt rows on narrow ticket photos.
    base_tolerance = max(10.0, float(np.median([item["height"] for item in sorted_items])) * 0.55)
    lines = []

    for item in sorted_items:
        matching_line = None
        matching_delta = None

        for line in reversed(lines[-4:]):
            tolerance = max(base_tolerance, line["avg_height"] * 0.7, item["height"] * 0.7)
            delta = abs(item["y_center"] - line["y_center"])
            if delta <= tolerance and (matching_delta is None or delta < matching_delta):
                matching_line = line
                matching_delta = delta

        if matching_line is None:
            lines.append(
                {
                    "items": [item],
                    "y_center": item["y_center"],
                    "avg_height": item["height"],
                    "y_top": item["y_top"],
                    "y_bottom": item["y_bottom"],
                }
            )
            continue

        matching_line["items"].append(item)
        matching_line["y_center"] = float(np.mean([entry["y_center"] for entry in matching_line["items"]]))
        matching_line["avg_height"] = float(np.mean([entry["height"] for entry in matching_line["items"]]))
        matching_line["y_top"] = min(entry["y_top"] for entry in matching_line["items"])
        matching_line["y_bottom"] = max(entry["y_bottom"] for entry in matching_line["items"])

    for index, line in enumerate(lines):
        line["items"] = sorted(line["items"], key=lambda item: item["x_left"])
        line["text"] = _normalize_space(" ".join(item["text"] for item in line["items"]))
        line["normalized_text"] = _normalize_numeric_text(line["text"])
        line["price_candidate"] = _line_price_candidate(line)
        line["date_candidates"] = _extract_date_candidates(line["text"])
        line["index"] = index

    return lines


def _merchant_score(line):
    normalized_text = line["normalized_text"]
    letters_count = sum(char.isalpha() for char in normalized_text)
    digits_count = sum(char.isdigit() for char in normalized_text)

    if letters_count < 4:
        return -1.0
    if any(keyword in normalized_text for keyword in MERCHANT_EXCLUDE_KEYWORDS):
        return -2.0
    if line["price_candidate"] or line["date_candidates"]:
        return -0.5

    score = letters_count * 0.35
    score -= digits_count * 0.8
    score -= line["index"] * 0.7

    if line["index"] == 0:
        score += 2.5
    if len(normalized_text) > 36:
        score -= 1.5

    return score


def _detect_merchant(lines):
    best_line = None
    best_score = -10.0

    for line in lines[:10]:
        score = _merchant_score(line)
        if score > best_score:
            best_score = score
            best_line = line

    if best_line and best_score > 0:
        return best_line["text"], best_line["index"]

    return "Marchand Inconnu", None


def _detect_date(lines):
    best_candidate = None
    best_index = None

    for line in lines:
        if not line["date_candidates"]:
            continue
        if best_candidate is None or line["index"] < best_index:
            best_candidate = line["date_candidates"][0]["date"]
            best_index = line["index"]

    return best_candidate


def _score_total_line(line, total_lines_count):
    price_candidate = line["price_candidate"]
    if not price_candidate:
        return -10.0

    normalized_text = line["normalized_text"]
    score = 0.0

    if any(keyword in normalized_text for keyword in TOTAL_KEYWORDS):
        score += 10
    if any(keyword in normalized_text for keyword in PAYMENT_KEYWORDS):
        score += 4
    if any(keyword in normalized_text for keyword in TOTAL_NEGATIVE_KEYWORDS):
        score -= 5

    if line["index"] >= total_lines_count * 0.6:
        score += 3

    if price_candidate["separator"] == " " and price_candidate["value"] > 999:
        score -= 4

    score += min(price_candidate["value"] / 50, 4)
    return score


def _detect_total(lines):
    best_line = None
    best_score = -10.0

    for line in lines:
        score = _score_total_line(line, len(lines))
        if score > best_score:
            best_score = score
            best_line = line

    if best_line and best_line["price_candidate"] and best_score > 0:
        return best_line["price_candidate"]["value"], best_line["index"]

    fallback_candidates = [
        line
        for line in lines
        if line["price_candidate"]
        and line["index"] >= max(int(len(lines) * 0.6), len(lines) - 8)
        and not any(keyword in line["normalized_text"] for keyword in TOTAL_NEGATIVE_KEYWORDS)
    ]
    if fallback_candidates:
        fallback_candidates.sort(
            key=lambda line: (line["index"], line["price_candidate"]["value"]),
        )
        best_line = fallback_candidates[-1]
        return best_line["price_candidate"]["value"], best_line["index"]

    return 0.0, None


def _is_address_like_line(normalized_text):
    if not normalized_text:
        return False
    if normalized_text in {"FRANCE", "PARIS"}:
        return True
    if re.search(r"\b\d{5}\b", normalized_text):
        return True
    if any(keyword in normalized_text for keyword in ("RUE", "AVENUE", "BOULEVARD", "ARRONDISSEMENT", "CEDEX")):
        return True
    return False


def _detect_article_section_start(lines):
    # When a receipt has a clear table header (Qty / Designation / PU / TTC),
    # everything above it is header/meta and should not be treated as products.
    for line in lines[:25]:
        normalized_text = line["normalized_text"]
        header_hits = sum(1 for keyword in PRODUCT_HEADER_KEYWORDS if keyword in normalized_text)
        if header_hits >= 2:
            return line["index"] + 1
    return 0


def _extract_product_name(line):
    parts = []

    for item in line["items"]:
        item_text = item["text"]
        normalized_item = _normalize_numeric_text(item_text)

        if _extract_date_candidates(item_text):
            continue
        if any(keyword in normalized_item for keyword in NON_ARTICLE_KEYWORDS):
            continue

        if _extract_money_candidates(item_text):
            stripped = MONEY_PATTERN.sub(" ", normalized_item)
            stripped = _normalize_space(stripped).strip(" -:")
            if stripped and sum(char.isalpha() for char in stripped) >= 2:
                parts.append(stripped)
            continue

        parts.append(item_text)

    product_name = _normalize_space(" ".join(parts)).strip(" -:")
    product_name = re.sub(r"^\d+\s+", "", product_name)
    product_name = re.sub(r"\s+\d{1,2}$", "", product_name)
    return product_name


def _extract_articles(lines, merchant_line_index, total_line_index):
    articles = []
    start_index = _detect_article_section_start(lines)
    max_index = total_line_index if total_line_index is not None else len(lines)

    for line in lines[start_index:max_index]:
        normalized_text = line["normalized_text"]

        # Hard filters for receipt header/footer noise that often slips into OCR output.
        if merchant_line_index is not None and line["index"] == merchant_line_index:
            continue
        if any(keyword in normalized_text for keyword in NON_ARTICLE_KEYWORDS):
            continue
        if _is_address_like_line(normalized_text):
            continue
        if line["index"] < 2 and line["price_candidate"] is None:
            continue

        product_name = _extract_product_name(line)
        if not product_name or est_une_impurete(product_name):
            continue

        price = line["price_candidate"]["value"] if line["price_candidate"] else 0.0
        if price == 0.0 and sum(char.isalpha() for char in product_name) < 5:
            continue

        articles.append(
            {
                "nom": product_name,
                "prix": float(price),
                "confiance_ocr": float(max(item["confidence"] for item in line["items"])),
            }
        )

    return articles


def _compute_global_confidence(items, merchant_name, achat_date, montant_total, articles):
    average_confidence = float(np.mean([item["confidence"] for item in items])) if items else 0.0
    completeness_score = 0.0

    if merchant_name and merchant_name != "Marchand Inconnu":
        completeness_score += 0.2
    if achat_date is not None:
        completeness_score += 0.2
    if montant_total > 0:
        completeness_score += 0.3
    if articles:
        completeness_score += 0.3

    confidence = (average_confidence * 0.7 + completeness_score * 0.3) * 100
    return round(max(0.0, min(99.0, confidence)), 1)


def analyser_image_ticket(image_bytes: bytes):
    """
    Analyse une image de ticket pour extraire le marchand, la date,
    le total et les lignes produits avec une logique OCR plus robuste.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("L'image n'a pas pu etre decodee.")
    except Exception as exc:
        raise ValueError(f"Erreur de lecture OpenCV : {exc}") from exc

    ocr_result = _run_best_ocr(image)
    items = _build_ocr_items(ocr_result)
    lines = _group_items_into_lines(items)

    merchant_name, merchant_line_index = _detect_merchant(lines)
    achat_date = _detect_date(lines)
    montant_total, total_line_index = _detect_total(lines)
    articles = _extract_articles(lines, merchant_line_index, total_line_index)

    if montant_total <= 0:
        article_total = sum(article["prix"] for article in articles if article["prix"] > 0)
        montant_total = round(article_total, 2) if article_total > 0 else 0.0

    categorie_dominante = None

    if articles:
        _ensure_classification_pipeline()

    if cerveau is not None and articles:
        textes_a_predire = [article["nom"] for article in articles]
        vecteurs = transformer_lot_en_nombres(textes_a_predire)
        predictions = cerveau.predict(vecteurs)

        repartition_categories = defaultdict(float)
        for prediction, article in zip(predictions, articles):
            article["categorie"] = str(prediction)
            repartition_categories[str(prediction)] += article["prix"] if article["prix"] > 0 else 1.0

        if repartition_categories:
            categorie_dominante = max(repartition_categories.items(), key=lambda item: item[1])[0]
    else:
        for article in articles:
            article["categorie"] = "Inconnue"

    confiance_globale = _compute_global_confidence(
        items,
        merchant_name,
        achat_date,
        montant_total,
        articles,
    )

    return {
        "nom_marchand": merchant_name,
        "montant_total": float(montant_total),
        "date_achat": achat_date.isoformat() if achat_date else None,
        "categorie_recommandee": str(categorie_dominante) if categorie_dominante else None,
        "confiance_globale": confiance_globale,
        "articles": articles,
    }
