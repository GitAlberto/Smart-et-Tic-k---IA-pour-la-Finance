import random
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from faker import Faker
from sqlalchemy import MetaData
from sqlalchemy.orm import Session

from database import SessionLocal, engine

SEED = 42
random.seed(SEED)
Faker.seed(SEED)
fake = Faker("fr_FR")
fake.seed_instance(SEED)

metadata = MetaData()
metadata.reflect(bind=engine)

Utilisateurs = metadata.tables["utilisateurs"]
Categories = metadata.tables["categories"]
Tickets = metadata.tables["tickets"]
Articles = metadata.tables["articles_ticket"]
ticket_columns = set(Tickets.c.keys())


@dataclass(frozen=True)
class ProductTemplate:
    name: str
    price_min: float
    price_max: float
    qty_min: int = 1
    qty_max: int = 2


@dataclass(frozen=True)
class ProfileBlueprint:
    label: str
    pseudo_base: str
    prenom: str
    nom: str
    ville: str
    code_postal: str
    budget_fixe: float
    abonnement: str
    tickets_min: int
    tickets_max: int
    scan_ratio: float
    exceptional_ratio: float
    category_weights: dict[str, int]


CATEGORY_CATALOG = {
    "alimentation": {
        "merchants": (
            "Carrefour City",
            "Monoprix",
            "Auchan",
            "Leclerc",
            "Biocoop",
            "Picard",
            "Franprix",
        ),
        "products": (
            ProductTemplate("Pommes gala", 1.80, 4.20, 1, 3),
            ProductTemplate("Pates completes", 1.10, 2.80, 1, 4),
            ProductTemplate("Oeufs x6", 1.90, 3.80, 1, 2),
            ProductTemplate("Yaourt nature x4", 1.60, 3.60, 1, 2),
            ProductTemplate("Poulet fermier", 5.50, 11.90, 1, 2),
            ProductTemplate("Riz basmati", 2.20, 4.80, 1, 3),
            ProductTemplate("Legumes surgeles", 2.50, 5.50, 1, 3),
            ProductTemplate("Pain complet", 1.20, 2.70, 1, 2),
            ProductTemplate("Saumon fume", 4.90, 9.80, 1, 2),
            ProductTemplate("Fromage rappe", 2.30, 4.60, 1, 2),
        ),
        "exceptional_products": (
            ProductTemplate("Course mensuelle famille", 95.0, 185.0, 1, 1),
            ProductTemplate("Barbecue entre amis", 55.0, 120.0, 1, 1),
        ),
    },
    "boissons": {
        "merchants": (
            "Starbucks",
            "Columbus Cafe",
            "Monoprix",
            "Franprix",
            "Relay",
        ),
        "products": (
            ProductTemplate("Eau minerale 1L", 0.70, 1.40, 1, 6),
            ProductTemplate("Cafe latte", 2.50, 5.60, 1, 2),
            ProductTemplate("Jus d orange", 1.80, 3.90, 1, 3),
            ProductTemplate("The glace", 1.40, 3.20, 1, 3),
            ProductTemplate("Boisson proteinee", 2.20, 4.80, 1, 2),
            ProductTemplate("Capsules cafe", 3.90, 8.50, 1, 2),
            ProductTemplate("Soda zero", 1.20, 2.80, 1, 4),
        ),
        "exceptional_products": (
            ProductTemplate("Coffret cafe premium", 18.0, 42.0, 1, 1),
        ),
    },
    "divers bazar": {
        "merchants": (
            "Action",
            "HEMA",
            "Tiger",
            "Leroy Merlin",
            "Castorama",
            "Ikea",
        ),
        "products": (
            ProductTemplate("Carnet A5", 1.50, 4.90, 1, 3),
            ProductTemplate("Pile AA x8", 3.20, 7.90, 1, 2),
            ProductTemplate("Boite de rangement", 4.50, 12.90, 1, 2),
            ProductTemplate("Chargeur USB", 6.90, 19.90, 1, 1),
            ProductTemplate("Ampoule LED", 2.80, 9.50, 1, 4),
            ProductTemplate("Cintres x10", 4.20, 11.90, 1, 2),
            ProductTemplate("Papier cadeau", 1.50, 4.80, 1, 3),
        ),
        "exceptional_products": (
            ProductTemplate("Chaise de bureau", 89.0, 189.0, 1, 1),
            ProductTemplate("Petite etagere", 55.0, 129.0, 1, 1),
            ProductTemplate("Lampe de bureau", 24.0, 65.0, 1, 1),
        ),
    },
    "entretien": {
        "merchants": (
            "Carrefour",
            "Monoprix",
            "Leclerc",
            "Action",
            "Leroy Merlin",
        ),
        "products": (
            ProductTemplate("Lessive liquide", 4.20, 11.50, 1, 2),
            ProductTemplate("Liquide vaisselle", 1.50, 3.80, 1, 3),
            ProductTemplate("Sacs poubelle", 2.90, 6.90, 1, 2),
            ProductTemplate("Nettoyant multi usage", 2.20, 5.80, 1, 2),
            ProductTemplate("Eponge x3", 1.80, 4.20, 1, 2),
            ProductTemplate("Spray vitre", 2.10, 4.90, 1, 2),
            ProductTemplate("Tablettes lave vaisselle", 5.20, 14.50, 1, 2),
        ),
        "exceptional_products": (
            ProductTemplate("Aspirateur balai", 129.0, 299.0, 1, 1),
            ProductTemplate("Nettoyeur vapeur", 79.0, 169.0, 1, 1),
        ),
    },
    "hygiene et beaute": {
        "merchants": (
            "Sephora",
            "Marionnaud",
            "Monoprix",
            "Yves Rocher",
            "Pharmacie Lafayette",
        ),
        "products": (
            ProductTemplate("Shampooing doux", 3.80, 8.90, 1, 2),
            ProductTemplate("Gel douche", 2.20, 5.80, 1, 3),
            ProductTemplate("Creme hydratante", 5.50, 14.90, 1, 2),
            ProductTemplate("Dentifrice", 1.90, 4.50, 1, 3),
            ProductTemplate("Deodorant", 2.50, 6.20, 1, 2),
            ProductTemplate("Cotons x80", 1.60, 3.90, 1, 2),
            ProductTemplate("Rasoirs x4", 3.80, 10.90, 1, 2),
        ),
        "exceptional_products": (
            ProductTemplate("Parfum 50ml", 45.0, 110.0, 1, 1),
            ProductTemplate("Lisseur cheveux", 39.0, 99.0, 1, 1),
            ProductTemplate("Coffret soin visage", 29.0, 75.0, 1, 1),
        ),
    },
    "restauration": {
        "merchants": (
            "Paul",
            "Brioche Doree",
            "Sushi Shop",
            "McDonald's",
            "Burger King",
            "Restaurant du Centre",
            "Pizzeria Napoli",
        ),
        "products": (
            ProductTemplate("Menu burger", 8.50, 14.90, 1, 2),
            ProductTemplate("Sandwich poulet", 4.90, 8.40, 1, 2),
            ProductTemplate("Salade composee", 6.90, 12.80, 1, 2),
            ProductTemplate("Part pizza", 3.50, 5.80, 1, 3),
            ProductTemplate("Menu sushi", 11.50, 22.90, 1, 2),
            ProductTemplate("Plat du jour", 10.50, 18.90, 1, 2),
            ProductTemplate("Cookie maison", 1.60, 3.80, 1, 3),
        ),
        "exceptional_products": (
            ProductTemplate("Diner anniversaire", 45.0, 95.0, 1, 1),
            ProductTemplate("Brunch weekend", 28.0, 55.0, 1, 1),
        ),
    },
}

