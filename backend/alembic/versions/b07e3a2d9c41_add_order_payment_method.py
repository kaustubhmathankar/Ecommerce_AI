"""add order payment method

Revision ID: b07e3a2d9c41
Revises: a91f0d7c6b32
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b07e3a2d9c41"
down_revision: Union[str, Sequence[str], None] = "a91f0d7c6b32"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column(
            "payment_method",
            sa.String(length=30),
            nullable=False,
            server_default=sa.text("'cash_on_delivery'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("orders", "payment_method")
