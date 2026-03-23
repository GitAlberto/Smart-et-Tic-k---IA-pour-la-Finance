from sqlalchemy import Column, String, DateTime, Boolean, text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid

class User(Base):
    __tablename__ = "utilisateurs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    pseudo = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    mot_de_passe_hache = Column(String, nullable=False)
    prenom = Column(String(100))
    nom = Column(String(100))
    ville = Column(String(100))
    code_postal = Column(String(20))
    budget_fixe = Column(Numeric(10, 2), default=1500.0)
    abonnement = Column(String(50), default="Gratuit")
    est_admin = Column(Boolean, default=False)
    cree_le = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    mis_a_jour_le = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class RevokedToken(Base):
    """
    Table used as a blacklist for JWT tokens logic (Logout).
    """
    __tablename__ = "jetons_revoques"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    jeton = Column(String, unique=True, nullable=False)
    revoque_le = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    nom = Column(String(100), unique=True, nullable=False)
    code_couleur_hex = Column(String(7), default="#000000")
    icone = Column(String(50))
    cree_le = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import relationship

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False)
    
    nom_marchand = Column(String(255), nullable=False)
    montant_total = Column(Numeric(10, 2), nullable=False)
    date_achat = Column(Date, nullable=False)
    categorie_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"))
    est_exceptionnel = Column(Boolean, default=False, server_default=text("FALSE"), nullable=False)
    statut = Column(String(50), default="en attente")
    
    confiance_ocr = Column(Numeric(5, 2))
    url_image = Column(String)
    texte_brut_extrait = Column(String)
    
    cree_le = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    mis_a_jour_le = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

    # Relationships
    categorie = relationship("Category")
    articles = relationship("Article", back_populates="ticket", cascade="all, delete")

    @property
    def source_saisie(self):
        """
        Infer ticket origin without changing the database schema.
        Manual tickets do not have an OCR confidence score, while scanned ones do.
        """
        return "scan" if self.confiance_ocr is not None else "manuel"

class Article(Base):
    __tablename__ = "articles_ticket"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    
    nom = Column(String(255), nullable=False)
    prix = Column(Numeric(10, 2), nullable=False)
    quantite = Column(Numeric(10, 2), default=1.0)
    categorie_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"))
    
    cree_le = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

    # Relationships
    ticket = relationship("Ticket", back_populates="articles")
    categorie = relationship("Category")