MIX_RULES = {
    "alimentation": (("boissons", 0.55), ("hygiene et beaute", 0.30), ("entretien", 0.28), ("divers bazar", 0.20)),
    "boissons": (("restauration", 0.35), ("alimentation", 0.30)),
    "divers bazar": (("entretien", 0.45), ("hygiene et beaute", 0.22)),
    "entretien": (("divers bazar", 0.35), ("hygiene et beaute", 0.22)),
    "hygiene et beaute": (("divers bazar", 0.25), ("alimentation", 0.12)),
    "restauration": (("boissons", 0.60),),
}

MULTI_CATEGORY_MERCHANTS = (
    "Carrefour City",
    "Monoprix",
    "Auchan",
    "Leclerc",
    "Franprix",
)

PROFILE_BLUEPRINTS = [
    ProfileBlueprint(
        label="Etudiante budget serre",
        pseudo_base="lea_budget",
        prenom="Lea",
        nom="Moulin",
        ville="Lille",
        code_postal="59000",
        budget_fixe=680.0,
        abonnement="Gratuit",
        tickets_min=16,
        tickets_max=24,
        scan_ratio=0.38,
        exceptional_ratio=0.02,
        category_weights={
            "restauration": 32,
            "alimentation": 28,
            "boissons": 18,
            "divers bazar": 10,
            "hygiene et beaute": 7,
            "entretien": 5,
        },
    ),
    ProfileBlueprint(
        label="Jeune actif urbain",
        pseudo_base="yanis_urbain",
        prenom="Yanis",
        nom="Perrot",
        ville="Paris",
        code_postal="75011",
        budget_fixe=1500.0,
        abonnement="Premium",
        tickets_min=18,
        tickets_max=28,
        scan_ratio=0.55,
        exceptional_ratio=0.05,
        category_weights={
            "restauration": 26,
            "alimentation": 24,
            "boissons": 18,
            "divers bazar": 12,
            "hygiene et beaute": 10,
            "entretien": 10,
        },
    ),
    ProfileBlueprint(
        label="Couple avec enfants",
        pseudo_base="famille_renard",
        prenom="Camille",
        nom="Renard",
        ville="Nantes",
        code_postal="44000",
        budget_fixe=3200.0,
        abonnement="Premium",
        tickets_min=24,
        tickets_max=34,
        scan_ratio=0.78,
        exceptional_ratio=0.10,
        category_weights={
            "alimentation": 38,
            "boissons": 16,
            "entretien": 16,
            "hygiene et beaute": 12,
            "divers bazar": 10,
            "restauration": 8,
        },
    ),
    ProfileBlueprint(
        label="Parent solo organise",
        pseudo_base="sarah_solo",
        prenom="Sarah",
        nom="Chevalier",
        ville="Toulouse",
        code_postal="31000",
        budget_fixe=2100.0,
        abonnement="Premium",
        tickets_min=20,
        tickets_max=30,
        scan_ratio=0.84,
        exceptional_ratio=0.08,
        category_weights={
            "alimentation": 35,
            "boissons": 12,
            "entretien": 16,
            "hygiene et beaute": 12,
            "divers bazar": 12,
            "restauration": 13,
        },
    ),
    ProfileBlueprint(
        label="Freelance mobile",
        pseudo_base="nora_nomade",
        prenom="Nora",
        nom="Diallo",
        ville="Lyon",
        code_postal="69007",
        budget_fixe=1900.0,
        abonnement="Premium",
        tickets_min=18,
        tickets_max=27,
        scan_ratio=0.67,
        exceptional_ratio=0.06,
        category_weights={
            "restauration": 23,
            "boissons": 18,
            "alimentation": 22,
            "divers bazar": 15,
            "entretien": 10,
            "hygiene et beaute": 12,
        },
    ),
    ProfileBlueprint(
        label="Teletravailleur prevoyant",
        pseudo_base="arthur_home",
        prenom="Arthur",
        nom="Bailly",
        ville="Rennes",
        code_postal="35000",
        budget_fixe=2400.0,
        abonnement="Premium",
        tickets_min=20,
        tickets_max=30,
        scan_ratio=0.80,
        exceptional_ratio=0.07,
        category_weights={
            "alimentation": 31,
            "boissons": 12,
            "entretien": 18,
            "hygiene et beaute": 12,
            "divers bazar": 15,
            "restauration": 12,
        },
    ),
    ProfileBlueprint(
        label="Retraitee prudente",
        pseudo_base="odette_prudente",
        prenom="Odette",
        nom="Masson",
        ville="Dijon",
        code_postal="21000",
        budget_fixe=1350.0,
        abonnement="Gratuit",
        tickets_min=16,
        tickets_max=24,
        scan_ratio=0.86,
        exceptional_ratio=0.04,
        category_weights={
            "alimentation": 37,
            "boissons": 10,
            "entretien": 17,
            "hygiene et beaute": 18,
            "divers bazar": 10,
            "restauration": 8,
        },
    ),
    ProfileBlueprint(
        label="Jeune couple foodie",
        pseudo_base="mila_foodie",
        prenom="Mila",
        nom="Lacombe",
        ville="Bordeaux",
        code_postal="33000",
        budget_fixe=2650.0,
        abonnement="Premium",
        tickets_min=20,
        tickets_max=29,
        scan_ratio=0.62,
        exceptional_ratio=0.08,
        category_weights={
            "restauration": 30,
            "alimentation": 26,
            "boissons": 16,
            "divers bazar": 10,
            "hygiene et beaute": 8,
            "entretien": 10,
        },
    ),
    ProfileBlueprint(
        label="Bricoleur maison",
        pseudo_base="julien_bricole",
        prenom="Julien",
        nom="Noel",
        ville="Strasbourg",
        code_postal="67000",
        budget_fixe=2300.0,
        abonnement="Premium",
        tickets_min=18,
        tickets_max=26,
        scan_ratio=0.58,
        exceptional_ratio=0.12,
        category_weights={
            "divers bazar": 24,
            "entretien": 22,
            "alimentation": 20,
            "hygiene et beaute": 10,
            "boissons": 10,
            "restauration": 14,
        },
    ),
    ProfileBlueprint(
        label="Sportive routine saine",
        pseudo_base="ines_sport",
        prenom="Ines",
        nom="Roussel",
        ville="Montpellier",
        code_postal="34000",
        budget_fixe=1750.0,
        abonnement="Premium",
        tickets_min=18,
        tickets_max=28,
        scan_ratio=0.76,
        exceptional_ratio=0.05,
        category_weights={
            "hygiene et beaute": 25,
            "alimentation": 25,
            "boissons": 16,
            "restauration": 14,
            "divers bazar": 10,
            "entretien": 10,
        },
    ),
]


