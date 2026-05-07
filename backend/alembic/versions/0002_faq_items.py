"""Add FAQ items table

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-07 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "faq_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("question", sa.String(length=500), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_faq_items_id"), "faq_items", ["id"], unique=False)
    op.create_index("ix_faq_items_published_order", "faq_items", ["is_published", "order"])


def downgrade() -> None:
    op.drop_index("ix_faq_items_published_order", table_name="faq_items")
    op.drop_index(op.f("ix_faq_items_id"), table_name="faq_items")
    op.drop_table("faq_items")
