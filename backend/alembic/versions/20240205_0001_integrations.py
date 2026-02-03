"""integrations and integration_events

Revision ID: 20240205_0001
Revises: 20240202_0001
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa

revision = "20240205_0001"
down_revision = "20240202_0001"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "integrations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(64), nullable=False),        # e.g., google_calendar, email
        sa.Column("status", sa.String(32), nullable=False, server_default="disconnected"),
        sa.Column("config_json", sa.Text(), nullable=True),          # store tokens/config (encrypted upstream ideally)
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("integrations_user_idx", "integrations", ["user_id"])
    op.create_index("integrations_provider_idx", "integrations", ["provider"])

    op.create_table(
        "integration_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("integration_id", sa.Integer(), sa.ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),      # sync_start, sync_success, sync_error, status_check
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("integration_events_integration_idx", "integration_events", ["integration_id"])

    # optional table to link external events to tasks (calendar)
    op.create_table(
        "external_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(64), nullable=False),        # google_calendar
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("provider", "external_id", name="uq_external_event_provider_external_id")
    )
    op.create_index("external_events_task_idx", "external_events", ["task_id"])

def downgrade():
    op.drop_index("external_events_task_idx", table_name="external_events")
    op.drop_table("external_events")
    op.drop_index("integration_events_integration_idx", table_name="integration_events")
    op.drop_table("integration_events")
    op.drop_index("integrations_provider_idx", table_name="integrations")
    op.drop_index("integrations_user_idx", table_name="integrations")
    op.drop_table("integrations")