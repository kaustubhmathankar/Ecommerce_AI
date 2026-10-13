"""Read-only, database-backed analytics for the ShopSphere admin AI analyst.

Every method intentionally uses SQLAlchemy ORM/aggregate queries. No method can
write data or execute model-generated SQL.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.payment import PaymentAttempt
from app.models.product import Product
from app.models.refund import Refund
from app.models.review import Review
from app.models.user import User

REVENUE_EXCLUDED_STATUSES = {"cancelled", "returned", "refunded"}
RETURN_STATUSES = {
    "return_requested",
    "return_approved",
    "return_rejected",
    "returned",
    "refunded",
}


def _number(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return round(float(value), 2)
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def _period(start_date: str | None, end_date: str | None) -> tuple[date, date, datetime, datetime]:
    today = datetime.now(timezone.utc).date()
    try:
        end = date.fromisoformat(end_date) if end_date else today
        start = date.fromisoformat(start_date) if start_date else date(end.year, end.month, 1)
    except ValueError as exc:
        raise ValueError("Dates must use YYYY-MM-DD format.") from exc
    if start > end:
        raise ValueError("start_date must be on or before end_date.")
    if (end - start).days > 1825:
        raise ValueError("Date ranges are limited to five years.")
    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc)
    return start, end, start_dt, end_dt


def _orders_in_period(db: Session, start_dt: datetime, end_dt: datetime):
    return db.query(Order).filter(Order.created_at >= start_dt, Order.created_at < end_dt)


def _excluded_revenue_filter():
    return ~Order.status.in_(REVENUE_EXCLUDED_STATUSES)


class AnalyticsService:
    """Safe, bounded, read-only analytics methods exposed as LLM tools."""

    def __init__(self, db: Session):
        self.db = db

    def sales_summary(self, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        scoped = _orders_in_period(self.db, start_dt, end_dt)
        order_count = scoped.count()
        revenue = scoped.filter(_excluded_revenue_filter()).with_entities(
            func.coalesce(func.sum(Order.total_amount), 0)
        ).scalar() or 0
        qualifying_count = scoped.filter(_excluded_revenue_filter()).count()
        total_order_value = scoped.with_entities(
            func.coalesce(func.sum(Order.total_amount), 0)
        ).scalar() or 0
        status_rows = scoped.with_entities(Order.status, func.count(Order.id)).group_by(Order.status).all()
        statuses = {str(status): int(count) for status, count in status_rows}
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "orders": order_count,
            "revenue_estimate": _number(revenue),
            "all_order_value": _number(total_order_value),
            "average_order_value": _number(Decimal(str(revenue)) / qualifying_count) if qualifying_count else 0.0,
            "cancelled_orders": statuses.get("cancelled", 0),
            "returned_or_refunded_orders": statuses.get("returned", 0) + statuses.get("refunded", 0),
            "qualifying_orders": qualifying_count,
            "orders_by_status": statuses,
            "revenue_definition": "Order totals for orders created during this period, excluding cancelled, returned and refunded order statuses. This is not a payment-reconciled cash ledger.",
        }

    def orders_by_status(self, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        rows = _orders_in_period(self.db, start_dt, end_dt).with_entities(
            Order.status, func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("order_value"),
        ).group_by(Order.status).order_by(func.count(Order.id).desc()).all()
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "total_orders": sum(int(row.orders or 0) for row in rows),
            "note": "Statuses reflect each order's current status, not a historical snapshot of its status on the end date.",
            "statuses": [
                {"status": str(row.status), "orders": int(row.orders or 0), "order_value": _number(row.order_value)}
                for row in rows
            ],
        }

    def sales_trend(self, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        recognized_total = case((_excluded_revenue_filter(), Order.total_amount), else_=0)
        rows = _orders_in_period(self.db, start_dt, end_dt).with_entities(
            func.date(Order.created_at).label("day"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(recognized_total), 0).label("revenue"),
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).all()
        points = [
            {"date": str(row.day), "orders": int(row.orders or 0), "revenue": _number(row.revenue)}
            for row in rows
        ]
        granularity = "daily"
        # Keep model context and UI payloads bounded for multi-month/year questions.
        if (end - start).days > 180:
            monthly: dict[str, dict[str, Any]] = {}
            for point in points:
                month_key = point["date"][:7]
                monthly.setdefault(month_key, {"date": month_key, "orders": 0, "revenue": 0.0})
                monthly[month_key]["orders"] += point["orders"]
                monthly[month_key]["revenue"] = round(monthly[month_key]["revenue"] + point["revenue"], 2)
            points = list(monthly.values())
            granularity = "monthly"
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "granularity": granularity,
            "points": points,
            "total_orders": sum(point["orders"] for point in points),
            "revenue_estimate": _number(sum(point["revenue"] for point in points)),
        }

    def top_products(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        limit: int = 10,
    ) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        limit = max(1, min(int(limit), 20))
        rows = self.db.query(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.line_total).label("revenue"),
        ).join(Order, Order.id == OrderItem.order_id).filter(
            Order.created_at >= start_dt,
            Order.created_at < end_dt,
            _excluded_revenue_filter(),
        ).group_by(OrderItem.product_id, OrderItem.product_name).order_by(
            func.sum(OrderItem.line_total).desc(), func.sum(OrderItem.quantity).desc()
        ).limit(limit).all()
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "products": [
                {"product_id": row.product_id, "product_name": row.product_name,
                 "units_sold": int(row.units_sold or 0), "revenue": _number(row.revenue)}
                for row in rows
            ],
            "ranking_metric": "Historical order-item line total, excluding cancelled, returned and refunded order statuses.",
        }

    def category_performance(self, start_date: str | None = None, end_date: str | None = None, limit: int = 10) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        limit = max(1, min(int(limit), 20))
        rows = self.db.query(
            Category.id.label("category_id"), Category.name.label("category_name"),
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.line_total).label("revenue"),
        ).join(Product, Product.category_id == Category.id).join(
            OrderItem, OrderItem.product_id == Product.id
        ).join(Order, Order.id == OrderItem.order_id).filter(
            Order.created_at >= start_dt, Order.created_at < end_dt, _excluded_revenue_filter()
        ).group_by(Category.id, Category.name).order_by(func.sum(OrderItem.line_total).desc()).limit(limit).all()
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "categories": [
                {"category_id": row.category_id, "category_name": row.category_name,
                 "units_sold": int(row.units_sold or 0), "revenue": _number(row.revenue)}
                for row in rows
            ],
        }

    def inventory_overview(self, threshold: int = 5, limit: int = 15) -> dict[str, Any]:
        threshold = max(0, min(int(threshold), 10000))
        limit = max(1, min(int(limit), 30))
        active = Product.is_active.is_(True)
        total_active = self.db.query(Product).filter(active).count()
        out_of_stock = self.db.query(Product).filter(active, Product.stock_quantity <= 0).count()
        low_stock = self.db.query(Product).filter(active, Product.stock_quantity > 0, Product.stock_quantity <= threshold).count()
        rows = self.db.query(Product).filter(active, Product.stock_quantity <= threshold).order_by(
            Product.stock_quantity.asc(), Product.name.asc()
        ).limit(limit).all()
        return {
            "threshold": threshold,
            "active_products": total_active,
            "low_stock_products": low_stock,
            "out_of_stock_products": out_of_stock,
            "products": [
                {"product_id": item.id, "product_name": item.name, "sku": item.sku,
                 "stock_quantity": item.stock_quantity, "price": _number(item.price)}
                for item in rows
            ],
        }

    def customer_insights(self, start_date: str | None = None, end_date: str | None = None, limit: int = 10) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        limit = max(1, min(int(limit), 20))
        customers = self.db.query(User).filter(User.role == "customer")
        new_customers = customers.filter(User.created_at >= start_dt, User.created_at < end_dt).count()
        total_customers = customers.count()
        active_customers = customers.filter(User.is_active.is_(True)).count()
        order_rows = self.db.query(
            Order.user_id.label("user_id"), func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_amount), 0).label("spend"),
        ).filter(
            Order.created_at >= start_dt, Order.created_at < end_dt, _excluded_revenue_filter()
        ).group_by(Order.user_id).all()
        buyer_order_counts = [int(row.order_count or 0) for row in order_rows]
        repeat_buyers = sum(1 for count in buyer_order_counts if count >= 2)
        buyers = len(order_rows)
        customer_order_query = self.db.query(
            User.name, func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("spend"),
        ).join(Order, Order.user_id == User.id).filter(
            User.role == "customer", Order.created_at >= start_dt, Order.created_at < end_dt,
            _excluded_revenue_filter(),
        ).group_by(User.id, User.name).order_by(func.sum(Order.total_amount).desc()).limit(limit).all()
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "total_customers": total_customers,
            "active_customers": active_customers,
            "new_customers_in_period": new_customers,
            "customers_with_qualifying_orders": buyers,
            "repeat_buyers_in_period": repeat_buyers,
            "repeat_buyer_rate_percent": round((repeat_buyers / buyers) * 100, 2) if buyers else 0.0,
            "top_customers": [
                {"customer_name": row.name, "orders": int(row.orders or 0), "order_value": _number(row.spend)}
                for row in customer_order_query
            ],
        }

    def payment_refund_summary(self, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        attempt_rows = self.db.query(
            PaymentAttempt.status, func.count(PaymentAttempt.id).label("attempts"),
            func.coalesce(func.sum(PaymentAttempt.amount), 0).label("attempted_amount"),
        ).filter(PaymentAttempt.created_at >= start_dt, PaymentAttempt.created_at < end_dt).group_by(PaymentAttempt.status).all()
        refund_rows = self.db.query(
            Refund.status, func.count(Refund.id).label("refunds"),
            func.coalesce(func.sum(Refund.amount), 0).label("amount"),
        ).filter(Refund.created_at >= start_dt, Refund.created_at < end_dt).group_by(Refund.status).all()
        completed_refund_amount = self.db.query(
            func.coalesce(func.sum(Refund.amount), 0)
        ).filter(
            Refund.status == "completed",
            Refund.completed_at.isnot(None),
            Refund.completed_at >= start_dt,
            Refund.completed_at < end_dt,
        ).scalar() or 0
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "payment_attempts": [
                {"status": str(row.status), "attempts": int(row.attempts or 0), "attempted_amount": _number(row.attempted_amount)}
                for row in attempt_rows
            ],
            "refunds": [
                {"status": str(row.status), "refunds": int(row.refunds or 0), "amount": _number(row.amount)}
                for row in refund_rows
            ],
            "completed_refund_amount": _number(completed_refund_amount),
            "note": "Payment-attempt amounts are not proof of money collected. Refund status counts/grouped amounts use refund creation dates; completed_refund_amount uses completion dates. Reconcile with Cashfree/bank records for finance reporting.",
        }

    def returns_cancellations(self, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        scoped = _orders_in_period(self.db, start_dt, end_dt)
        total = scoped.count()
        rows = scoped.with_entities(Order.status, func.count(Order.id).label("orders")).group_by(Order.status).all()
        statuses = {str(row.status): int(row.orders or 0) for row in rows}
        cancellation_rows = scoped.filter(Order.status == "cancelled", Order.cancellation_reason.isnot(None)).with_entities(
            Order.cancellation_reason, func.count(Order.id).label("count")
        ).group_by(Order.cancellation_reason).order_by(func.count(Order.id).desc()).limit(5).all()
        return_count = sum(statuses.get(status, 0) for status in RETURN_STATUSES)
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "total_orders": total,
            "cancelled_orders": statuses.get("cancelled", 0),
            "cancellation_rate_percent": round(statuses.get("cancelled", 0) / total * 100, 2) if total else 0.0,
            "orders_in_return_lifecycle": return_count,
            "return_lifecycle_rate_percent": round(return_count / total * 100, 2) if total else 0.0,
            "status_counts": statuses,
            "common_cancellation_reasons": [
                {"reason": (row.cancellation_reason or "Not specified"), "count": int(row.count or 0)}
                for row in cancellation_rows
            ],
            "note": "Return lifecycle rate counts orders in any return-related status, including refunded orders. It is not a delivery-based return rate.",
        }

    def reviews_summary(self, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
        start, end, start_dt, end_dt = _period(start_date, end_date)
        scoped = self.db.query(Review).filter(Review.created_at >= start_dt, Review.created_at < end_dt)
        count, average = scoped.with_entities(func.count(Review.id), func.avg(Review.rating)).one()
        rows = scoped.with_entities(Review.rating, func.count(Review.id)).group_by(Review.rating).order_by(Review.rating.desc()).all()
        return {
            "period": {"start_date": start.isoformat(), "end_date": end.isoformat()},
            "review_count": int(count or 0),
            "average_rating": round(float(average or 0), 2),
            "rating_distribution": [{"rating": int(rating), "reviews": int(total)} for rating, total in rows],
        }
