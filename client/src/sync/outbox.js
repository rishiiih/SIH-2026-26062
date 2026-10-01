import Dexie from 'dexie';

import db from '../db/dexie';

const RETRY_DELAYS = [
  5000,
  15000,
  60000,
  180000,
  300000,
];


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

  async addMutation(
    userId,
    entityType,
    entityId,
    operation,
    payload,
    {
      priority = 0,
      baseVersion = 0,
    } = {}
  ) {
    const idempotencyKey = [
      this.deviceId,
      entityType,
      entityId,
      Date.now(),
    ].join('-');

    await db.outbox.add({
      user_id: userId,
      device_id: this.deviceId,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      payload,
      base_version: baseVersion,
      idempotency_key: idempotencyKey,
      priority,
      status: 'pending',
      device_timestamp: new Date().toISOString(),
      server_timestamp: null,
      next_attempt_at: null,
      error_message: null,
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return idempotencyKey;
  }

  async getPendingMutations(userId) {
    const now = Date.now();

    const records = await db.outbox
      .where('user_id')
      .equals(userId)
      .and((item) => {
        const eligibleStatus =
          item.status === 'pending' ||
          item.status === 'failed';

        const nextAttempt =
          item.next_attempt_at
            ? new Date(item.next_attempt_at).getTime()
            : 0;

        return (
          eligibleStatus &&
          nextAttempt <= now
        );
      })
      .toArray();

    return records.sort((first, second) => {
      const priorityDifference =
        (second.priority || 0) -
        (first.priority || 0);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        new Date(first.created_at).getTime() -
        new Date(second.created_at).getTime()
      );
    });
  }

  async getUserItems(userId) {
    return db.outbox
      .where('user_id')
      .equals(userId)
      .toArray();
  }

  async markAsSent(outboxId) {
    await db.outbox.update(outboxId, {
      status: 'sent',
      updated_at: new Date().toISOString(),
    });
  }

  async markAsAcked(outboxId) {
    await db.outbox.update(outboxId, {
      status: 'acked',
      server_timestamp: new Date().toISOString(),
      next_attempt_at: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    });
  }

  async markAsFailed(
    outboxId,
    errorMessage
  ) {
    const item = await db.outbox.get(outboxId);

    if (!item) {
      return;
    }

    const retryCount =
      (item.retry_count || 0) + 1;

    const delay =
      RETRY_DELAYS[
        Math.min(
          retryCount - 1,
          RETRY_DELAYS.length - 1
        )
      ];

    const nextAttemptAt =
      new Date(Date.now() + delay).toISOString();

    await db.outbox.update(outboxId, {
      status: 'failed',
      error_message: errorMessage,
      retry_count: retryCount,
      next_attempt_at: nextAttemptAt,
      updated_at: new Date().toISOString(),
    });
  }

  async markAsConflict(outboxId) {
    await db.outbox.update(outboxId, {
      status: 'conflict',
      next_attempt_at: null,
      updated_at: new Date().toISOString(),
    });
  }

  async getPendingCount(userId) {
    return db.outbox
      .where('user_id')
      .equals(userId)
      .and(
        (item) =>
          item.status === 'pending' ||
          item.status === 'failed'
      )
      .count();
  }

  async clearAckedMutations(userId) {
    await db.outbox
      .where('user_id')
      .equals(userId)
      .and((item) => item.status === 'acked')
      .delete();
  }
}


export default new Outbox();