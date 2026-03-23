from collections import defaultdict
import calendar
from datetime import datetime, timedelta
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from api.deps import get_current_user
from database import get_db

router = APIRouter(prefix="/data", tags=["Data & Dashboard"])


def _apply_ticket_period(query, start_date, end_date=None):
    query = query.filter(models.Ticket.date_achat >= start_date)
    if end_date is not None:
        query = query.filter(models.Ticket.date_achat < end_date)
    return query


def _collect_active_categories(user_id, start_date, db: Session, end_date=None):
    article_query = (
        db.query(models.Article.categorie_id)
        .join(models.Ticket, models.Article.ticket_id == models.Ticket.id)
        .filter(models.Ticket.utilisateur_id == user_id)
        .filter(models.Article.categorie_id.isnot(None))
    )
    article_query = _apply_ticket_period(article_query, start_date, end_date)

    ticket_query = (
        db.query(models.Ticket.categorie_id)
        .filter(models.Ticket.utilisateur_id == user_id)
        .filter(models.Ticket.categorie_id.isnot(None))
        .filter(~models.Ticket.articles.any())
    )
    ticket_query = _apply_ticket_period(ticket_query, start_date, end_date)

    article_ids = {category_id for (category_id,) in article_query.all() if category_id}
    ticket_ids = {category_id for (category_id,) in ticket_query.all() if category_id}

    return len(article_ids | ticket_ids)


def _build_category_breakdown(user_id, start_date, db: Session, end_date=None):
    article_query = (
        db.query(
            models.Category.id.label("category_id"),
            models.Category.nom.label("nom"),
            models.Category.code_couleur_hex.label("color"),
            models.Category.icone.label("icon"),
            func.sum(models.Article.prix * models.Article.quantite).label("total_amount"),
            func.count(func.distinct(models.Ticket.id)).label("tickets_count"),
        )
        .join(models.Article, models.Article.categorie_id == models.Category.id)
        .join(models.Ticket, models.Article.ticket_id == models.Ticket.id)
        .filter(models.Ticket.utilisateur_id == user_id)
    )
    article_query = _apply_ticket_period(article_query, start_date, end_date)
    article_rows = article_query.group_by(models.Category.id).all()

    ticket_query = (
        db.query(
            models.Category.id.label("category_id"),
            models.Category.nom.label("nom"),
            models.Category.code_couleur_hex.label("color"),
            models.Category.icone.label("icon"),
            func.sum(models.Ticket.montant_total).label("total_amount"),
            func.count(models.Ticket.id).label("tickets_count"),
        )
        .join(models.Ticket, models.Ticket.categorie_id == models.Category.id)
        .filter(models.Ticket.utilisateur_id == user_id)
        .filter(~models.Ticket.articles.any())
    )
    ticket_query = _apply_ticket_period(ticket_query, start_date, end_date)
    ticket_rows = ticket_query.group_by(models.Category.id).all()

    combined = {}
    for row in [*article_rows, *ticket_rows]:
        existing = combined.get(row.category_id)
        if existing is None:
            combined[row.category_id] = {
                "name": row.nom,
                "amount": float(row.total_amount or 0),
                "color": row.color,
                "icon": row.icon or "Box",
                "tickets": int(row.tickets_count or 0),
            }
        else:
            existing["amount"] += float(row.total_amount or 0)
            existing["tickets"] += int(row.tickets_count or 0)

    categorized_total = sum(item["amount"] for item in combined.values())
    formatted = []
    for item in combined.values():
        formatted.append(
            {
                **item,
                "pct": round((item["amount"] / categorized_total) * 100, 1) if categorized_total > 0 else 0,
            }
        )

    formatted.sort(key=lambda item: item["amount"], reverse=True)
    return formatted


def _normalize_articles(
    articles_in: List[schemas.ArticleCreate],
    require_articles: bool,
):
    normalized_articles = []
    total_amount = 0.0
    amount_by_category = defaultdict(float)

    for article_in in articles_in:
        nom_article = article_in.nom.strip()
        if not nom_article:
            raise HTTPException(status_code=400, detail="Chaque produit doit avoir un nom.")
        if article_in.prix < 0:
            raise HTTPException(status_code=400, detail="Le prix d'un produit doit etre positif.")
        if article_in.quantite <= 0:
            raise HTTPException(status_code=400, detail="La quantite doit etre strictement positive.")

        prix = float(article_in.prix)
        quantite = float(article_in.quantite)
        line_total = prix * quantite

        normalized_articles.append(
            {
                "nom": nom_article,
                "prix": prix,
                "quantite": quantite,
                "categorie_id": article_in.categorie_id,
            }
        )
        total_amount += line_total

        if article_in.categorie_id is not None:
            amount_by_category[article_in.categorie_id] += line_total

    if require_articles and not normalized_articles:
        raise HTTPException(status_code=400, detail="Ajoutez au moins un produit a la saisie manuelle.")

    dominant_category_id = None
    if amount_by_category:
        dominant_category_id = max(amount_by_category.items(), key=lambda item: item[1])[0]

    return normalized_articles, round(total_amount, 2), dominant_category_id


