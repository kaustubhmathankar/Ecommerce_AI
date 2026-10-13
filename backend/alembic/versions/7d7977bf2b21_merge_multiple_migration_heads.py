"""merge multiple migration heads

Revision ID: 7d7977bf2b21
Revises: b2c3d4e5f6a7, b9c1d2e3f4a5
Create Date: 2026-10-12 13:08:36.074811

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d7977bf2b21'
down_revision: Union[str, Sequence[str], None] = ('b2c3d4e5f6a7', 'b9c1d2e3f4a5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
