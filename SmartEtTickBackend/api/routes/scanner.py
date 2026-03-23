from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

import models
from api.deps import get_current_user
from core.ai_service import analyser_image_ticket
from database import get_db

router = APIRouter(prefix="/api/tickets", tags=["OCR Scanner"])


def _normalize_category_label(value: str):
    return (
        str(value or "")
        .lower()
        .replace("_", " ")
        .replace("/", " ")
        .replace("-", " ")
        .strip()
    )


def _resolve_category_id(raw_label: str, categories):
    if not raw_label:
        return None

    normalized_label = _normalize_category_label(raw_label)
    for category in categories:
        normalized_category = _normalize_category_label(category.nom)
        if (
            normalized_label == normalized_category
            or normalized_label in normalized_category
            or normalized_category in normalized_label
        ):
            return str(category.id)

    return None


@router.post("/scan")
async def scan_ticket_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Receive a receipt image, run OCR + heuristics and return structured data.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit etre une image (JPG, PNG).")

    try:
        image_bytes = await file.read()
        resultats_ia = analyser_image_ticket(image_bytes)

        categories = db.query(models.Category).all()
        categorie_id = _resolve_category_id(resultats_ia["categorie_recommandee"], categories)

        articles = []
        for article in resultats_ia.get("articles", []):
            articles.append(
                {
                    **article,
                    "categorie_id": _resolve_category_id(article.get("categorie"), categories),
                }
            )

        return {
            "nom_marchand": resultats_ia["nom_marchand"],
            "montant_total": resultats_ia["montant_total"],
            "date_achat": resultats_ia["date_achat"],
            "categorie_id": categorie_id,
            "confiance": resultats_ia["confiance_globale"],
            "categorie_nom_brut": resultats_ia["categorie_recommandee"],
            "articles": articles,
        }

    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse du ticket : {exc}") from exc
