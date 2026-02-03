"""automations and automation_runs

Revision ID: 20240206_0001
Revises: 20240205_0001
Create Date: 2026-02-06
"""
from alembic import op
import sqlalchemy as sa

revision = "20240206_0001"
down_revision = "20240205_0001"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "automations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("trigger_type", sa.String(64), nullable=False),   # e.g., "task_status", "time_based"
        sa.Column("trigger_config", sa.Text(), nullable=True),      # JSON blob
        sa.Column("action_type", sa.String(64), nullable=False),    # e.g., "create_task", "update_task", "notify"
        sa.Column("action_config", sa.Text(), nullable=True),       # JSON blob
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.sql.expression.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("automations_user_idx", "automations", ["user_id"])

    op.create_table(
        "automation_runs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("automation_id", sa.Integer(), sa.ForeignKey("automations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),         # started, success, error
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("automation_runs_auto_idx", "automation_runs", ["automation_id"])

def downgrade():
    op.drop_index("automation_runs_auto_idx", table_name="automation_runs")
    op.drop_table("automation_runs")
    op.drop_index("automations_user_idx", table_name="automations")
    op.drop_table("automations")