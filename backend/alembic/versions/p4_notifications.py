"""Alembic migration — Phase 4: notifications table.

Revision ID: p4_notifications
Revises: p3_team_blueprints
"""
from alembic import op
import sqlalchemy as sa

revision = "p4_notifications"
down_revision = "p3_team_blueprints"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("task_id", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade():
    op.drop_table("notifications")
