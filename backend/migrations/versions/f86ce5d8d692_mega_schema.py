"""mega_schema

Revision ID: f86ce5d8d692
Revises: 002
Create Date: 2026-09-30 17:37:02.512486

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f86ce5d8d692'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Standard columns for all offline-syncable tables
    standard_columns = [
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('station_id', sa.Integer(), sa.ForeignKey('stations.id')),
        sa.Column('version', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), onupdate=sa.func.current_timestamp()),
        sa.Column('payload', sa.JSON())
    ]

    # Create Core Tables
    tables = [
        'consignments', 'consignment_items', 'custody_scans', 
        'inventory_items', 'stock_movements', 'personnel', 
        'check_ins', 'assets', 'maintenance_records', 
        'incidents', 'incident_updates'
    ]

    for table in tables:
        # We use a helper function to generate fresh column objects for each table
        op.create_table(
            table,
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('station_id', sa.Integer(), sa.ForeignKey('stations.id')),
            sa.Column('version', sa.Integer(), server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), onupdate=sa.func.current_timestamp()),
            sa.Column('payload', sa.JSON())
        )

    # Create Sync Tables
    op.create_table(
        'sync_cursors',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), unique=True),
        sa.Column('last_pull_version', sa.BigInteger(), server_default='0'),
        sa.Column('last_device_id', sa.String(100))
    )

    op.create_table(
        'change_log',
        sa.Column('seq', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.String(36), nullable=False),
        sa.Column('station_id', sa.Integer()),
        sa.Column('operation', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp())
    )


def downgrade() -> None:
    op.drop_table('change_log')
    op.drop_table('sync_cursors')
    
    tables = [
        'incident_updates', 'incidents', 'maintenance_records', 'assets',
        'check_ins', 'personnel', 'stock_movements', 'inventory_items',
        'custody_scans', 'consignment_items', 'consignments'
    ]
    for table in tables:
        op.drop_table(table)