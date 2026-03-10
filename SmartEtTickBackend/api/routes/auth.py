from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
import models
import schemas
from database import get_db
from core.security import get_password_hash, verify_password, create_access_token, create_reset_token, SECRET_KEY, ALGORITHM
from api.deps import get_current_user
from jose import jwt, JWTError

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check email
    existing_user_email = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user_email:
        raise HTTPException(status_code=400, detail="Un compte avec cet email existe déjà.")
    
    # Check pseudo
    existing_user_pseudo = db.query(models.User).filter(models.User.pseudo == user_in.pseudo).first()
    if existing_user_pseudo:
        suggested = f"{user_in.pseudo}123"
        raise HTTPException(status_code=400, detail=f"Ce pseudo est déjà pris. Pourquoi pas '{suggested}' ?")

    hashed_password = get_password_hash(user_in.password)

    new_user = models.User(
        email=user_in.email,
        pseudo=user_in.pseudo,
        mot_de_passe_hache=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        or_(
            models.User.email == user_in.login,
            models.User.pseudo == user_in.login
        )
    ).first()

    if not user or not verify_password(user_in.password, user.mot_de_passe_hache):
        raise HTTPException(status_code=401, detail="Identifiant ou mot de passe incorrect.")

    access_token = create_access_token(data={"sub": user.email})

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"message": "Déconnexion réussie."}

@router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Don't reveal whether email exists for security
        return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}
    
    reset_token = create_reset_token(data={"sub": user.email})
    reset_link = f"http://localhost:5173?token={reset_token}"
    print(f"[DEV] Lien de réinitialisation pour {user.email}: {reset_link}")
    
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé.", "dev_link": reset_link}

@router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré.")
    
    try:
        payload = jwt.decode(req.token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Validate that this specific token isn't already used (revoked)
    is_revoked = db.query(models.RevokedToken).filter(models.RevokedToken.jeton == req.token).first()
    if is_revoked:
        raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable.")

    user.mot_de_passe_hache = get_password_hash(req.new_password)
    
    revoked_token = models.RevokedToken(jeton=req.token)
    db.add(revoked_token)
    
    db.commit()
    return {"message": "Mot de passe mis à jour avec succès."}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Returns the logged-in user's profile."""
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
def update_me(user_update: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update the logged-in user's profile details."""
    # Re-fetch user from the SAME db session used in this route to avoid SQLAlchemy detachment
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if user_update.prenom is not None:
        user.prenom = user_update.prenom
    if user_update.nom is not None:
        user.nom = user_update.nom
    if user_update.ville is not None:
        user.ville = user_update.ville
    if user_update.code_postal is not None:
        user.code_postal = user_update.code_postal
    if user_update.budget_fixe is not None:
        user.budget_fixe = user_update.budget_fixe
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete the logged-in user's account and all associated data (via CASCADE)."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if user:
        db.delete(user)
        db.commit()
    return None
