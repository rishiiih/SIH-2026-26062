import db from '../db/dexie';
import Dexie from 'dexie';

class Outbox {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('device-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device-id', deviceId);
    }
    return deviceId;
  }

  async addMutation(userId, entityType, entityId, operation, payload) {
    const idempotencyKey = `${this.deviceId}-${entityType}-${entityId}-${Date.now()}`;

    await db.outbox.add({
      user_id: userId,
      device_id: this.deviceId,
      entity_type: entityType,
      entity_id: entityId,
      operation: operation,
      payload: payload,
      idempotency_key: idempotencyKey,
      status: 'pending',
      device_timestamp: new Date().toISOString(),
      server_timestamp: null,
      error_message: null,
      retry_count: 0,
      created_at: new Date().toISOString()
    });

    return idempotencyKey;
  }

  async getPendingMutations(userId) {
    const pending = await db.outbox
      .where('user_id')
      .equals(userId)
      .and(item => item.status === 'pending')
      .toArray();

    // Task 2.2 Priority Queue Sorting:
    // Move all 'incidents' mutations to index 0, followed by standard mutations ordered by timestamp
    return pending.sort((a, b) => {
      if (a.entity_type === 'incidents' && b.entity_type !== 'incidents') return -1;
      if (a.entity_type !== 'incidents' && b.entity_type === 'incidents') return 1;
      return new Date(a.device_timestamp) - new Date(b.device_timestamp);
    });
  }

  async markAsSent(outboxId) {
    await db.outbox.update(outboxId, {
      status: 'sent',
      updated_at: new Date().toISOString()
    });
  }

  async markAsAcked(outboxId) {
    await db.outbox.update(outboxId, {
      status: 'acked',
      server_timestamp: new Date().toISOString()
    });
  }

  async markAsFailed(outboxId, errorMessage) {
    await db.outbox.update(outboxId, {
      status: 'failed',
      error_message: errorMessage,
      retry_count: Dexie.increment(1),
      updated_at: new Date().toISOString()
    });
  }

  async markAsConflict(outboxId) {
    await db.outbox.update(outboxId, {
      status: 'conflict',
      updated_at: new Date().toISOString()
    });
  }

  async getPendingCount(userId) {
    return await db.outbox
      .where('user_id')
      .equals(userId)
      .and(item => item.status === 'pending')
      .count();
  }

  async clearAckedMutations(userId) {
    await db.outbox
      .where('user_id')
      .equals(userId)
      .and(item => item.status === 'acked')
      .delete();
  }
}

export default new Outbox();