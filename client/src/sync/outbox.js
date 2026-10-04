import db from '../db/dexie';
import { SOS_THRESHOLD } from './priorities';

const RETRY_DELAYS = [
  5000,
  15000,
  60000,
  180000,
  300000,
];

// SOS fast-lane: aggressive retry at 2s, 3s, 5s
const SOS_RETRY_DELAYS = [2000, 3000, 5000];


class Outbox {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('device-id');

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(
        'device-id',
        deviceId
      );
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

  async getPendingMutations(
    userId,
    { forceRetry = false } = {}
  ) {
    const now = Date.now();

    const records = await db.outbox
      .where('user_id')
      .equals(userId)
      .and((item) => {
        const eligible =
          item.status === 'pending' ||
          item.status === 'failed';

        if (!eligible) {
          return false;
        }

        if (forceRetry) {
          return true;
        }

        const nextAttempt =
          item.next_attempt_at
            ? new Date(
                item.next_attempt_at
              ).getTime()
            : 0;

        return nextAttempt <= now;
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

  async markAsAcked(outboxId) {
    await db.outbox.update(outboxId, {
      status: 'acked',
      server_timestamp: new Date().toISOString(),
      next_attempt_at: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    });
  }

  async markForRetry(
    outboxId,
    errorMessage
  ) {
    const item = await db.outbox.get(outboxId);

    if (!item) {
      return;
    }

    const retryCount =
      (item.retry_count || 0) + 1;

    // SOS fast lane: use aggressive retry schedule
    const isSos = (item.priority || 0) >= SOS_THRESHOLD;
    const delays = isSos ? SOS_RETRY_DELAYS : RETRY_DELAYS;

    const delay =
      delays[
        Math.min(
          retryCount - 1,
          delays.length - 1
        )
      ];

    await db.outbox.update(outboxId, {
      status: 'pending',
      error_message: errorMessage,
      retry_count: retryCount,
      next_attempt_at: new Date(
        Date.now() + delay
      ).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async markAsFailed(
    outboxId,
    errorMessage
  ) {
    await db.outbox.update(outboxId, {
      status: 'failed',
      error_message: errorMessage,
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
        (item) => item.status === 'pending'
      )
      .count();
  }

  async getFailedCount(userId) {
    return db.outbox
      .where('user_id')
      .equals(userId)
      .and(
        (item) => item.status === 'failed'
      )
      .count();
  }

  async clearAckedMutations(userId) {
    await db.outbox
      .where('user_id')
      .equals(userId)
      .and(
        (item) => item.status === 'acked'
      )
      .delete();
  }

  /**
   * Check whether a priority value qualifies for SOS fast-lane.
   * @param {number} priority
   * @returns {boolean}
   */
  isSosPriority(priority) {
    return (priority || 0) >= SOS_THRESHOLD;
  }
}


export default new Outbox();