def normalize_label(value: str) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.lower().replace("_", " ").replace("/", " ").replace("-", " ")
    return " ".join(normalized.split())


def build_category_lookup(db: Session) -> dict[str, str]:
    categories_db = db.execute(Categories.select()).mappings().all()
    if not categories_db:
        raise RuntimeError("Aucune categorie trouvee dans la DB. Lancez d'abord le script SQL de creation.")

    lookup = {}
    for category in categories_db:
        lookup[normalize_label(category["nom"])] = category["id"]
    return lookup


def resolve_profile_limit(num_users: int | None) -> list[ProfileBlueprint]:
    if not num_users:
        return PROFILE_BLUEPRINTS
    return PROFILE_BLUEPRINTS[: max(1, min(num_users, len(PROFILE_BLUEPRINTS)))]


def build_unique_login(db: Session, pseudo_base: str, email_base: str) -> tuple[str, str]:
    suffix = datetime.now().strftime("%Y%m%d%H%M%S")
    pseudo = f"{pseudo_base}_{suffix}"
    email = f"{email_base.split('@')[0]}_{suffix}@{email_base.split('@')[1]}"

    existing_pseudo = db.execute(Utilisateurs.select().where(Utilisateurs.c.pseudo == pseudo)).first()
    existing_email = db.execute(Utilisateurs.select().where(Utilisateurs.c.email == email)).first()
    if existing_pseudo or existing_email:
        extra = uuid.uuid4().hex[:6]
        pseudo = f"{pseudo}_{extra}"
        email = f"{email.split('@')[0]}_{extra}@{email.split('@')[1]}"

    return pseudo, email


