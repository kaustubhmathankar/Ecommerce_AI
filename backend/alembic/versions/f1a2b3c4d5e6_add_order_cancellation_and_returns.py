"""add order cancellation and return workflow

Revision ID: f1a2b3c4d5e6
Revises: e84a1b2c3d45
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1a2b3c4d5e6"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "e84a1b2c3d45"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    columns = {column["name"] for column in inspector.get_columns("orders")}

    if "cancellation_reason" not in columns:
        op.add_column(
            "orders",
            sa.Column(
                "cancellation_reason",
                sa.String(length=500),
                nullable=True,
            ),
        )

    if "cancelled_at" not in columns:
        op.add_column(
            "orders",
            sa.Column(
                "cancelled_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )

    if "return_reason" not in columns:
        op.add_column(
            "orders",
            sa.Column(
                "return_reason",
                sa.String(length=500),
                nullable=True,
            ),
        )

    if "return_requested_at" not in columns:
        op.add_column(
            "orders",
            sa.Column(
                "return_requested_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )

    if "return_processed_at" not in columns:
        op.add_column(
            "orders",
            sa.Column(
                "return_processed_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )

    if "stock_restored" not in columns:
        op.add_column(
            "orders",
            sa.Column(
                "stock_restored",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    columns = {column["name"] for column in inspector.get_columns("orders")}

    for column_name in [
        "stock_restored",
        "return_processed_at",
        "return_requested_at",
        "return_reason",
        "cancelled_at",
        "cancellation_reason",
    ]:
        if column_name in columns:
            op.drop_column(
                "orders",
                column_name,
            )
