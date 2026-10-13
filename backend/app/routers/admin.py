from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database.session import get_db
from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.user import (
    UserPublic,
    UserRoleUpdate,
    UserStatusUpdate,
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)

BUSINESS_TIMEZONE = ZoneInfo("Asia/Kolkata")

REVENUE_EXCLUDED_STATUSES = {
    "cancelled",
    "returned",
    "refunded",
}

PENDING_ORDER_STATUSES = {
    "placed",
    "processing",
    "shipped",
}

RETURN_REQUEST_STATUSES = {
    "return_requested",
    "return_approved",
}


def _get_period_boundaries(
    db: Session,
    start_local: datetime,
    end_local: datetime,
) -> tuple[datetime, datetime]:
    """
    Convert local business-time boundaries to database boundaries.

    PostgreSQL stores timezone-aware timestamps correctly, so UTC-aware
    datetime values are used there.

    SQLite's DateTime(timezone=True) columns are stored without timezone
    information. For SQLite, use naive UTC boundaries because SQLAlchemy's
    standard SQLite DateTime representation strips timezone information.
    """
    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)

    dialect_name = db.get_bind().dialect.name

    if dialect_name == "sqlite":
        return (
            start_utc.replace(tzinfo=None),
            end_utc.replace(tzinfo=None),
        )

    return start_utc, end_utc


def _sum_qualifying_revenue(
    db: Session,
    start: datetime | None = None,
    end: datetime | None = None,
) -> Decimal:
    """
    Calculate order-total revenue for qualifying order statuses.

    Excludes cancelled, returned and refunded orders.
    This is an order-based revenue estimate, not a reconciliation
    of captured payments or a calculation of profit.
    """
    query = db.query(
        func.coalesce(
            func.sum(Order.total_amount),
            0,
        )
    ).filter(~Order.status.in_(REVENUE_EXCLUDED_STATUSES))

    if start is not None:
        query = query.filter(Order.created_at >= start)

    if end is not None:
        query = query.filter(Order.created_at < end)

    return Decimal(str(query.scalar() or 0))


def _get_dashboard_periods(
    db: Session,
) -> dict[str, tuple[datetime, datetime]]:
    """
    Generate today's, current month's, and previous month's boundaries
    in the Indian business timezone, then adapt them to the database.
    """
    now = datetime.now(BUSINESS_TIMEZONE)
    today = now.date()

    today_start_local = datetime.combine(
        today,
        time.min,
        tzinfo=BUSINESS_TIMEZONE,
    )

    tomorrow_start_local = today_start_local + timedelta(days=1)

    current_month_start_local = datetime.combine(
        date(today.year, today.month, 1),
        time.min,
        tzinfo=BUSINESS_TIMEZONE,
    )

    if today.month == 12:
        next_month_start_local = datetime.combine(
            date(today.year + 1, 1, 1),
            time.min,
            tzinfo=BUSINESS_TIMEZONE,
        )
    else:
        next_month_start_local = datetime.combine(
            date(today.year, today.month + 1, 1),
            time.min,
            tzinfo=BUSINESS_TIMEZONE,
        )

    previous_month_end_local = current_month_start_local

    previous_month_last_day = current_month_start_local.date() - timedelta(days=1)

    previous_month_start_local = datetime.combine(
        date(
            previous_month_last_day.year,
            previous_month_last_day.month,
            1,
        ),
        time.min,
        tzinfo=BUSINESS_TIMEZONE,
    )

    return {
        "today": _get_period_boundaries(
            db,
            today_start_local,
            tomorrow_start_local,
        ),
        "current_month": _get_period_boundaries(
            db,
            current_month_start_local,
            next_month_start_local,
        ),
        "previous_month": _get_period_boundaries(
            db,
            previous_month_start_local,
            previous_month_end_local,
        ),
    }