def weighted_choice(weight_map: dict[str, int], available_keys: set[str]) -> str:
    filtered = [(key, weight) for key, weight in weight_map.items() if key in available_keys]
    if not filtered:
        return random.choice(sorted(available_keys))

    keys, weights = zip(*filtered)
    return random.choices(keys, weights=weights, k=1)[0]


def build_ticket_mix(primary_key: str, available_keys: set[str]) -> list[str]:
    mix = [primary_key]
    for secondary_key, chance in MIX_RULES.get(primary_key, ()):
        if secondary_key in available_keys and random.random() < chance:
            mix.append(secondary_key)
    return mix


def choose_merchant(primary_key: str, mix: list[str]) -> str:
    if len(mix) > 1 and primary_key in {"alimentation", "boissons", "entretien", "hygiene et beaute", "divers bazar"}:
        return random.choice(MULTI_CATEGORY_MERCHANTS)
    return random.choice(CATEGORY_CATALOG[primary_key]["merchants"])


def build_article_row(ticket_id, category_id, product: ProductTemplate) -> tuple[dict, float]:
    quantity = random.randint(product.qty_min, product.qty_max)
    unit_price = round(random.uniform(product.price_min, product.price_max), 2)
    line_total = round(unit_price * quantity, 2)
    return (
        {
            "id": uuid.uuid4(),
            "ticket_id": ticket_id,
            "nom": product.name,
            "prix": unit_price,
            "quantite": quantity,
            "categorie_id": category_id,
        },
        line_total,
    )


