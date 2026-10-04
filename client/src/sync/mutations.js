import db from '../db/dexie';
import outbox from './outbox';
import { authService } from '../services/auth';

const listeners = new Set();

export function subscribeToMutations(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(mutationData) {
  listeners.forEach((listener) => {
    try {
      listener(mutationData);
    } catch (error) {
      console.error(
        'Error in mutation listener:',
        error
      );
    }
  });
}

function getTableName(entityType) {
  const mapping = {
    user: 'users',
    station: 'stations',
    consignment: 'consignments',
    consignment_item: 'consignment_items',
    custody_scan: 'custody_scans',
    inventory_item: 'inventory_items',
    stock_movement: 'stock_movements',
    asset: 'assets',
    maintenance_record: 'maintenance_records',
    personnel: 'personnel',
    check_in: 'check_ins',
    incident: 'incidents',
    incidents: 'incidents',
    incident_update: 'incident_updates',
    alert: 'alerts',
    // SOS entity mappings
    muster_entry: 'muster_entries',
    assistance_request: 'assistance_requests',
    station_neighbour: 'station_neighbours',
    sos_delivery: 'sos_delivery',
  };

  return mapping[entityType] || entityType;
}

export async function saveAndQueue(
  entityType,
  record,
  operation = 'create',
  { priority = 0 } = {}
) {
  const user = authService.getUser();
  const userId = user?.id || 'anonymous';

  const stationId =
    record.station_id ||
    user?.station_id ||
    null;

  const recordId =
    record.id ||
    crypto.randomUUID();

  const tableName = getTableName(entityType);
  const table = db[tableName];

  if (!table) {
    throw new Error(
      `No Dexie table found for entity type: ${entityType}`
    );
  }

  const existingRecord = record.id
    ? await table.get(record.id)
    : null;

  const baseVersion =
    operation === 'update'
      ? (
          existingRecord?.version ??
          record.base_version ??
          record.version ??
          0
        )
      : 0;

  const version =
    operation === 'create'
      ? 1
      : (
          existingRecord?.version ??
          record.version ??
          1
        );

  const now = new Date().toISOString();

  const processedRecord = {
    ...record,
    id: recordId,
    station_id: stationId,
    version,
    updated_at: now,
  };

  const payload = {
    ...processedRecord,
    base_version: baseVersion,
  };

  let idempotencyKey;

  await db.transaction(
    'rw',
    [table, db.outbox],
    async () => {
      if (operation === 'delete') {
        await table.delete(recordId);
      } else {
        await table.put(processedRecord);
      }

      idempotencyKey = await outbox.addMutation(
        userId,
        entityType,
        recordId,
        operation,
        payload,
        {
          priority,
          baseVersion,
        }
      );
    }
  );

  const mutationData = {
    entityType,
    entityId: recordId,
    operation,
    payload,
    idempotencyKey,
  };

  notifyListeners(mutationData);

  return mutationData;
}