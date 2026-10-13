"""create product reviews

Revision ID: b9c1d2e3f4a5
Revises: a8b9c0d1e2f3
Create Date: 2026-10-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b9c1d2e3f4a5"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "9c7d6e5f4a3b"

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

    inspector = sa.inspect(
        op.get_bind(),
    )

    if inspector.has_table(
        "reviews",
    ):
        return

    op.create_table(
        "reviews",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Integer(),
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
            nullable=False,
        ),
        sa.Column(
            "order_item_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "rating",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(length=150),
            nullable=False,
        ),
        sa.Column(
            "comment",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "is_verified_purchase",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
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
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["order_item_id"],
            ["order_items.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
        sa.UniqueConstraint(
            "user_id",
            "product_id",
            name="uq_reviews_user_product",
        ),
        sa.CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="ck_reviews_rating_range",
        ),
    )

    op.create_index(
        "ix_reviews_id",
        "reviews",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_reviews_product_id",
        "reviews",
        ["product_id"],
        unique=False,
    )

    op.create_index(
        "ix_reviews_user_id",
        "reviews",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_reviews_order_id",
        "reviews",
        ["order_id"],
        unique=False,
    )

    op.create_index(
        "ix_reviews_order_item_id",
        "reviews",
        ["order_item_id"],
        unique=False,
    )

    op.create_index(
        "ix_reviews_created_at",
        "reviews",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:

    inspector = sa.inspect(
        op.get_bind(),
    )

    if not inspector.has_table(
        "reviews",
    ):
        return

    for index_name in (
        "ix_reviews_created_at",
        "ix_reviews_order_item_id",
        "ix_reviews_order_id",
        "ix_reviews_user_id",
        "ix_reviews_product_id",
        "ix_reviews_id",
    ):

        op.drop_index(
            index_name,
            table_name="reviews",
        )

    op.drop_table(
        "reviews",
    )
