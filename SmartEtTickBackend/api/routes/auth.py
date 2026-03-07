from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
import models
import schemas
from database import get_db
from core.security import get_password_hash, verify_password, create_access_token, create_reset_token
from api.deps import get_current_user

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

    # Hash pwd
    hashed_password = get_password_hash(user_in.password)

    # Create user
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
    # user_in.login can be email OR pseudo
    user = db.query(models.User).filter(
        or_(
            models.User.email == user_in.login,
            models.User.pseudo == user_in.login
        )
    ).first()

    if not user or not verify_password(user_in.password, user.mot_de_passe_hache):
        raise HTTPException(status_code=401, detail="Identifiant ou mot de passe incorrect.")

    # Create JWT
    access_token = create_access_token(data={"sub": user.email})

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: models.User = Depends(get_current_user), token: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Add token to Blacklist
    from fastapi import Request
    # We need the pure token string. Let's get it correctly from the dependency context if needed, 
    # but the easiest way is to inject the Request and read the header.
    pass

# We will write a better logout function down below.

@router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Don't reveal if user exists or not for security, just say OK
        return {"message": "Si l'adresse existe, un email a été envoyé."}
    
    reset_token = create_reset_token(email=req.email)
    
    # Here, you would normally send an email with the link: 
    # `http://localhost:5173/auth/reset-password?token={reset_token}`
    # For now we'll just return it in the response to test the API directly.
    return {
        "message": "Si l'adresse existe, un email a été envoyé.",
        "debug_reset_token": reset_token  # ONLY FOR DEV! Remove in PROD
    }

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    from core.security import SECRET_KEY, ALGORITHM
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(req.token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "reset":
            raise HTTPException(status_code=400, detail="Lien invalide ou expiré.")
    except JWTError:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré.")

    # Validate that this specific token isn't already used (revoked)
    is_revoked = db.query(models.RevokedToken).filter(models.RevokedToken.jeton == req.token).first()
    if is_revoked:
        raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé.")

    # Update password
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable.")

    user.mot_de_passe_hache = get_password_hash(req.new_password)
    
    # Revoke the token so it can't be used twice
    revoked_token = models.RevokedToken(jeton=req.token)
    db.add(revoked_token)
    
    db.commit()
    return {"message": "Mot de passe mis à jour avec succès."}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """
    Test protected route: returns the logged-in user details.
    """
    return current_user
