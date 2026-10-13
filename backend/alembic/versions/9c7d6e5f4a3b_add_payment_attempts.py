"""add payment attempts

Revision ID: 9c7d6e5f4a3b
Revises: f7a8b9c0d1e2
Create Date: 2026-10-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9c7d6e5f4a3b"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "a8b9c0d1e2f3"


def upgrade() -> None:
    op.create_table(
        "payment_attempts",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "order_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "provider",
            sa.String(length=50),
            nullable=False,
            server_default="cashfree",
        ),
        sa.Column(
            "provider_order_id",
            sa.String(length=150),
            nullable=False,
        ),
        sa.Column(
            "payment_session_id",
            sa.String(length=500),
            nullable=False,
        ),
        sa.Column(
            "amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
        ),
        sa.Column(
            "currency",
            sa.String(length=10),
            nullable=False,
            server_default="INR",
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="pending",
        ),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="SET NULL",
        ),
    )

    op.create_index(
        "ix_payment_attempts_id",
        "payment_attempts",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_attempts_user_id",
        "payment_attempts",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_attempts_order_id",
        "payment_attempts",
        ["order_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_attempts_provider_order_id",
        "payment_attempts",
        ["provider_order_id"],
        unique=True,
    )

    op.create_index(
        "ix_payment_attempts_status",
        "payment_attempts",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_payment_attempts_status",
        table_name="payment_attempts",
    )

    op.drop_index(
        "ix_payment_attempts_provider_order_id",
        table_name="payment_attempts",
    )

    op.drop_index(
        "ix_payment_attempts_order_id",
        table_name="payment_attempts",
    )

    op.drop_index(
        "ix_payment_attempts_user_id",
        table_name="payment_attempts",
    )

    op.drop_index(
        "ix_payment_attempts_id",
        table_name="payment_attempts",
    )

    op.drop_table("payment_attempts")
