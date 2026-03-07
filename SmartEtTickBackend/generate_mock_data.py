import random
import uuid
from datetime import datetime, timedelta
from faker import Faker
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import User, text
import passlib.hash

# Initialize French Faker
fake = Faker('fr_FR')

# We need direct table access since some classes aren't in models.py yet
from sqlalchemy import MetaData, Table

metadata = MetaData()
metadata.reflect(bind=engine)

Utilisateurs = metadata.tables['utilisateurs']
Categories = metadata.tables['categories']
Tickets = metadata.tables['tickets']
Articles = metadata.tables['articles_ticket']

def generate_fake_data(num_users=5, tickets_per_user=(5, 15)):
    print(f"-> Generation de fausses donnees...")
    db: Session = SessionLocal()
    
    try:
        # 1. Fetch Categories
        categories_db = db.execute(Categories.select()).fetchall()
        if not categories_db:
            print("[X] Aucune categorie trouvee dans la DB ! Lancez d'abord le script SQL de creation.")
            return

        category_ids = [cat.id for cat in categories_db]

        # 2. Create Users
        from core.security import get_password_hash
        default_pwd = get_password_hash("password123")
        
        users_created = []

        for _ in range(num_users):
            user_data = {
                "id": uuid.uuid4(),
                "pseudo": fake.unique.user_name(),
                "email": fake.unique.email(),
                "mot_de_passe_hache": default_pwd,
                "prenom": fake.first_name(),
                "nom": fake.last_name(),
                "ville": fake.city(),
                "code_postal": fake.postcode(),
                "abonnement": random.choice(["Gratuit", "Premium"]),
                "est_admin": False,
                "cree_le": fake.date_time_between(start_date='-1y', end_date='now')
            }
            db.execute(Utilisateurs.insert().values(**user_data))
            users_created.append(user_data)
            print(f"- Utilisateur cree: {user_data['pseudo']} ({user_data['email']})")

        # 3. Create Tickets and Items for each user
        marchands_communs = ["Carrefour", "Leclerc", "SNCF", "Boulanger", "Pharmacie Lafayette", "Uber", "TotalEnergies", "Fnac", "Leroy Merlin", "Restaurant Le Gourmet"]
        
        total_tickets = 0
        total_items = 0

        for user in users_created:
            num_tickets = random.randint(*tickets_per_user)
            
            for _ in range(num_tickets):
                ticket_id = uuid.uuid4()
                ticket_date = fake.date_time_between(start_date=user["cree_le"], end_date='now').date()
                cat_id = random.choice(category_ids)
                
                # Create 1 to 5 items per ticket
                num_items = random.randint(1, 5)
                ticket_amount = 0
                
                items_to_insert = []
                for _ in range(num_items):
                    item_price = round(random.uniform(2.0, 80.0), 2)
                    item_qty = random.randint(1, 3)
                    ticket_amount += (item_price * item_qty)
                    
                    items_to_insert.append({
                        "id": uuid.uuid4(),
                        "ticket_id": ticket_id,
                        "nom": fake.word().capitalize() + " " + fake.word(),
                        "prix": item_price,
                        "quantite": item_qty,
                        "categorie_id": cat_id,
                    })

                # Insert Ticket
                ticket_data = {
                    "id": ticket_id,
                    "utilisateur_id": user["id"],
                    "nom_marchand": random.choice(marchands_communs),
                    "montant_total": round(ticket_amount, 2),
                    "date_achat": ticket_date,
                    "categorie_id": cat_id,
                    "statut": random.choice(["validé", "en attente", "validé", "validé"]), # Plus de chances d'être validé
                    "confiance_ocr": round(random.uniform(70.0, 99.9), 2)
                }
                
                db.execute(Tickets.insert().values(**ticket_data))
                
                # Insert Items
                if items_to_insert:
                    db.execute(Articles.insert().values(items_to_insert))
                
                total_tickets += 1
                total_items += num_items

        db.commit()
        print(f"[OK] Generation terminee !")
        print(f"-> Bilan: {num_users} utilisateurs, {total_tickets} tickets, {total_items} articles generes.")
        print(f"[!] IMPORTANT: Tous les utilisateurs ont comme mot de passe : 'password123'")

    except Exception as e:
        db.rollback()
        print(f"[X] Erreur lors de la generation: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_fake_data()
