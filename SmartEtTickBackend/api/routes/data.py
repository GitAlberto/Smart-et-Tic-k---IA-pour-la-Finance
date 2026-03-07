from fastapi import APIRouter, Depends, Query
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

@router.get("/dashboard-stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    period_months: int = Query(1, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Returns KPIs for the dashboard based on the selected period.
    """
    cutoff_date = datetime.now() - relativedelta(months=period_months)
    previous_cutoff_date = cutoff_date - relativedelta(months=period_months)
    
    # Base query for user's tickets within the current period
    base_query = db.query(models.Ticket).filter(
        models.Ticket.utilisateur_id == current_user.id,
        models.Ticket.date_achat >= cutoff_date.date()
    )

    # Base query for user's tickets within the previous period
    prev_base_query = db.query(models.Ticket).filter(
        models.Ticket.utilisateur_id == current_user.id,
        models.Ticket.date_achat >= previous_cutoff_date.date(),
        models.Ticket.date_achat < cutoff_date.date()
    )

    # 1. Total spent (current)
    total_spent = db.query(func.sum(models.Ticket.montant_total)).filter(
        models.Ticket.utilisateur_id == current_user.id,
        models.Ticket.date_achat >= cutoff_date.date()
    ).scalar() or 0.0

    # 1b. Total spent (previous)
    prev_total_spent = db.query(func.sum(models.Ticket.montant_total)).filter(
        models.Ticket.utilisateur_id == current_user.id,
        models.Ticket.date_achat >= previous_cutoff_date.date(),
        models.Ticket.date_achat < cutoff_date.date()
    ).scalar() or 0.0

    # 2. Total tickets count (current)
    total_tickets = base_query.count()

    # 2b. Total tickets count (previous)
    prev_total_tickets = prev_base_query.count()

    # 3. Active categories (current)
    active_categories = db.query(func.count(func.distinct(models.Ticket.categorie_id))).filter(
        models.Ticket.utilisateur_id == current_user.id,
        models.Ticket.date_achat >= cutoff_date.date()
    ).scalar() or 0

    # 3b. Active categories (previous)
    prev_active_categories = db.query(func.count(func.distinct(models.Ticket.categorie_id))).filter(
        models.Ticket.utilisateur_id == current_user.id,
        models.Ticket.date_achat >= previous_cutoff_date.date(),
        models.Ticket.date_achat < cutoff_date.date()
    ).scalar() or 0

    # Calculate trends (%)
    trend_depenses = ((total_spent - prev_total_spent) / prev_total_spent * 100) if prev_total_spent > 0 else (100.0 if total_spent > 0 else 0.0)
    trend_tickets = ((total_tickets - prev_total_tickets) / prev_total_tickets * 100) if prev_total_tickets > 0 else (100.0 if total_tickets > 0 else 0.0)
    trend_categories = ((active_categories - prev_active_categories) / prev_active_categories * 100) if prev_active_categories > 0 else (100.0 if active_categories > 0 else 0.0)

    return {
        "total_depenses": float(total_spent),
        "total_tickets": total_tickets,
        "categories_actives": active_categories,
        "trend_depenses": round(trend_depenses, 1),
        "trend_tickets": round(trend_tickets, 1),
        "trend_categories": round(trend_categories, 1)
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
    query = db.query(models.Ticket).filter(models.Ticket.utilisateur_id == current_user.id)
    
    if period_months:
        cutoff_date = datetime.now() - relativedelta(months=period_months)
        query = query.filter(models.Ticket.date_achat >= cutoff_date.date())
@router.get("/analytics")
def get_analytics(
    period_months: int = Query(12, description="Number of months to analyze"),
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Returns aggregated analytics for the charts (Categories & Monthly Evolution)
    """
    cutoff_date = datetime.now() - relativedelta(months=period_months)
    
    # 1. Categories Aggregation
    categories_stats = db.query(
        models.Category.nom,
        models.Category.code_couleur_hex,
        models.Category.icone,
        func.sum(models.Ticket.montant_total).label("total_amount"),
        func.count(models.Ticket.id).label("tickets_count")
    ).join(models.Ticket, models.Ticket.categorie_id == models.Category.id)\
     .filter(models.Ticket.utilisateur_id == current_user.id)\
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
    ).filter(models.Ticket.utilisateur_id == current_user.id)\
     .filter(models.Ticket.date_achat >= cutoff_date.date())\
     .group_by("month").order_by("month").all()
     
    formatted_monthly = {stat.month: float(stat.total) for stat in monthly_stats}

    return {
        "categories": formatted_categories,
        "monthly_totals": formatted_monthly,
        "total_depenses": float(total_depenses) if total_depenses > 1 else 0
    }

