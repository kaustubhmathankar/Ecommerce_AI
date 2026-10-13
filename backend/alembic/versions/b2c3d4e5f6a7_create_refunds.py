"""create refunds table

Revision ID: b2c3d4e5f6a7
Revises: 9c7d6e5f4a3b
Create Date: 2026-10-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "9c7d6e5f4a3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Avoid recreating the table if development startup already created it.
    inspector = sa.inspect(op.get_bind())

    if inspector.has_table("refunds"):
        return

    op.create_table(
        "refunds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("payment_attempt_id", sa.Integer(), nullable=True),
        sa.Column("initiated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("refund_method", sa.String(length=40), nullable=False),
        sa.Column("provider_refund_id", sa.String(length=150), nullable=True),
        sa.Column("idempotency_key", sa.String(length=100), nullable=False),
        sa.Column(
            "amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
        ),
        sa.Column(
            "currency",
            sa.String(length=10),
            server_default=sa.text("'INR'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column(
            "manual_transaction_reference",
            sa.String(length=200),
            nullable=True,
        ),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.CheckConstraint(
            "amount > 0",
            name="ck_refunds_amount_positive",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')",
            name="ck_refunds_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["payment_attempt_id"],
            ["payment_attempts.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["initiated_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider_refund_id",
            name="uq_refunds_provider_refund_id",
        ),
        sa.UniqueConstraint(
            "idempotency_key",
            name="uq_refunds_idempotency_key",
        ),
    )

    op.create_index(
        "ix_refunds_id",
        "refunds",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_refunds_order_id",
        "refunds",
        ["order_id"],
        unique=False,
    )

    op.create_index(
        "ix_refunds_payment_attempt_id",
        "refunds",
        ["payment_attempt_id"],
        unique=False,
    )

    op.create_index(
        "ix_refunds_initiated_by_user_id",
        "refunds",
        ["initiated_by_user_id"],
        unique=False,
    )

    op.create_index(
        "ix_refunds_status",
        "refunds",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("refunds"):
        return

    op.drop_index("ix_refunds_status", table_name="refunds")
    op.drop_index(
        "ix_refunds_initiated_by_user_id",
        table_name="refunds",
    )
    op.drop_index(
        "ix_refunds_payment_attempt_id",
        table_name="refunds",
    )
    op.drop_index("ix_refunds_order_id", table_name="refunds")
    op.drop_index("ix_refunds_id", table_name="refunds")

    op.drop_table("refunds")
