import Dexie from 'dexie';

const db = new Dexie('DHRUV-Offline-DB');

// Define database schema
db.version(1).stores({
  // Phase 1: Base
  users: 'id, username, email, role_id, station_id, is_active, version, updated_at',
  roles: 'id, name',
  permissions: 'id, name, resource, action',
  stations: 'id, name, code, region, is_active, version, updated_at',

  // Phase 2: Cargo & Inventory
  consignments: 'id, station_id, status, priority, version, updated_at',
  consignment_items: 'id, consignment_id, version, updated_at',
  custody_scans: 'id, consignment_id, station_id, version, updated_at',
  inventory_items: 'id, station_id, category, version, updated_at',
  stock_movements: 'id, item_id, station_id, movement_type, version, updated_at',

  // Phase 4: People & Assets
  personnel: 'id, station_id, role, status, version, updated_at',
  check_ins: 'id, personnel_id, station_id, version, updated_at',
  assets: 'id, station_id, status, version, updated_at',
  maintenance_records: 'id, asset_id, station_id, version, updated_at',

  // Phase 5: Emergency
  incidents: 'id, station_id, status, severity, version, updated_at',
  incident_updates: 'id, incident_id, station_id, version, updated_at',

  // Sync state
  outbox: '++id, user_id, device_id, entity_type, status, device_timestamp',
  audit_log: 'id, user_id, entity_type, entity_id, server_timestamp',
  change_log: 'seq, entity_type, entity_id, station_id, operation'
});

export default db;
