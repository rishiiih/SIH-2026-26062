"""Seed reference data

Revision ID: 002
Revises: 001
Create Date: 2026-09-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Insert roles
    op.execute("""
        INSERT INTO roles (name, description) VALUES
        ('Command', 'Mainland Command staff based in Goa with full access'),
        ('Expedition Leader', 'Leads expeditions with station-level access'),
        ('Station Leader', 'Manages a specific polar station'),
        ('Store/Logistics Officer', 'Manages inventory and cargo at a station'),
        ('Field Team Member', 'Field personnel with limited access'),
        ('Medical Officer', 'Medical staff at a station'),
        ('Admin', 'System administrator with full access')
    """)

    # Insert permissions
    op.execute("""
        INSERT INTO permissions (name, description, resource, action) VALUES
        ('user:read', 'View user information', 'users', 'read'),
        ('user:create', 'Create new users', 'users', 'create'),
        ('user:update', 'Update user information', 'users', 'update'),
        ('user:delete', 'Deactivate users', 'users', 'delete'),
        ('role:read', 'View roles and permissions', 'roles', 'read'),
        ('role:create', 'Create new roles', 'roles', 'create'),
        ('role:update', 'Update roles', 'roles', 'update'),
        ('station:read', 'View station information', 'stations', 'read'),
        ('station:create', 'Create new stations', 'stations', 'create'),
        ('station:update', 'Update station information', 'stations', 'update'),
        ('audit:read', 'View audit log', 'audit_log', 'read'),
        ('cargo:read', 'View cargo/consignments', 'consignments', 'read'),
        ('cargo:create', 'Create cargo/consignments', 'consignments', 'create'),
        ('cargo:update', 'Update cargo/consignments', 'consignments', 'update'),
        ('cargo:delete', 'Delete cargo/consignments', 'consignments', 'delete'),
        ('custody:scan', 'Scan cargo for custody transfer', 'custody_scans', 'create'),
        ('inventory:read', 'View inventory', 'inventory', 'read'),
        ('inventory:receive', 'Receive inventory', 'stock_movements', 'create'),
        ('inventory:consume', 'Consume inventory', 'stock_movements', 'create'),
        ('inventory:transfer', 'Transfer inventory', 'stock_movements', 'create'),
        ('inventory:adjust', 'Adjust inventory', 'stock_movements', 'create'),
        ('stocktake:perform', 'Perform stocktake', 'stocktakes', 'create'),
        ('asset:read', 'View assets', 'assets', 'read'),
        ('asset:create', 'Create assets', 'assets', 'create'),
        ('asset:update', 'Update assets', 'assets', 'update'),
        ('asset:assign', 'Assign assets to users', 'asset_assignments', 'create'),
        ('personnel:read', 'View personnel information', 'personnel', 'read'),
        ('personnel:create', 'Create personnel records', 'personnel', 'create'),
        ('personnel:update', 'Update personnel information', 'personnel', 'update'),
        ('personnel:move', 'Move personnel between stations', 'movement_legs', 'create'),
        ('checkin:perform', 'Perform check-in/check-out', 'check_ins', 'create'),
        ('expedition:read', 'View expeditions', 'expeditions', 'read'),
        ('expedition:create', 'Create expeditions', 'expeditions', 'create'),
        ('expedition:submit', 'Submit expeditions for approval', 'expeditions', 'update'),
        ('expedition:approve', 'Approve expeditions', 'expeditions', 'update'),
        ('emergency:read', 'View emergency incidents', 'incidents', 'read'),
        ('emergency:raise', 'Raise emergency incidents', 'incidents', 'create'),
        ('emergency:acknowledge', 'Acknowledge emergency incidents', 'incidents', 'update'),
        ('emergency:respond', 'Respond to emergency incidents', 'incidents', 'update'),
        ('emergency:resolve', 'Resolve emergency incidents', 'incidents', 'update'),
        ('sync:push', 'Push data to server', 'sync', 'push'),
        ('sync:pull', 'Pull data from server', 'sync', 'pull')
    """)

    # Insert stations with real coordinates
 # Insert stations with real coordinates
    op.execute("""
        INSERT INTO stations (name, code, location, latitude, longitude, region, timezone, is_active) VALUES
        ('Maitri', 'MAI', 'Schirmacher Oasis, Antarctica', -70.7650, 11.7330, 'antarctica', 'Asia/Kolkata', true),
        ('Bharati', 'BHA', 'Larsemann Hills, Antarctica', -69.4147, 76.1769, 'antarctica', 'Asia/Kolkata', true),
        ('Himadri', 'HIM', 'Ny-Ålesund, Svalbard, Arctic', 78.9230, 11.9230, 'arctic', 'Europe/Oslo', true),
        ('Central Command', 'CMD', 'Command Centre, India', 15.4989, 73.8278, 'india', 'Asia/Kolkata', true)
    """)


def downgrade() -> None:
    op.execute("DELETE FROM stations")
    op.execute("DELETE FROM permissions")
    op.execute("DELETE FROM roles")
