import Dexie from 'dexie';

const db = new Dexie('DHRUV-Offline-DB');

// Version 1 Schema (Preserved for migration history)
db.version(1).stores({
  users: 'id, username, email, role_id, station_id, is_active, version, updated_at',
  roles: 'id, name',
  permissions: 'id, name, resource, action',
  stations: 'id, name, code, region, is_active, version, updated_at',
  consignments: 'id, station_id, status, priority, version, updated_at',
  consignment_items: 'id, consignment_id, version, updated_at',
  custody_scans: 'id, consignment_id, station_id, version, updated_at',
  inventory_items: 'id, station_id, category, version, updated_at',
  stock_movements: 'id, item_id, station_id, movement_type, version, updated_at',
  personnel: 'id, station_id, role, status, version, updated_at',
  check_ins: 'id, personnel_id, station_id, version, updated_at',
  assets: 'id, station_id, status, version, updated_at',
  maintenance_records: 'id, asset_id, station_id, version, updated_at',
  incidents: 'id, station_id, status, severity, version, created_at, updated_at',
  incident_updates: 'id, incident_id, station_id, version, updated_at',
  outbox: '++id, user_id, device_id, entity_type, status, device_timestamp',
  audit_log: 'id, user_id, entity_type, entity_id, server_timestamp',
  change_log: 'seq, entity_type, entity_id, station_id, operation'
});

// Version 2 Schema (Adds Cache and Conflict Tracking Stores)
db.version(2).stores({
  // Retain all existing stores from version 1
  users: 'id, username, email, role_id, station_id, is_active, version, updated_at',
  roles: 'id, name',
  permissions: 'id, name, resource, action',
  stations: 'id, name, code, region, is_active, version, updated_at',
  consignments: 'id, station_id, status, priority, version, updated_at',
  consignment_items: 'id, consignment_id, version, updated_at',
  custody_scans: 'id, consignment_id, station_id, version, updated_at',
  inventory_items: 'id, station_id, category, version, updated_at',
  stock_movements: 'id, item_id, station_id, movement_type, version, updated_at',
  personnel: 'id, station_id, role, status, version, updated_at',
  check_ins: 'id, personnel_id, station_id, version, updated_at',
  assets: 'id, station_id, status, version, updated_at',
  maintenance_records: 'id, asset_id, station_id, version, updated_at',
  incidents: 'id, station_id, status, severity, version, created_at, updated_at',
  incident_updates: 'id, incident_id, station_id, version, updated_at',
  outbox: '++id, user_id, device_id, entity_type, status, device_timestamp',
  audit_log: 'id, user_id, entity_type, entity_id, server_timestamp',
  change_log: 'seq, entity_type, entity_id, station_id, operation',

  // Added in Version 2:
  cache: 'key', // Primary key 'key' for caching key-value JSON objects (weather, summary)
  sync_conflicts: '++id, entity_type, entity_id' // Stores server/client sync conflict records
});

export default db;