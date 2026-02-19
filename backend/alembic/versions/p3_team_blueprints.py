"""Alembic migration — Phase 3: team_members, workflow_blueprints, assigned_to.

Revision ID: p3_team_blueprints
Revises: p2_energy_milestones
"""
from alembic import op
import sqlalchemy as sa

revision = "p3_team_blueprints"
down_revision = "p2_energy_milestones"
branch_labels = None
depends_on = None


def upgrade():
    # Team members table
    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("role", sa.String(100), nullable=True),
        sa.Column("capacity_hours_per_day", sa.Float, nullable=False, server_default="8.0"),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Workflow blueprints table
    op.create_table(
        "workflow_blueprints",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("steps_json", sa.Text, nullable=False, server_default="[]"),
        sa.Column("is_builtin", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Add assigned_to to tasks
    op.add_column("tasks", sa.Column("assigned_to", sa.Integer, sa.ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_tasks_assigned_to", "tasks", ["assigned_to"])


def downgrade():
    op.drop_index("ix_tasks_assigned_to", "tasks")
    op.drop_column("tasks", "assigned_to")
    op.drop_table("workflow_blueprints")
    op.drop_table("team_members")
