"""recurrence rules and task templates

Revision ID: 20240202_0001
Revises: 20240201_0001
Create Date: 2026-02-02
"""
from alembic import op
import sqlalchemy as sa

revision = "20240202_0001"
down_revision = "20240201_0001"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "task_templates",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("intent_id", sa.Integer(), sa.ForeignKey("intents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("priority", sa.String(16), nullable=True),
        sa.Column("default_due_days", sa.Integer(), nullable=True),  # offset in days from creation
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("task_templates_user_idx", "task_templates", ["user_id"])

    op.create_table(
        "recurrence_rules",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("task_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("freq", sa.String(16), nullable=False),  # daily, weekly, monthly
        sa.Column("interval", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("byweekday", sa.String(32), nullable=True),  # e.g., "MO,TU,FR"
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_materialized_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("recurrence_rules_user_idx", "recurrence_rules", ["user_id"])
    op.create_index("recurrence_rules_template_idx", "recurrence_rules", ["template_id"])

def downgrade():
    op.drop_index("recurrence_rules_template_idx", table_name="recurrence_rules")
    op.drop_index("recurrence_rules_user_idx", table_name="recurrence_rules")
    op.drop_table("recurrence_rules")
    op.drop_index("task_templates_user_idx", table_name="task_templates")
    op.drop_table("task_templates")