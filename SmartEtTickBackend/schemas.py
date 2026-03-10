from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date

class UserUpdate(BaseModel):
    prenom: Optional[str] = None
    nom: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    budget_fixe: Optional[float] = None

class UserCreate(BaseModel):
    pseudo: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    login: str # Can be email or pseudo
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: UUID
    pseudo: str
    email: str
    prenom: Optional[str] = None
    nom: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    budget_fixe: Optional[float] = None
    abonnement: Optional[str] = "Gratuit"
    est_admin: Optional[bool] = False
    cree_le: Optional[datetime] = None

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class CategorySchema(BaseModel):
    id: UUID
    nom: str
    code_couleur_hex: Optional[str] = None
    icone: Optional[str] = None

    class Config:
        from_attributes = True

class ArticleSchema(BaseModel):
    id: UUID
    nom: str
    prix: float
    quantite: float
    categorie: Optional[CategorySchema] = None

    class Config:
        from_attributes = True

class TicketCreate(BaseModel):
    nom_marchand: str
    montant_total: float
    date_achat: date
    categorie_id: Optional[UUID] = None

class TicketUpdate(BaseModel):
    nom_marchand: Optional[str] = None
    montant_total: Optional[float] = None
    date_achat: Optional[date] = None
    categorie_id: Optional[UUID] = None

class TicketSchema(BaseModel):
    id: UUID
    nom_marchand: str
    montant_total: float
    date_achat: date
    statut: str
    categorie: Optional[CategorySchema] = None
    articles: List[ArticleSchema] = []

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_depenses: float
    total_tickets: int
    categories_actives: int
    trend_depenses: float = 0.0
    trend_tickets: float = 0.0
    trend_categories: float = 0.0
    budget_fixe: float = 0.0
    depassement_budget: float = 0.0
    pct_depassement: float = 0.0
    economie_comparaison: float = 0.0
