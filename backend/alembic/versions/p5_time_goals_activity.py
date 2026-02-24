"""Alembic migration — Phase 5: time_entries, goals, goal_tasks, activities.

Revision ID: p5_time_goals_activity
Revises: p4_notifications
"""
from alembic import op
import sqlalchemy as sa

revision = "p5_time_goals_activity"
down_revision = "p4_notifications"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "time_entries",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("task_id", sa.Integer, sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer, nullable=False, index=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("target_value", sa.Float, nullable=False, server_default="100"),
        sa.Column("current_value", sa.Float, nullable=False, server_default="0"),
        sa.Column("unit", sa.String(50), nullable=True, server_default="'%'"),
        sa.Column("status", sa.String(20), nullable=False, server_default="'active'"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "goal_tasks",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("goal_id", sa.Integer, sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("task_id", sa.Integer, sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "activities",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=False, index=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer, nullable=True),
        sa.Column("entity_title", sa.String(255), nullable=True),
        sa.Column("metadata_json", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, index=True),
    )


def downgrade():
    op.drop_table("activities")
    op.drop_table("goal_tasks")
    op.drop_table("goals")
    op.drop_table("time_entries")