def determine_ticket_category(articles: list[dict]) -> str | None:
    totals_by_category = {}
    for article in articles:
        category_id = article["categorie_id"]
        totals_by_category[category_id] = totals_by_category.get(category_id, 0.0) + float(article["prix"]) * float(article["quantite"])

    if not totals_by_category:
        return None
    return max(totals_by_category.items(), key=lambda item: item[1])[0]


def build_ocr_text(merchant: str, ticket_date, articles: list[dict], total_amount: float) -> str:
    lines = [
        merchant.upper(),
        f"Date : {ticket_date.strftime('%d/%m/%Y')} - {random.randint(8, 21):02d}:{random.randint(0, 59):02d}",
        "Qte Designation Tot.TTC",
    ]

    # Keep the OCR mock short and structured so it looks like the parser input
    # the application normally receives from scanned receipts.
    for article in articles:
        quantity = int(article["quantite"])
        label = article["nom"][:24].upper()
        line_total = float(article["prix"]) * float(article["quantite"])
        lines.append(f"{quantity} {label:<24} {line_total:>6.2f}".replace(".", ","))

    lines.append(f"TOTAL TTC {total_amount:>7.2f} EUR".replace(".", ","))
    return "\n".join(lines)


def generate_ticket_rows(profile: ProfileBlueprint, user_id, ticket_date, category_lookup: dict[str, str]) -> tuple[dict, list[dict], bool]:
    available_keys = set(category_lookup.keys()) & set(CATEGORY_CATALOG.keys())
    primary_key = weighted_choice(profile.category_weights, available_keys)
    mix = build_ticket_mix(primary_key, available_keys)
    merchant = choose_merchant(primary_key, mix)
    ticket_id = uuid.uuid4()
    is_scan = random.random() < profile.scan_ratio
    is_exceptional = random.random() < profile.exceptional_ratio
    article_count = random.randint(2, 6 if len(mix) > 1 else 4)

    articles = []
    for index in range(article_count):
        if is_exceptional and index == 0:
            category_key = random.choice([key for key in mix if CATEGORY_CATALOG[key]["exceptional_products"]])
            product = random.choice(CATEGORY_CATALOG[category_key]["exceptional_products"])
        else:
            category_key = random.choices(mix, weights=[4 if key == primary_key else 1 for key in mix], k=1)[0]
            product = random.choice(CATEGORY_CATALOG[category_key]["products"])

        article_row, _ = build_article_row(ticket_id, category_lookup[category_key], product)
        articles.append(article_row)

    montant_total = round(sum(float(article["prix"]) * float(article["quantite"]) for article in articles), 2)
    ticket_category_id = determine_ticket_category(articles)

    ticket_data = {
        "id": ticket_id,
        "utilisateur_id": user_id,
        "nom_marchand": merchant,
        "montant_total": montant_total,
        "date_achat": ticket_date,
        "categorie_id": ticket_category_id,
        "statut": "en attente" if is_scan and random.random() < 0.10 else "valide",
    }

    # We simulate scanned tickets by attaching OCR fields; manual tickets keep those
    # columns empty so the backend still infers source_saisie correctly.
    if "est_exceptionnel" in ticket_columns:
        ticket_data["est_exceptionnel"] = is_exceptional
    if is_scan:
        if "confiance_ocr" in ticket_columns:
            ticket_data["confiance_ocr"] = round(random.uniform(76.0, 98.5), 2)
        if "url_image" in ticket_columns:
            ticket_data["url_image"] = f"/mock/scans/{profile.pseudo_base}/{ticket_id}.jpg"
        if "texte_brut_extrait" in ticket_columns:
            ticket_data["texte_brut_extrait"] = build_ocr_text(merchant, ticket_date, articles, montant_total)
    else:
        if "confiance_ocr" in ticket_columns:
            ticket_data["confiance_ocr"] = None
        if "url_image" in ticket_columns:
            ticket_data["url_image"] = None
        if "texte_brut_extrait" in ticket_columns:
            ticket_data["texte_brut_extrait"] = None

    return ticket_data, articles, is_scan


