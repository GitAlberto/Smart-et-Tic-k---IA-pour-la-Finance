from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from api.deps import get_current_user
from core.ai_service import analyser_image_ticket

router = APIRouter(prefix="/api/tickets", tags=["OCR Scanner"])

@router.post("/scan")
async def scan_ticket_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Receives an image of a receipt, runs OCR and ML models, 
    and returns extracted structured data.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image (JPG, PNG).")

    try:
        # Read file bytes into memory
        image_bytes = await file.read()
        
        # Pass to the AI Service (this blocks but it's okay for our MVP)
        resultats_ia = analyser_image_ticket(image_bytes)
        
        # We try to match the predicted global category name to our database Category UUID
        categorie_id = None
        if resultats_ia["categorie_recommandee"]:
            cat_db = db.query(models.Category).filter(
                models.Category.nom.ilike(f"%{resultats_ia['categorie_recommandee']}%")
            ).first()
            if cat_db:
                categorie_id = str(cat_db.id)
                
        # Format the response to be easily ingested by the frontend React form
        return {
            "nom_marchand": resultats_ia["nom_marchand"],
            "montant_total": resultats_ia["montant_total"],
            "date_achat": resultats_ia["date_achat"],
            "categorie_id": categorie_id,
            "confiance": resultats_ia["confiance_globale"],
            "categorie_nom_brut": resultats_ia["categorie_recommandee"],
            "articles": resultats_ia.get("articles", []) # Nouveau ! Les articles réels
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse du ticket : {str(e)}")
