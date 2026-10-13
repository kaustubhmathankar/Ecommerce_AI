from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ShopSphere order associated with this refund.
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Required for Cashfree refunds; nullable for COD.
    payment_attempt_id: Mapped[int | None] = mapped_column(
        ForeignKey("payment_attempts.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    # Admin who initiated or recorded this refund.
    initiated_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # cashfree, manual_upi, or manual_bank_transfer.
    refund_method: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )

    # Unique identifier returned by or registered with the provider.
    provider_refund_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    # Generated once per refund request to support idempotency.
    idempotency_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=lambda: uuid4().hex,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
    )

    # pending, processing, completed, or failed.
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        index=True,
    )

    reason: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Used for a manually processed COD refund.
    manual_transaction_reference: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    # A sanitized provider error or reason for failure.
    failure_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    order = relationship(
        "Order",
        lazy="selectin",
    )

    payment_attempt = relationship(
        "PaymentAttempt",
        lazy="selectin",
    )

    initiated_by = relationship(
        "User",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="ck_refunds_amount_positive",
        ),
        CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')",
            name="ck_refunds_status_valid",
        ),
        UniqueConstraint(
            "provider_refund_id",
            name="uq_refunds_provider_refund_id",
        ),
        UniqueConstraint(
            "idempotency_key",
            name="uq_refunds_idempotency_key",
        ),
    )
