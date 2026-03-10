from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
from dateutil.relativedelta import relativedelta

import models
import schemas
from database import get_db
from api.deps import get_current_user

router = APIRouter(prefix="/data", tags=["Data & Dashboard"])

@router.get("/categories", response_model=List[schemas.CategorySchema])
def get_categories(db: Session = Depends(get_db)):
    """
    Returns all available categories.
    """
    return db.query(models.Category).all()

@router.get("/dashboard-stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    period_months: int = Query(1, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Returns KPIs for the dashboard based on the selected period.
    """
    # Re-fetch user from this route's own db session to avoid SQLAlchemy detachment
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    cutoff_date = datetime.now() - relativedelta(months=period_months)
    previous_cutoff_date = cutoff_date - relativedelta(months=period_months)
    
    # Base query for user's tickets within the current period
    base_query = db.query(models.Ticket).filter(
        models.Ticket.utilisateur_id == user.id,
        models.Ticket.date_achat >= cutoff_date.date()
    )

    # Base query for user's tickets within the previous period
    prev_base_query = db.query(models.Ticket).filter(
        models.Ticket.utilisateur_id == user.id,
        models.Ticket.date_achat >= previous_cutoff_date.date(),
        models.Ticket.date_achat < cutoff_date.date()
    )

    # 1. Total spent (current)
    total_spent = float(db.query(func.sum(models.Ticket.montant_total)).filter(
        models.Ticket.utilisateur_id == user.id,
        models.Ticket.date_achat >= cutoff_date.date()
    ).scalar() or 0.0)

    # 1b. Total spent (previous)
    prev_total_spent = float(db.query(func.sum(models.Ticket.montant_total)).filter(
        models.Ticket.utilisateur_id == user.id,
        models.Ticket.date_achat >= previous_cutoff_date.date(),
        models.Ticket.date_achat < cutoff_date.date()
    ).scalar() or 0.0)

    # 2. Total tickets count (current)
    total_tickets = base_query.count()

    # 2b. Total tickets count (previous)
    prev_total_tickets = prev_base_query.count()

    # 3. Active categories (current)
    active_categories = db.query(func.count(func.distinct(models.Ticket.categorie_id))).filter(
        models.Ticket.utilisateur_id == user.id,
        models.Ticket.date_achat >= cutoff_date.date()
    ).scalar() or 0

    # 3b. Active categories (previous)
    prev_active_categories = db.query(func.count(func.distinct(models.Ticket.categorie_id))).filter(
        models.Ticket.utilisateur_id == user.id,
        models.Ticket.date_achat >= previous_cutoff_date.date(),
        models.Ticket.date_achat < cutoff_date.date()
    ).scalar() or 0

    # Calculate trends (%)
    trend_depenses = ((total_spent - prev_total_spent) / prev_total_spent * 100) if prev_total_spent > 0 else (100.0 if total_spent > 0 else 0.0)
    trend_tickets = ((total_tickets - prev_total_tickets) / prev_total_tickets * 100) if prev_total_tickets > 0 else (100.0 if total_tickets > 0 else 0.0)
    trend_categories = ((active_categories - prev_active_categories) / prev_active_categories * 100) if prev_active_categories > 0 else (100.0 if active_categories > 0 else 0.0)

    # BUDGET RÉEL de l'utilisateur (depuis la base de données)
    budget_fixe = float(user.budget_fixe or 1500.0)
    # Scale budget to the full period analyzed
    budget_fixe_periode = budget_fixe * period_months
    
    depassement = 0.0
    pct_depassement = 0.0
    if total_spent > budget_fixe_periode:
        depassement = float(total_spent - budget_fixe_periode)
        pct_depassement = float((depassement / budget_fixe_periode) * 100)

    # Comparaison : économises vs période précédente
    economie_comparaison = float(prev_total_spent - total_spent)

    return {
        "total_depenses": float(total_spent),
        "total_tickets": total_tickets,
        "categories_actives": active_categories,
        "trend_depenses": round(trend_depenses, 1),
        "trend_tickets": round(trend_tickets, 1),
        "trend_categories": round(trend_categories, 1),
        "budget_fixe": budget_fixe,  # Monthly budget (not scaled) for the reference line
        "depassement_budget": depassement,
        "pct_depassement": round(pct_depassement, 1),
        "economie_comparaison": economie_comparaison
    }

@router.get("/tickets", response_model=List[schemas.TicketSchema])
def get_tickets(
    period_months: int = Query(None, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Returns the user's tickets, ordered by date descending.
    """
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    query = db.query(models.Ticket).filter(models.Ticket.utilisateur_id == user.id)
    
    if period_months:
        cutoff_date = datetime.now() - relativedelta(months=period_months)
        query = query.filter(models.Ticket.date_achat >= cutoff_date.date())

    return query.order_by(models.Ticket.date_achat.desc()).all()


@router.post("/tickets", response_model=schemas.TicketSchema, status_code=201)
def create_ticket(
    ticket_in: schemas.TicketCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually create a new ticket.
    """
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    new_ticket = models.Ticket(
        utilisateur_id=user.id,
        nom_marchand=ticket_in.nom_marchand,
        montant_total=ticket_in.montant_total,
        date_achat=ticket_in.date_achat,
        categorie_id=ticket_in.categorie_id,
        statut="validé", # manually added tickets are implicitly validated
        confiance_ocr=100.0 # manual = 100% confidence
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket


@router.put("/tickets/{ticket_id}", response_model=schemas.TicketSchema)
def update_ticket(
    ticket_id: str,
    ticket_update: schemas.TicketUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing ticket (Only if it belongs to the current user).
    """
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.utilisateur_id == user.id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable.")

    if ticket_update.nom_marchand is not None:
        ticket.nom_marchand = ticket_update.nom_marchand
    if ticket_update.montant_total is not None:
        ticket.montant_total = ticket_update.montant_total
    if ticket_update.date_achat is not None:
        ticket.date_achat = ticket_update.date_achat
    if ticket_update.categorie_id is not None:
        ticket.categorie_id = ticket_update.categorie_id

    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/tickets/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a ticket (Only if it belongs to the current user).
    """
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.utilisateur_id == user.id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable.")

    db.delete(ticket)
    db.commit()
    return None


@router.get("/analytics")
def get_analytics(
    period_months: int = Query(12, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Returns aggregated analytics for the charts (Categories & Monthly Evolution)
    """
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    cutoff_date = datetime.now() - relativedelta(months=period_months)
    
    # 1. Categories Aggregation
    categories_stats = db.query(
        models.Category.nom,
        models.Category.code_couleur_hex,
        models.Category.icone,
        func.sum(models.Ticket.montant_total).label("total_amount"),
        func.count(models.Ticket.id).label("tickets_count")
    ).join(models.Ticket, models.Ticket.categorie_id == models.Category.id)\
     .filter(models.Ticket.utilisateur_id == user.id)\
     .filter(models.Ticket.date_achat >= cutoff_date.date())\
     .group_by(models.Category.id).all()
     
    total_depenses = sum(cat.total_amount for cat in categories_stats) if categories_stats else 1.0 # avoid div/0
     
    formatted_categories = []
    for cat in categories_stats:
        formatted_categories.append({
            "name": cat.nom,
            "amount": float(cat.total_amount),
            "pct": round((float(cat.total_amount) / float(total_depenses)) * 100, 1) if total_depenses > 1 else 0,
            "color": cat.code_couleur_hex,
            "icon": cat.icone or "📦",
            "tickets": cat.tickets_count
        })
        
    # Sort categories by highest amount
    formatted_categories.sort(key=lambda x: x["amount"], reverse=True)

    # 2. Monthly Aggregation (for Sparkline and bar charts)
    monthly_stats = db.query(
        func.to_char(models.Ticket.date_achat, 'YYYY-MM').label("month"),
        func.sum(models.Ticket.montant_total).label("total")
    ).filter(models.Ticket.utilisateur_id == user.id)\
     .filter(models.Ticket.date_achat >= cutoff_date.date())\
     .group_by("month").order_by("month").all()
     
    formatted_monthly = {stat.month: float(stat.total) for stat in monthly_stats}

    return {
        "categories": formatted_categories,
        "monthly_totals": formatted_monthly,
        "total_depenses": float(total_depenses) if total_depenses > 1 else 0
    }

