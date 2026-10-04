"""add sos core fields and emergency tables

Revision ID: c1e828d94e23
Revises: bff9e2563baf
Create Date: 2026-10-02 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1e828d94e23'
down_revision = 'bff9e2563baf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add SOS fields to incidents
    op.add_column('incidents', sa.Column('is_sos', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('incidents', sa.Column('sos_category', sa.String(length=30), nullable=True))
    op.add_column('incidents', sa.Column('source', sa.String(length=30), nullable=False, server_default='manual'))
    op.add_column('incidents', sa.Column('reporter_personnel_id', sa.String(length=36), nullable=True))
    op.add_column('incidents', sa.Column('people_affected', sa.Integer(), nullable=True))
    op.add_column('incidents', sa.Column('details', sa.JSON(), nullable=True))
    op.add_column('incidents', sa.Column('cancel_requested_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('incidents', sa.Column('cancel_requested_by', sa.String(length=36), nullable=True))
    op.add_column('incidents', sa.Column('cancel_requested_reason', sa.String(length=500), nullable=True))
    op.add_column('incidents', sa.Column('cancel_confirmed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('incidents', sa.Column('cancel_confirmed_by', sa.String(length=36), nullable=True))

    op.create_index(op.f('ix_incidents_is_sos'), 'incidents', ['is_sos'], unique=False)
    op.create_index(op.f('ix_incidents_sos_category'), 'incidents', ['sos_category'], unique=False)
    op.create_foreign_key(None, 'incidents', 'personnel', ['reporter_personnel_id'], ['id'])
    op.create_foreign_key(None, 'incidents', 'users', ['cancel_requested_by'], ['id'])
    op.create_foreign_key(None, 'incidents', 'users', ['cancel_confirmed_by'], ['id'])

    # 2. Add kind to incident_updates
    op.add_column('incident_updates', sa.Column('kind', sa.String(length=30), nullable=False, server_default='note'))
    op.create_index(op.f('ix_incident_updates_kind'), 'incident_updates', ['kind'], unique=False)

    # 3. Create muster_entries table
    op.create_table(
        'muster_entries',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('station_id', sa.Integer(), sa.ForeignKey('stations.id'), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('incident_id', sa.String(length=36), sa.ForeignKey('incidents.id'), nullable=False),
        sa.Column('personnel_id', sa.String(length=36), sa.ForeignKey('personnel.id'), nullable=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='unaccounted'),
        sa.Column('reported_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('reported_by', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('via', sa.String(length=30), nullable=False, server_default='self'),
    )
    op.create_index(op.f('ix_muster_entries_station_id'), 'muster_entries', ['station_id'], unique=False)
    op.create_index(op.f('ix_muster_entries_created_by'), 'muster_entries', ['created_by'], unique=False)
    op.create_index(op.f('ix_muster_entries_incident_id'), 'muster_entries', ['incident_id'], unique=False)
    op.create_index(op.f('ix_muster_entries_personnel_id'), 'muster_entries', ['personnel_id'], unique=False)
    op.create_index(op.f('ix_muster_entries_user_id'), 'muster_entries', ['user_id'], unique=False)
    op.create_index(op.f('ix_muster_entries_status'), 'muster_entries', ['status'], unique=False)

    # 4. Create assistance_requests table
    op.create_table(
        'assistance_requests',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('station_id', sa.Integer(), sa.ForeignKey('stations.id'), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('incident_id', sa.String(length=36), sa.ForeignKey('incidents.id'), nullable=False),
        sa.Column('neighbour_id', sa.String(length=36), nullable=True),
        sa.Column('external_label', sa.String(length=100), nullable=True),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='radio_vhf'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='requested'),
        sa.Column('script_text', sa.Text(), nullable=True),
        sa.Column('requested_by', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('contacted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
    )
    op.create_index(op.f('ix_assistance_requests_station_id'), 'assistance_requests', ['station_id'], unique=False)
    op.create_index(op.f('ix_assistance_requests_created_by'), 'assistance_requests', ['created_by'], unique=False)
    op.create_index(op.f('ix_assistance_requests_incident_id'), 'assistance_requests', ['incident_id'], unique=False)
    op.create_index(op.f('ix_assistance_requests_neighbour_id'), 'assistance_requests', ['neighbour_id'], unique=False)
    op.create_index(op.f('ix_assistance_requests_status'), 'assistance_requests', ['status'], unique=False)

    # 5. Create station_neighbours table
    op.create_table(
        'station_neighbours',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('station_id', sa.Integer(), sa.ForeignKey('stations.id'), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('country', sa.String(length=50), nullable=False),
        sa.Column('distance_km', sa.Float(), nullable=False),
        sa.Column('distance_note', sa.String(length=100), nullable=True),
        sa.Column('services', sa.JSON(), nullable=True),
        sa.Column('contact_channels', sa.JSON(), nullable=True),
        sa.Column('is_sample', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('notes', sa.Text(), nullable=True),
    )
    op.create_index(op.f('ix_station_neighbours_station_id'), 'station_neighbours', ['station_id'], unique=False)
    op.create_index(op.f('ix_station_neighbours_created_by'), 'station_neighbours', ['created_by'], unique=False)
    op.create_index(op.f('ix_station_neighbours_name'), 'station_neighbours', ['name'], unique=False)


def downgrade() -> None:
    op.drop_table('station_neighbours')
    op.drop_table('assistance_requests')
    op.drop_table('muster_entries')

    op.drop_index(op.f('ix_incident_updates_kind'), table_name='incident_updates')
    op.drop_column('incident_updates', 'kind')

    op.drop_index(op.f('ix_incidents_sos_category'), table_name='incidents')
    op.drop_index(op.f('ix_incidents_is_sos'), table_name='incidents')
    op.drop_column('incidents', 'cancel_confirmed_by')
    op.drop_column('incidents', 'cancel_confirmed_at')
    op.drop_column('incidents', 'cancel_requested_reason')
    op.drop_column('incidents', 'cancel_requested_by')
    op.drop_column('incidents', 'cancel_requested_at')
    op.drop_column('incidents', 'details')
    op.drop_column('incidents', 'people_affected')
    op.drop_column('incidents', 'reporter_personnel_id')
    op.drop_column('incidents', 'source')
    op.drop_column('incidents', 'sos_category')
    op.drop_column('incidents', 'is_sos')
