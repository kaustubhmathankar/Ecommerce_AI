from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base
from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.payment import PaymentAttempt
from app.models.product import Product
from app.models.refund import Refund
from app.models.review import Review
from app.models.user import User
from app.services.analytics_service import AnalyticsService

# Import remaining model modules so relationship metadata is fully registered.
from app.models.address import Address  # noqa: F401
from app.models.cart import CartItem  # noqa: F401
from app.models.newsletter import NewsletterSubscription  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.wishlist import WishlistItem  # noqa: F401


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def seed(db):
    now = datetime.now(timezone.utc)
    user = User(name="Customer One", email="customer@example.test", password_hash="not-a-real-hash", role="customer", is_active=True, created_at=now)
    category = Category(name="Accessories", slug="accessories", is_active=True, created_at=now, updated_at=now)
    db.add_all([user, category])
    db.flush()
    available = Product(name="Travel Mug", slug="travel-mug", sku="MUG-001", price=Decimal("500.00"), stock_quantity=2, category_id=category.id, is_active=True, created_at=now, updated_at=now)
    out = Product(name="Desk Lamp", slug="desk-lamp", sku="LAMP-001", price=Decimal("1200.00"), stock_quantity=0, category_id=category.id, is_active=True, created_at=now, updated_at=now)
    db.add_all([available, out])
    db.flush()
    delivered = Order(user_id=user.id, full_name="Customer One", phone="000", address_line="Address", city="Nagpur", state="Maharashtra", postal_code="440001", payment_method="cash_on_delivery", shipping_amount=Decimal("0"), total_amount=Decimal("500"), status="delivered", created_at=now)
    cancelled = Order(user_id=user.id, full_name="Customer One", phone="000", address_line="Address", city="Nagpur", state="Maharashtra", postal_code="440001", payment_method="cash_on_delivery", shipping_amount=Decimal("0"), total_amount=Decimal("500"), status="cancelled", created_at=now)
    db.add_all([delivered, cancelled])
    db.flush()
    db.add(OrderItem(order_id=delivered.id, product_id=available.id, product_name=available.name, unit_price=Decimal("500"), quantity=1, line_total=Decimal("500")))
    db.add(Review(product_id=available.id, user_id=user.id, order_id=delivered.id, rating=5, title="Good", comment="Works well", is_verified_purchase=True, created_at=now, updated_at=now))
    db.add(PaymentAttempt(user_id=user.id, order_id=delivered.id, provider="cashfree", provider_order_id="provider-test-1", payment_session_id="session-test", amount=Decimal("500"), currency="INR", status="paid", created_at=now, updated_at=now))
    db.add(Refund(order_id=delivered.id, payment_attempt_id=None, initiated_by_user_id=user.id, refund_method="manual_bank_transfer", amount=Decimal("100"), currency="INR", status="completed", created_at=now, updated_at=now, completed_at=now))
    db.commit()


def test_sales_summary_excludes_cancelled_from_revenue_but_counts_order(db_session):
    seed(db_session)
    result = AnalyticsService(db_session).sales_summary()
    assert result["orders"] == 2
    assert result["cancelled_orders"] == 1
    assert result["revenue_estimate"] == 500.0
    assert result["average_order_value"] == 500.0


def test_inventory_overview_detects_low_and_out_of_stock(db_session):
    seed(db_session)
    result = AnalyticsService(db_session).inventory_overview(threshold=5)
    assert result["active_products"] == 2
    assert result["low_stock_products"] == 1
    assert result["out_of_stock_products"] == 1
    assert result["products"][0]["stock_quantity"] == 0


def test_payment_refund_summary_reports_recorded_completed_refunds(db_session):
    seed(db_session)
    result = AnalyticsService(db_session).payment_refund_summary()
    assert result["completed_refund_amount"] == 100.0
    assert result["payment_attempts"][0]["status"] == "paid"


def test_date_validation_rejects_reversed_ranges(db_session):
    seed(db_session)
    with pytest.raises(ValueError, match="on or before"):
        AnalyticsService(db_session).sales_summary("2026-10-12", "2026-10-11")


def test_long_sales_trend_aggregates_by_month(db_session):
    result = AnalyticsService(db_session).sales_trend("2025-01-01", "2026-10-01")
    assert result["granularity"] == "monthly"
    assert result["points"] == []
