"""add order delivery details and shipping amount

Revision ID: a91f0d7c6b32
Revises: 8e4c2f3a1b7d
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a91f0d7c6b32"
down_revision: Union[str, Sequence[str], None] = "8e4c2f3a1b7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column(
            "full_name",
            sa.String(length=120),
            nullable=False,
            server_default=sa.text("'Not provided'"),
        ),
    )
    op.add_column(
        "orders",
        sa.Column(
            "phone",
            sa.String(length=30),
            nullable=False,
            server_default=sa.text("'Not provided'"),
        ),
    )
    op.add_column(
        "orders",
        sa.Column(
            "address_line",
            sa.String(length=255),
            nullable=False,
            server_default=sa.text("'Not provided'"),
        ),
    )
    op.add_column(
        "orders",
        sa.Column(
            "city",
            sa.String(length=100),
            nullable=False,
            server_default=sa.text("'Not provided'"),
        ),
    )
    op.add_column(
        "orders",
        sa.Column(
            "state",
            sa.String(length=100),
            nullable=False,
            server_default=sa.text("'Not provided'"),
        ),
    )
    op.add_column(
        "orders",
        sa.Column(
            "postal_code",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'Not provided'"),
        ),
    )
    op.add_column(
        "orders",
        sa.Column(
            "shipping_amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("orders", "shipping_amount")
    op.drop_column("orders", "postal_code")
    op.drop_column("orders", "state")
    op.drop_column("orders", "city")
    op.drop_column("orders", "address_line")
    op.drop_column("orders", "phone")
    op.drop_column("orders", "full_name")
