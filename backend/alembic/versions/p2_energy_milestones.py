"""Phase 2 — energy_profiles + milestones tables.

Revision ID: p2_energy_milestones
Revises: 983eaeef9a6a
"""
from alembic import op
import sqlalchemy as sa

revision = "p2_energy_milestones"
down_revision = "983eaeef9a6a"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "energy_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False, index=True),
        sa.Column("hour", sa.Integer(), nullable=False),
        sa.Column("productivity_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("sample_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "milestones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("milestones")
    op.drop_table("energy_profiles")
