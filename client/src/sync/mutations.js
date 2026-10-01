import db from '../db/dexie';
import outbox from './outbox';

/**
 * Universal save-and-queue helper for offline-first operations.
 *
 * @param {string} entityType - Dexie table name (e.g. 'incidents', 'consignments')
 * @param {Object} record - The full entity object to save locally
 * @param {string} operation - Mutation type: 'CREATE' | 'UPDATE' | 'DELETE'
 */
export async function saveAndQueue(entityType, record, operation = 'CREATE') {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || 'test-user'; // Fallback to 'test-user' if user.id is missing

  return await db.transaction('rw', [db[entityType], db.outbox], async () => {
    if (operation.toUpperCase() === 'DELETE') {
      await db[entityType].delete(record.id);
    } else {
      await db[entityType].put(record);
    }

    const idempotencyKey = await outbox.addMutation(
      userId, // Ensure userId is passed correctly here
      entityType,
      record.id,
      operation.toUpperCase(),
      record
    );

    return { record, idempotencyKey };
  });
}