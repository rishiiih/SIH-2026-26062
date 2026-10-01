"""Normalize command station naming.

Revision ID: normalize_command_station
Revises: 435f52202539
Create Date: 2026-10-01
"""

from alembic import op


revision = "normalize_command_station"
down_revision = "435f52202539"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE stations
        SET
            name = 'Central Command',
            code = 'CMD',
            location = 'Mainland Central Command',
            region = 'mainland'
        WHERE name = 'Goa Command'
           OR code = 'GOA'
        """
    )


def downgrade():
    op.execute(
        """
        UPDATE stations
        SET
            name = 'Goa Command',
            code = 'GOA',
            location = 'Command Centre, India',
            region = 'india'
        WHERE name = 'Central Command'
           OR code = 'CMD'
        """
    )