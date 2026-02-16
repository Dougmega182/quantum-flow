"""manual migration: add avatar_url and task columns

Revision ID: 537f39d2c4e4_manual
Revises: 537f39d2c4e4
Create Date: 2026-02-16 15:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '537f39d2c4e4_manual'
down_revision = '237459baee67'
branch_labels = None
depends_on = None

def upgrade():
    # User additions
    op.add_column('users', sa.Column('avatar_url', sa.String(length=512), nullable=True))
    
    # Task additions
    op.add_column('tasks', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('depends_on_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('energy_level', sa.String(length=16), nullable=True))
    
    op.create_foreign_key('fk_tasks_parent_id', 'tasks', 'tasks', ['parent_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_tasks_depends_on_id', 'tasks', 'tasks', ['depends_on_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_tasks_parent_id'), 'tasks', ['parent_id'], unique=False)
    op.create_index(op.f('ix_tasks_depends_on_id'), 'tasks', ['depends_on_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_tasks_depends_on_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_parent_id'), table_name='tasks')
    op.drop_constraint('fk_tasks_depends_on_id', 'tasks', type_='foreignkey')
    op.drop_constraint('fk_tasks_parent_id', 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'energy_level')
    op.drop_column('tasks', 'depends_on_id')
    op.drop_column('tasks', 'parent_id')
    op.drop_column('users', 'avatar_url')
