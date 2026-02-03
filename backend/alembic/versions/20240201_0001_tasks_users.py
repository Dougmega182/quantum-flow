"""add users and tasks single-user default

Revision ID: 20240201_0001
Revises: 20240101_0001
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "20240201_0001"
down_revision = "20240101_0001"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # seed default user (id=1)
    op.execute("INSERT INTO users (id, email) VALUES (1, 'demo@example.com') ON CONFLICT DO NOTHING;")

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, server_default="1"),
        sa.Column("intent_id", sa.Integer(), sa.ForeignKey("intents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("priority", sa.String(16), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("tasks_user_status_idx", "tasks", ["user_id", "status"])
    op.create_index("tasks_user_due_idx", "tasks", ["user_id", "due_at"])
    op.create_index("tasks_intent_idx", "tasks", ["intent_id"])

def downgrade():
    op.drop_index("tasks_intent_idx", table_name="tasks")
    op.drop_index("tasks_user_due_idx", table_name="tasks")
    op.drop_index("tasks_user_status_idx", table_name="tasks")
    op.drop_table("tasks")
    op.drop_table("users")