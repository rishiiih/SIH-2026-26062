import Dexie from 'dexie';

const db = new Dexie('DHRUV-Offline-DB');

// Define database schema
db.version(1).stores({
  // User data
  users: 'id, username, email, role_id, station_id, is_active',
  roles: 'id, name',
  permissions: 'id, name, resource, action',
  stations: 'id, name, code, region, is_active',

  // Sync outbox
  outbox: '++id, user_id, device_id, entity_type, status, device_timestamp',

  // Local cache for offline access
  consignments: 'id, consignment_number, status, destination_station_id',
  consignment_items: 'id, consignment_id',
  custody_scans: 'id, consignment_id, scan_timestamp',
  inventory_items: 'id, name, category',
  inventory_batches: 'id, item_id, batch_number, location_id, expiry_date',
  stock_movements: 'id, batch_id, movement_type, server_timestamp',
  assets: 'id, asset_number, status, location_id',
  personnel: 'id, current_station_id',
  incidents: 'id, status, station_id, raised_at',

  // Audit log (local)
  audit_log: 'id, user_id, entity_type, entity_id, server_timestamp'
});

export default db;
