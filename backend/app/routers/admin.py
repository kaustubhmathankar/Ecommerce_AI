from decimal import Decimal

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
from app.models.order import (
    Order,
    OrderItem,
)
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


@router.get("/overview")
def get_admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Return the data required by the
    admin dashboard.

    No chart query is used here.
    Dashboard analytics are based on
    database aggregate queries and small
    recent-result queries.
    """

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

    recent_orders = (
        db.query(Order)
        .order_by(
            Order.created_at.desc(),
            Order.id.desc(),
        )
        .limit(8)
        .all()
    )

    revenue_filter = ~Order.status.in_(REVENUE_EXCLUDED_STATUSES)

    total_revenue = db.query(
        func.coalesce(
            func.sum(Order.total_amount),
            0,
        )
    ).filter(
        revenue_filter
    ).scalar() or Decimal("0")

    pending_orders = (
        db.query(Order).filter(Order.status.in_(PENDING_ORDER_STATUSES)).count()
    )

    delivered_orders = db.query(Order).filter(Order.status == "delivered").count()

    cancelled_orders = db.query(Order).filter(Order.status == "cancelled").count()

    return_requests = (
        db.query(Order).filter(Order.status.in_(RETURN_REQUEST_STATUSES)).count()
    )

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

    total_orders = db.query(Order).count()

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
            "today_revenue": 0.0,
            "month_revenue": float(total_revenue),
            "previous_month_revenue": 0.0,
            "revenue_change_percent": 0.0,
        },
        "orders": {
            "total": total_orders,
            "today": 0,
            "pending": pending_orders,
            "delivered": delivered_orders,
            "cancelled": cancelled_orders,
            "return_requests": return_requests,
        },
        "customers": {
            "total": total_customers,
            "active": active_customers,
            "new_this_month": 0,
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
                "stock_quantity": (product.stock_quantity),
                "is_featured": (product.is_featured),
            }
            for product in recent_products
        ],
        "recent_orders": [
            {
                "id": order.id,
                "full_name": (order.full_name),
                "total_amount": float(order.total_amount),
                "status": order.status,
                "created_at": (order.created_at),
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
            detail=("You cannot deactivate your " "own admin account."),
        )

    user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    return {
        "message": ("User status updated successfully."),
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
            detail=("Role must be either " "'customer' or 'admin'."),
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
            detail=("You cannot remove your own " "admin privileges."),
        )

    user.role = normalized_role

    db.commit()
    db.refresh(user)

    return {
        "message": ("User role updated successfully."),
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
        },
    }
