"""Initial migration

Revision ID: 001
Revises:
Create Date: 2026-09-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(50), nullable=False, unique=True),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), onupdate=sa.func.current_timestamp())
    )

    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text()),
        sa.Column('resource', sa.String(50), nullable=False),
        sa.Column('action', sa.String(50), nullable=False)
    )

    # Create role_permissions table
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('permission_id', sa.Integer(), sa.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
    )

    # Create stations table
    op.create_table(
        'stations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('code', sa.String(10), nullable=False, unique=True),
        sa.Column('location', sa.String(100), nullable=False),
        sa.Column('latitude', sa.Numeric(9, 6), nullable=False),
        sa.Column('longitude', sa.Numeric(9, 6), nullable=False),
        sa.Column('region', sa.String(20), nullable=False),
        sa.Column('timezone', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp())
    )
    op.create_index('idx_stations_region', 'stations', ['region'])

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('username', sa.String(50), nullable=False, unique=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id')),
        sa.Column('station_id', sa.Integer(), sa.ForeignKey('stations.id')),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), onupdate=sa.func.current_timestamp())
    )
    op.create_index('idx_users_station', 'users', ['station_id'])
    op.create_index('idx_users_role', 'users', ['role_id'])

    # Create audit_log table
    op.create_table(
        'audit_log',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.String(100), nullable=False),
        sa.Column('before_data', sa.JSON()),
        sa.Column('after_data', sa.JSON()),
        sa.Column('device_timestamp', sa.DateTime(timezone=True)),
        sa.Column('server_timestamp', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('station_id', sa.Integer(), sa.ForeignKey('stations.id')),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text())
    )
    op.create_index('idx_audit_log_user', 'audit_log', ['user_id'])
    op.create_index('idx_audit_log_entity', 'audit_log', ['entity_type', 'entity_id'])
    op.create_index('idx_audit_log_timestamp', 'audit_log', ['server_timestamp'])


def downgrade() -> None:
    op.drop_index('idx_audit_log_timestamp', 'audit_log')
    op.drop_index('idx_audit_log_entity', 'audit_log')
    op.drop_index('idx_audit_log_user', 'audit_log')
    op.drop_table('audit_log')

    op.drop_index('idx_users_role', 'users')
    op.drop_index('idx_users_station', 'users')
    op.drop_table('users')

    op.drop_index('idx_stations_region', 'stations')
    op.drop_table('stations')

    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