@router.get("/categories", response_model=List[schemas.CategorySchema])
def get_categories(db: Session = Depends(get_db)):
    """Return all available categories."""
    return db.query(models.Category).all()


@router.get("/dashboard-stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    period_months: int = Query(1, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return dashboard KPIs for the selected period."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    cutoff_date = datetime.now() - relativedelta(months=period_months)
    previous_cutoff_date = cutoff_date - relativedelta(months=period_months)

    base_query = _apply_ticket_period(
        db.query(models.Ticket).filter(models.Ticket.utilisateur_id == user.id),
        cutoff_date.date(),
    )
    prev_base_query = _apply_ticket_period(
        db.query(models.Ticket).filter(models.Ticket.utilisateur_id == user.id),
        previous_cutoff_date.date(),
        cutoff_date.date(),
    )

    total_spent = float(
        _apply_ticket_period(
            db.query(func.sum(models.Ticket.montant_total)).filter(models.Ticket.utilisateur_id == user.id),
            cutoff_date.date(),
        ).scalar()
        or 0.0
    )
    prev_total_spent = float(
        _apply_ticket_period(
            db.query(func.sum(models.Ticket.montant_total)).filter(models.Ticket.utilisateur_id == user.id),
            previous_cutoff_date.date(),
            cutoff_date.date(),
        ).scalar()
        or 0.0
    )

    total_tickets = base_query.count()
    prev_total_tickets = prev_base_query.count()

    active_categories = _collect_active_categories(user.id, cutoff_date.date(), db)
    prev_active_categories = _collect_active_categories(
        user.id,
        previous_cutoff_date.date(),
        db,
        cutoff_date.date(),
    )

    trend_depenses = (
        ((total_spent - prev_total_spent) / prev_total_spent * 100)
        if prev_total_spent > 0
        else (100.0 if total_spent > 0 else 0.0)
    )
    trend_tickets = (
        ((total_tickets - prev_total_tickets) / prev_total_tickets * 100)
        if prev_total_tickets > 0
        else (100.0 if total_tickets > 0 else 0.0)
    )
    trend_categories = (
        ((active_categories - prev_active_categories) / prev_active_categories * 100)
        if prev_active_categories > 0
        else (100.0 if active_categories > 0 else 0.0)
    )

    budget_fixe = float(user.budget_fixe or 1500.0)
    budget_fixe_periode = budget_fixe * period_months

    # We expose the remaining budget because it is directly actionable for the user:
    # how much room is left before the selected period budget is exhausted.
    budget_restant = float(budget_fixe_periode - total_spent)
    pct_budget_restant = float((budget_restant / budget_fixe_periode) * 100) if budget_fixe_periode > 0 else 0.0

    today = datetime.now().date()
    current_month_start = today.replace(day=1)
    tomorrow = today + timedelta(days=1)
    current_month_days = calendar.monthrange(today.year, today.month)[1]
    current_month_spent_for_projection = float(
        _apply_ticket_period(
            db.query(func.sum(models.Ticket.montant_total))
            .filter(models.Ticket.utilisateur_id == user.id)
            .filter(models.Ticket.est_exceptionnel.isnot(True)),
            current_month_start,
            tomorrow,
        ).scalar()
        or 0.0
    )
    # The month-end forecast always targets the current calendar month and ignores
    # exceptional purchases so one-off expenses do not distort the day-to-day trend.
    projection_fin_mois = float((current_month_spent_for_projection / today.day) * current_month_days) if today.day > 0 else 0.0
    pct_marge_projection = float(((budget_fixe - projection_fin_mois) / budget_fixe) * 100) if budget_fixe > 0 else 0.0

    depassement = 0.0
    pct_depassement = 0.0
    if total_spent > budget_fixe_periode:
        depassement = float(total_spent - budget_fixe_periode)
        pct_depassement = float((depassement / budget_fixe_periode) * 100)

    return {
        "total_depenses": float(total_spent),
        "total_tickets": total_tickets,
        "categories_actives": active_categories,
        "trend_depenses": round(trend_depenses, 1),
        "trend_tickets": round(trend_tickets, 1),
        "trend_categories": round(trend_categories, 1),
        "budget_fixe": budget_fixe,
        "budget_restant": round(budget_restant, 2),
        "pct_budget_restant": round(pct_budget_restant, 1),
        "projection_fin_mois": round(projection_fin_mois, 2),
        "pct_marge_projection": round(pct_marge_projection, 1),
        "depassement_budget": depassement,
        "pct_depassement": round(pct_depassement, 1),
    }


@router.get("/tickets", response_model=List[schemas.TicketSchema])
def get_tickets(
    period_months: Optional[int] = Query(None, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the user's tickets ordered by most recent first."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    query = db.query(models.Ticket).filter(models.Ticket.utilisateur_id == user.id)

    if period_months:
        cutoff_date = datetime.now() - relativedelta(months=period_months)
        query = _apply_ticket_period(query, cutoff_date.date())

    return query.order_by(models.Ticket.date_achat.desc()).all()


@router.post("/tickets", response_model=schemas.TicketSchema, status_code=201)
def create_ticket(
    ticket_in: schemas.TicketCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a ticket from a scan or from a manual entry."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    nom_marchand = ticket_in.nom_marchand.strip()
    if not nom_marchand:
        raise HTTPException(status_code=400, detail="Le nom du marchand est obligatoire.")

    normalized_articles, articles_total, dominant_category_id = _normalize_articles(
        ticket_in.articles,
        require_articles=ticket_in.source_saisie == "manuel",
    )

    montant_total = float(ticket_in.montant_total or 0)
    if ticket_in.source_saisie == "manuel":
        montant_total = articles_total
    else:
        if montant_total < 0:
            raise HTTPException(status_code=400, detail="Le montant total doit etre positif.")
        if montant_total == 0 and articles_total > 0:
            montant_total = articles_total
        elif ticket_in.montant_total is None and articles_total <= 0:
            raise HTTPException(status_code=400, detail="Le montant total est obligatoire.")

    confiance_ocr = ticket_in.confiance_ocr if ticket_in.source_saisie == "scan" else None
    texte_brut_extrait = (ticket_in.texte_brut_extrait or "").strip() or None
    categorie_id = ticket_in.categorie_id or dominant_category_id

    new_ticket = models.Ticket(
        utilisateur_id=user.id,
        nom_marchand=nom_marchand,
        montant_total=montant_total,
        date_achat=ticket_in.date_achat,
        categorie_id=categorie_id,
        est_exceptionnel=ticket_in.est_exceptionnel,
        statut="valide",
        confiance_ocr=confiance_ocr,
        texte_brut_extrait=texte_brut_extrait,
    )
    db.add(new_ticket)
    db.flush()

    for article in normalized_articles:
        db.add(
            models.Article(
                ticket_id=new_ticket.id,
                nom=article["nom"],
                prix=article["prix"],
                quantite=article["quantite"],
                categorie_id=article["categorie_id"],
            )
        )

    db.commit()
    db.refresh(new_ticket)
    return new_ticket


@router.put("/tickets/{ticket_id}", response_model=schemas.TicketSchema)
def update_ticket(
    ticket_id: str,
    ticket_update: schemas.TicketUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a ticket owned by the current user."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    ticket = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.id == ticket_id,
            models.Ticket.utilisateur_id == user.id,
        )
        .first()
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable.")

    if ticket_update.nom_marchand is not None:
        nom_marchand = ticket_update.nom_marchand.strip()
        if not nom_marchand:
            raise HTTPException(status_code=400, detail="Le nom du marchand est obligatoire.")
        ticket.nom_marchand = nom_marchand
    if ticket_update.montant_total is not None:
        if ticket_update.montant_total < 0:
            raise HTTPException(status_code=400, detail="Le montant total doit etre positif.")
        ticket.montant_total = ticket_update.montant_total
    if ticket_update.date_achat is not None:
        ticket.date_achat = ticket_update.date_achat
    if ticket_update.categorie_id is not None:
        ticket.categorie_id = ticket_update.categorie_id
    if ticket_update.est_exceptionnel is not None:
        ticket.est_exceptionnel = ticket_update.est_exceptionnel
    if ticket_update.texte_brut_extrait is not None:
        ticket.texte_brut_extrait = ticket_update.texte_brut_extrait.strip() or None

    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/tickets/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a ticket owned by the current user."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    ticket = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.id == ticket_id,
            models.Ticket.utilisateur_id == user.id,
        )
        .first()
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable.")

    db.delete(ticket)
    db.commit()
    return None


@router.get("/analytics")
def get_analytics(
    period_months: int = Query(12, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return aggregated analytics for charts and category splits."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    cutoff_date = datetime.now() - relativedelta(months=period_months)

    categories = _build_category_breakdown(user.id, cutoff_date.date(), db)

    total_depenses = float(
        _apply_ticket_period(
            db.query(func.sum(models.Ticket.montant_total)).filter(models.Ticket.utilisateur_id == user.id),
            cutoff_date.date(),
        ).scalar()
        or 0.0
    )

    monthly_stats = (
        _apply_ticket_period(
            db.query(
                func.to_char(models.Ticket.date_achat, "YYYY-MM").label("month"),
                func.sum(models.Ticket.montant_total).label("total"),
            ).filter(models.Ticket.utilisateur_id == user.id),
            cutoff_date.date(),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    formatted_monthly = {stat.month: float(stat.total) for stat in monthly_stats}

    return {
        "categories": categories,
        "monthly_totals": formatted_monthly,
        "total_depenses": total_depenses,
    }