@router.get("/overview")
def get_admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Return live database-backed metrics for the admin dashboard.

    Today's metrics use Asia/Kolkata calendar boundaries.
    Monthly customer counts are based on User.created_at.
    Revenue excludes cancelled, returned and refunded orders.
    """

    # --------------------------------------------------------
    # PERIOD BOUNDARIES
    # --------------------------------------------------------

    periods = _get_dashboard_periods(db)

    today_start, today_end = periods["today"]

    month_start, month_end = periods["current_month"]

    previous_month_start, previous_month_end = periods["previous_month"]

    # --------------------------------------------------------
    # TOTALS
    # --------------------------------------------------------

    total_products = db.query(Product).filter(Product.is_active.is_(True)).count()

    total_categories = db.query(Category).filter(Category.is_active.is_(True)).count()

    total_users = db.query(User).count()

    total_customers = db.query(User).filter(User.role == "customer").count()

    active_customers = (
        db.query(User)
        .filter(
            User.role == "customer",
            User.is_active.is_(True),
        )
        .count()
    )

    total_admins = (
        db.query(User)
        .filter(
            User.role == "admin",
            User.is_active.is_(True),
        )
        .count()
    )

    # --------------------------------------------------------
    # DATE-BASED ORDER COUNTS
    # --------------------------------------------------------

    # Count all orders created during today's local calendar day.
    # Do not filter by status: an order created today may already
    # have moved from "placed" to "processing" or "shipped".
    today_orders = (
        db.query(Order)
        .filter(
            Order.created_at >= today_start,
            Order.created_at < today_end,
        )
        .count()
    )

    # --------------------------------------------------------
    # CUSTOMER REGISTRATIONS
    # --------------------------------------------------------

    # Count customer accounts registered during the current
    # Indian calendar month.
    new_customers_this_month = (
        db.query(User)
        .filter(
            User.role == "customer",
            User.created_at >= month_start,
            User.created_at < month_end,
        )
        .count()
    )

    # --------------------------------------------------------
    # REVENUE
    # --------------------------------------------------------

    total_revenue = _sum_qualifying_revenue(db)

    today_revenue = _sum_qualifying_revenue(
        db,
        today_start,
        today_end,
    )

    month_revenue = _sum_qualifying_revenue(
        db,
        month_start,
        month_end,
    )

    previous_month_revenue = _sum_qualifying_revenue(
        db,
        previous_month_start,
        previous_month_end,
    )

    if previous_month_revenue > 0:
        revenue_change_percent = float(
            ((month_revenue - previous_month_revenue) / previous_month_revenue)
            * Decimal("100")
        )
    else:
        # Growth against a zero-revenue previous month is undefined.
        # Report 0 until a meaningful previous-period baseline exists.
        revenue_change_percent = 0.0

    # --------------------------------------------------------
    # ORDER STATUS COUNTS
    # --------------------------------------------------------

    total_orders = db.query(Order).count()

    pending_orders = (
        db.query(Order).filter(Order.status.in_(PENDING_ORDER_STATUSES)).count()
    )

    delivered_orders = db.query(Order).filter(Order.status == "delivered").count()

    cancelled_orders = db.query(Order).filter(Order.status == "cancelled").count()

    return_requests = (
        db.query(Order).filter(Order.status.in_(RETURN_REQUEST_STATUSES)).count()
    )

    # --------------------------------------------------------
    # INVENTORY
    # --------------------------------------------------------

    low_stock_products = (
        db.query(Product)
        .filter(
            Product.is_active.is_(True),
            Product.stock_quantity > 0,
            Product.stock_quantity <= 5,
        )
        .count()
    )

    out_of_stock_products = (
        db.query(Product)
        .filter(
            Product.is_active.is_(True),
            Product.stock_quantity <= 0,
        )
        .count()
    )

    # --------------------------------------------------------
    # RECENT PRODUCTS
    # --------------------------------------------------------

    recent_products = (
        db.query(Product)
        .filter(Product.is_active.is_(True))
        .order_by(
            Product.created_at.desc(),
            Product.id.desc(),
        )
        .limit(5)
        .all()
    )

    # --------------------------------------------------------
    # RECENT ORDERS
    # --------------------------------------------------------

    recent_orders = (
        db.query(Order)
        .order_by(
            Order.created_at.desc(),
            Order.id.desc(),
        )
        .limit(8)
        .all()
    )

    # --------------------------------------------------------
    # TOP PRODUCTS
    # --------------------------------------------------------

    revenue_filter = ~Order.status.in_(REVENUE_EXCLUDED_STATUSES)

    top_product_rows = (
        db.query(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.line_total).label("revenue"),
        )
        .join(
            Order,
            Order.id == OrderItem.order_id,
        )
        .filter(revenue_filter)
        .group_by(
            OrderItem.product_id,
            OrderItem.product_name,
        )
        .order_by(
            func.sum(OrderItem.quantity).desc(),
            func.sum(OrderItem.line_total).desc(),
        )
        .limit(5)
        .all()
    )

    # --------------------------------------------------------
    # TOP CATEGORIES
    # --------------------------------------------------------

    top_category_rows = (
        db.query(
            Category.id,
            Category.name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.line_total).label("revenue"),
        )
        .join(
            Product,
            Product.category_id == Category.id,
        )
        .join(
            OrderItem,
            OrderItem.product_id == Product.id,
        )
        .join(
            Order,
            Order.id == OrderItem.order_id,
        )
        .filter(revenue_filter)
        .group_by(
            Category.id,
            Category.name,
        )
        .order_by(
            func.sum(OrderItem.quantity).desc(),
            func.sum(OrderItem.line_total).desc(),
        )
        .limit(5)
        .all()
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
        },
        "totals": {
            "products": total_products,
            "categories": total_categories,
            "users": total_users,
            "admins": total_admins,
        },
        "sales": {
            "total_revenue": float(total_revenue),
            "today_revenue": float(today_revenue),
            "month_revenue": float(month_revenue),
            "previous_month_revenue": float(previous_month_revenue),
            "revenue_change_percent": round(
                revenue_change_percent,
                2,
            ),
        },
        "orders": {
            "total": total_orders,
            "today": today_orders,
            "pending": pending_orders,
            "delivered": delivered_orders,
            "cancelled": cancelled_orders,
            "return_requests": return_requests,
        },
        "customers": {
            "total": total_customers,
            "active": active_customers,
            "new_this_month": new_customers_this_month,
        },
        "inventory": {
            "active_products": total_products,
            "low_stock": low_stock_products,
            "out_of_stock": out_of_stock_products,
        },
        "recent_products": [
            {
                "id": product.id,
                "name": product.name,
                "price": float(product.price),
                "stock_quantity": product.stock_quantity,
                "is_featured": product.is_featured,
            }
            for product in recent_products
        ],
        "recent_orders": [
            {
                "id": order.id,
                "full_name": order.full_name,
                "total_amount": float(order.total_amount),
                "status": order.status,
                "created_at": order.created_at,
            }
            for order in recent_orders
        ],
        "top_products": [
            {
                "id": row.product_id,
                "name": row.product_name,
                "units_sold": int(row.units_sold or 0),
                "revenue": float(row.revenue or 0),
            }
            for row in top_product_rows
        ],
        "top_categories": [
            {
                "id": row.id,
                "name": row.name,
                "units_sold": int(row.units_sold or 0),
                "revenue": float(row.revenue or 0),
            }
            for row in top_category_rows
        ],
    }


@router.get(
    "/users",
    response_model=list[UserPublic],
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    del current_user

    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.id == current_user.id and payload.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own admin account.",
        )

    user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    return {
        "message": "User status updated successfully.",
        "user": {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
        },
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    normalized_role = payload.role.strip().lower()

    if normalized_role not in {
        "customer",
        "admin",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'customer' or 'admin'.",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.id == current_user.id and normalized_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin privileges.",
        )

    user.role = normalized_role

    db.commit()
    db.refresh(user)

    return {
        "message": "User role updated successfully.",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
        },
    }
