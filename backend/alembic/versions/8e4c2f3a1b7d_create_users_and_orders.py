"""create users and persistent orders

Revision ID: 8e4c2f3a1b7d
Revises: 2b5a4cad3a6b
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "8e4c2f3a1b7d"
down_revision: Union[str, Sequence[str], None] = "2b5a4cad3a6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("reset_token", sa.String(length=255), nullable=True),
            sa.Column(
                "reset_token_expires_at", sa.DateTime(timezone=True), nullable=True
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_users_id", "users", ["id"], unique=False)
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if not inspector.has_table("orders"):
        op.create_table(
            "orders",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("total_amount", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.CheckConstraint("total_amount >= 0", name="ck_orders_total_nonnegative"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not inspector.has_table("order_items"):
        op.create_table(
            "order_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("product_name", sa.String(length=200), nullable=False),
            sa.Column("unit_price", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("line_total", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
            sa.CheckConstraint("unit_price >= 0", name="ck_order_items_price_nonnegative"),
            sa.CheckConstraint("line_total >= 0", name="ck_order_items_total_nonnegative"),
            sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
            sa.PrimaryKeyConstraint("id"),
        )

    for table_name, index_name, columns in (
        ("orders", "ix_orders_id", ["id"]),
        ("orders", "ix_orders_user_id", ["user_id"]),
        ("order_items", "ix_order_items_order_id", ["order_id"]),
        ("order_items", "ix_order_items_product_id", ["product_id"]),
    ):
        existing_indexes = {
            index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table_name)
        }
        if index_name not in existing_indexes:
            op.create_index(index_name, table_name, columns, unique=False)


def downgrade() -> None:
    op.drop_index("ix_order_items_product_id", table_name="order_items")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_user_id", table_name="orders")
    op.drop_index("ix_orders_id", table_name="orders")
    op.drop_table("orders")
    # The user table is app infrastructure, so order downgrades preserve it.
