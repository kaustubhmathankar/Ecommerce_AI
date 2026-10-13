"""create persistent cart and wishlist

Revision ID: f7a8b9c0d1e2
Revises: f1a2b3c4d5e6
Create Date: 2026-10-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f7a8b9c0d1e2"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "f1a2b3c4d5e6"

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

    if not inspector.has_table("cart_items"):
        op.create_table(
            "cart_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
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
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                ondelete="RESTRICT",
            ),
            sa.ForeignKeyConstraint(
                ["product_id"],
                ["products.id"],
                ondelete="RESTRICT",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "user_id",
                "product_id",
                name="uq_cart_items_user_product",
            ),
        )

        op.create_index(
            "ix_cart_items_id",
            "cart_items",
            ["id"],
            unique=False,
        )

        op.create_index(
            "ix_cart_items_user_id",
            "cart_items",
            ["user_id"],
            unique=False,
        )

        op.create_index(
            "ix_cart_items_product_id",
            "cart_items",
            ["product_id"],
            unique=False,
        )

    if not inspector.has_table("wishlist_items"):
        op.create_table(
            "wishlist_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                ondelete="RESTRICT",
            ),
            sa.ForeignKeyConstraint(
                ["product_id"],
                ["products.id"],
                ondelete="RESTRICT",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "user_id",
                "product_id",
                name="uq_wishlist_items_user_product",
            ),
        )

        op.create_index(
            "ix_wishlist_items_id",
            "wishlist_items",
            ["id"],
            unique=False,
        )

        op.create_index(
            "ix_wishlist_items_user_id",
            "wishlist_items",
            ["user_id"],
            unique=False,
        )

        op.create_index(
            "ix_wishlist_items_product_id",
            "wishlist_items",
            ["product_id"],
            unique=False,
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if inspector.has_table("wishlist_items"):
        op.drop_index(
            "ix_wishlist_items_product_id",
            table_name="wishlist_items",
        )
        op.drop_index(
            "ix_wishlist_items_user_id",
            table_name="wishlist_items",
        )
        op.drop_index(
            "ix_wishlist_items_id",
            table_name="wishlist_items",
        )
        op.drop_table("wishlist_items")

    if inspector.has_table("cart_items"):
        op.drop_index(
            "ix_cart_items_product_id",
            table_name="cart_items",
        )
        op.drop_index(
            "ix_cart_items_user_id",
            table_name="cart_items",
        )
        op.drop_index(
            "ix_cart_items_id",
            table_name="cart_items",
        )
        op.drop_table("cart_items")
