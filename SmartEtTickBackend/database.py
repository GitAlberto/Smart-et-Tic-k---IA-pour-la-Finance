from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Mot_de_passe = "Mot de passe"
SQLALCHEMY_DATABASE_URL = f"postgresql://postgres:{Mot_de_passe}@localhost:5432/Smart-Et-Tick"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
