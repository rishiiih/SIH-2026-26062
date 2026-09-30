"""add default uuid to users id

Revision ID: 32a4e940cfa8
Revises: 002
Create Date: 2026-09-30 16:24:59.669154

"""
from alembic import op
import sqlalchemy as sa
import uuid


# revision identifiers, used by Alembic.
revision = '32a4e940cfa8'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update existing rows to have UUIDs if they don't have them
    op.execute("""
        UPDATE users 
        SET id = uuid_generate_v4()::text 
        WHERE id IS NULL OR id = ''
    """)
    
    # Set default for future inserts
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text
    """)


def downgrade() -> None:
    # Remove default
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN id DROP DEFAULT
    """)
