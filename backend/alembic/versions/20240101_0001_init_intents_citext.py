"""init intents citext

Revision ID: 20240101_0001
Revises: None
Create Date: 2026-01-27
"""
from alembic import op
import sqlalchemy as sa

revision = "20240101_0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS citext;")
    op.create_table(
        "intents",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.dialects.postgresql.CITEXT(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_unique_constraint("uq_intents_name", "intents", ["name"])
    op.create_index("idx_intents_name", "intents", ["name"])

def downgrade():
    op.drop_index("idx_intents_name", table_name="intents")
    op.drop_constraint("uq_intents_name", "intents", type_="unique")
    op.drop_table("intents")
