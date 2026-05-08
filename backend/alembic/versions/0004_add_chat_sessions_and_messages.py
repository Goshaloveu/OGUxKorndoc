"""Add chat sessions and messages

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-08 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("chat_sessions"):
        op.create_table(
            "chat_sessions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=500), nullable=False, server_default="Новый чат"),
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
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_chat_sessions_id"), "chat_sessions", ["id"], unique=False)
        op.create_index(
            op.f("ix_chat_sessions_user_id"), "chat_sessions", ["user_id"], unique=False
        )

    if not inspector.has_table("chat_messages"):
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("session_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("content", sa.Text(), nullable=False, server_default=""),
            sa.Column("tool_calls", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_chat_messages_id"), "chat_messages", ["id"], unique=False)
        op.create_index(
            op.f("ix_chat_messages_session_id"), "chat_messages", ["session_id"], unique=False
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_messages_session_id"), table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_id"), table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index(op.f("ix_chat_sessions_user_id"), table_name="chat_sessions")
    op.drop_index(op.f("ix_chat_sessions_id"), table_name="chat_sessions")
    op.drop_table("chat_sessions")
