"""create newsletter subscriptions

Revision ID: c3d5e7f9012a
Revises: b07e3a2d9c41
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d5e7f9012a"
down_revision: Union[str, Sequence[str], None] = "b07e3a2d9c41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("newsletter_subscriptions"):
        op.create_table(
            "newsletter_subscriptions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    existing_indexes = {
        index["name"]
        for index in sa.inspect(op.get_bind()).get_indexes("newsletter_subscriptions")
    }
    if "ix_newsletter_subscriptions_email" not in existing_indexes:
        op.create_index(
            "ix_newsletter_subscriptions_email",
            "newsletter_subscriptions",
            ["email"],
            unique=True,
        )


def downgrade() -> None:
    op.drop_index("ix_newsletter_subscriptions_email", table_name="newsletter_subscriptions")
    op.drop_table("newsletter_subscriptions")