def generate_fake_data(num_users: int = 10):
    print("-> Generation de 10 profils budgetaires types avec tickets et scans simules...")
    db: Session = SessionLocal()

    try:
        category_lookup = build_category_lookup(db)
        available_keys = sorted(set(category_lookup.keys()) & set(CATEGORY_CATALOG.keys()))
        if not available_keys:
            raise RuntimeError("Aucune categorie de la base ne correspond au catalogue mock attendu.")

        missing_keys = sorted(set(CATEGORY_CATALOG.keys()) - set(category_lookup.keys()))
        if missing_keys:
            print(f"[!] Categories absentes de la DB, ignorees pendant la generation: {', '.join(missing_keys)}")

        from core.security import get_password_hash

        profiles = resolve_profile_limit(num_users)
        default_pwd = get_password_hash("password123")
        total_tickets = 0
        total_articles = 0
        total_scans = 0
        total_manuels = 0

        for profile in profiles:
            pseudo, email = build_unique_login(db, profile.pseudo_base, f"{profile.pseudo_base}@smarttick.demo")
            created_at = fake.date_time_between(start_date="-9M", end_date="-3M")
            user_id = uuid.uuid4()

            user_data = {
                "id": user_id,
                "pseudo": pseudo,
                "email": email,
                "mot_de_passe_hache": default_pwd,
                "prenom": profile.prenom,
                "nom": profile.nom,
                "ville": profile.ville,
                "code_postal": profile.code_postal,
                "budget_fixe": profile.budget_fixe,
                "abonnement": profile.abonnement,
                "est_admin": False,
                "cree_le": created_at,
                "mis_a_jour_le": created_at,
            }

            db.execute(Utilisateurs.insert().values(**user_data))

            user_tickets = random.randint(profile.tickets_min, profile.tickets_max)
            user_scan_count = 0
            user_manual_count = 0

            # Spread ticket dates over the recent months so dashboard filters and
            # historical analysis have meaningful temporal data to work with.
            for _ in range(user_tickets):
                ticket_date = fake.date_between(start_date=max(created_at.date(), datetime.now().date() - timedelta(days=160)), end_date="today")
                ticket_data, articles, is_scan = generate_ticket_rows(profile, user_id, ticket_date, category_lookup)

                db.execute(Tickets.insert().values(**ticket_data))
                db.execute(Articles.insert(), articles)

                total_tickets += 1
                total_articles += len(articles)
                if is_scan:
                    total_scans += 1
                    user_scan_count += 1
                else:
                    total_manuels += 1
                    user_manual_count += 1

            print(
                f"- Profil cree: {profile.label} | budget {profile.budget_fixe:.0f} EUR | "
                f"{user_tickets} tickets ({user_scan_count} scans, {user_manual_count} manuels)"
            )

        db.commit()
        print("[OK] Generation terminee.")
        print(
            f"-> Bilan: {len(profiles)} profils, {total_tickets} tickets, "
            f"{total_articles} articles, {total_scans} scans, {total_manuels} saisies manuelles."
        )
        print("[!] IMPORTANT: Tous les utilisateurs ont comme mot de passe : 'password123'")

    except Exception as exc:
        db.rollback()
        print(f"[X] Erreur lors de la generation: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generate_fake_data()
