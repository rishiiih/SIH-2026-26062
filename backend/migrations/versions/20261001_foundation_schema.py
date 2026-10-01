"""Complete the offline-first foundation schema.

Revision ID: foundation_schema
Revises: normalize_command_station
"""

from alembic import op


revision = "foundation_schema"
down_revision = "normalize_command_station"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE stations
        ADD COLUMN IF NOT EXISTS next_resupply_at TIMESTAMPTZ
        """
    )

    op.execute(
        """
        ALTER TABLE consignments
            ADD COLUMN IF NOT EXISTS consignment_number VARCHAR(100),
            ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
            ADD COLUMN IF NOT EXISTS description VARCHAR(500),
            ADD COLUMN IF NOT EXISTS origin_station_id INTEGER,
            ADD COLUMN IF NOT EXISTS destination_station_id INTEGER,
            ADD COLUMN IF NOT EXISTS status VARCHAR(30),
            ADD COLUMN IF NOT EXISTS priority VARCHAR(2),
            ADD COLUMN IF NOT EXISTS mode VARCHAR(20),
            ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS volume_m3 DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS is_hazardous BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS is_fragile BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS planned_departure TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS eta TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS created_by VARCHAR(36),
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
        """
    )

    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_consignments_number
        ON consignments (consignment_number)
        WHERE consignment_number IS NOT NULL
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS consignment_items (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            consignment_id VARCHAR(36) NOT NULL REFERENCES consignments(id),
            description VARCHAR(500) NOT NULL,
            quantity INTEGER NOT NULL,
            unit VARCHAR(50) NOT NULL,
            inventory_item_id VARCHAR(36)
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS custody_scans (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            consignment_id VARCHAR(36) NOT NULL REFERENCES consignments(id),
            scanned_by VARCHAR(36) NOT NULL REFERENCES users(id),
            scan_type VARCHAR(20) NOT NULL,
            location_text VARCHAR(255),
            note VARCHAR(500),
            device_timestamp TIMESTAMPTZ
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS inventory_items (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(30) NOT NULL,
            unit VARCHAR(50) NOT NULL,
            reorder_level DOUBLE PRECISION
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS stock_movements (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            item_id VARCHAR(36) NOT NULL REFERENCES inventory_items(id),
            movement_type VARCHAR(20) NOT NULL,
            quantity DOUBLE PRECISION NOT NULL,
            reference_type VARCHAR(50),
            reference_id VARCHAR(36),
            note VARCHAR(500),
            device_timestamp TIMESTAMPTZ
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS personnel (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            user_id VARCHAR(36) REFERENCES users(id),
            full_name VARCHAR(255) NOT NULL,
            role_title VARCHAR(100) NOT NULL,
            current_station_id INTEGER REFERENCES stations(id),
            status VARCHAR(20) NOT NULL,
            radio_callsign VARCHAR(100),
            medical_clearance_expires_on DATE,
            checkin_interval_hours INTEGER
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS check_ins (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            personnel_id VARCHAR(36) NOT NULL REFERENCES personnel(id),
            status VARCHAR(20) NOT NULL,
            note VARCHAR(500),
            location_text VARCHAR(255),
            lat DOUBLE PRECISION,
            lon DOUBLE PRECISION,
            device_timestamp TIMESTAMPTZ
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS assets (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            asset_number VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(30) NOT NULL,
            status VARCHAR(20) NOT NULL,
            condition_note VARCHAR(500),
            last_maintenance_at TIMESTAMPTZ,
            next_maintenance_due TIMESTAMPTZ,
            assigned_to_user_id VARCHAR(36) REFERENCES users(id)
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS maintenance_records (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            asset_id VARCHAR(36) NOT NULL REFERENCES assets(id),
            performed_by VARCHAR(36) NOT NULL REFERENCES users(id),
            performed_at TIMESTAMPTZ NOT NULL,
            notes VARCHAR(1000),
            next_due TIMESTAMPTZ
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS incidents (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            type VARCHAR(30) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description VARCHAR(2000),
            location_text VARCHAR(255),
            lat DOUBLE PRECISION,
            lon DOUBLE PRECISION,
            raised_at TIMESTAMPTZ NOT NULL,
            acknowledged_by VARCHAR(36) REFERENCES users(id),
            acknowledged_at TIMESTAMPTZ,
            resolved_at TIMESTAMPTZ,
            escalation_level INTEGER NOT NULL DEFAULT 0
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS incident_updates (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            incident_id VARCHAR(36) NOT NULL REFERENCES incidents(id),
            user_id VARCHAR(36) NOT NULL REFERENCES users(id),
            note VARCHAR(1000),
            status_change VARCHAR(30)
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS alerts (
            id VARCHAR(36) PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id),
            created_by VARCHAR(36) REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            type VARCHAR(30) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            message VARCHAR(1000) NOT NULL,
            entity_type VARCHAR(50),
            entity_id VARCHAR(36),
            dedupe_key VARCHAR(255) NOT NULL UNIQUE,
            resolved_at TIMESTAMPTZ
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sync_receipts (
            id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            idempotency_key VARCHAR(100) NOT NULL UNIQUE,
            user_id VARCHAR(36) REFERENCES users(id),
            result JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    op.execute(
        """
        ALTER TABLE change_log
            ADD COLUMN IF NOT EXISTS data JSONB,
            ADD COLUMN IF NOT EXISTS serialized_data JSONB
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_change_log_station_id
        ON change_log (station_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_change_log_entity
        ON change_log (entity_type, entity_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_consignments_station_id
        ON consignments (station_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_consignments_status
        ON consignments (status)
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS alerts CASCADE")
    op.execute("DROP TABLE IF EXISTS incident_updates CASCADE")
    op.execute("DROP TABLE IF EXISTS incidents CASCADE")
    op.execute("DROP TABLE IF EXISTS maintenance_records CASCADE")
    op.execute("DROP TABLE IF EXISTS assets CASCADE")
    op.execute("DROP TABLE IF EXISTS check_ins CASCADE")
    op.execute("DROP TABLE IF EXISTS personnel CASCADE")
    op.execute("DROP TABLE IF EXISTS stock_movements CASCADE")
    op.execute("DROP TABLE IF EXISTS inventory_items CASCADE")
    op.execute("DROP TABLE IF EXISTS custody_scans CASCADE")
    op.execute("DROP TABLE IF EXISTS consignment_items CASCADE")
    op.execute("DROP TABLE IF EXISTS sync_receipts CASCADE")
