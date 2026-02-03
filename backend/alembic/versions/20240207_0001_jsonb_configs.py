"""switch configs to jsonb

Revision ID: 20240207_0001
Revises: 20240206_0001
Create Date: 2026-02-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20240207_0001"
down_revision = "20240206_0001"
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column("integrations", "config_json", type_=postgresql.JSONB, postgresql_using="config_json::jsonb")
    op.alter_column("automations", "trigger_config", type_=postgresql.JSONB, postgresql_using="trigger_config::jsonb")
    op.alter_column("automations", "action_config", type_=postgresql.JSONB, postgresql_using="action_config::jsonb")

def downgrade():
    op.alter_column("automations", "action_config", type_=sa.Text)
    op.alter_column("automations", "trigger_config", type_=sa.Text)
    op.alter_column("integrations", "config_json", type_=sa.Text)