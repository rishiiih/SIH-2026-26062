import api from '../services/api';
import db from '../db/dexie';
import outbox from './outbox';
import { authService } from '../services/auth';


const PUSH_BATCH_SIZE = 50;
const HEALTH_INTERVAL = 15000;


class SyncEngine {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.healthInterval = null;
    this.listeners = new Set();

    window.addEventListener(
      'online',
      () => this.handleOnline()
    );

    window.addEventListener(
      'offline',
      () => this.handleOffline()
    );

    this.startHealthMonitor();
  }

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    const snapshot = this.getStatus();

    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      syncing: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
    };
  }

  async checkHealth(shouldSync = true) {
    try {
      await api.get('/api/health');

      const wasOffline = !this.isOnline;
      this.isOnline = true;
      this.notify();

      if (shouldSync && wasOffline) {
        const user = authService.getUser();

        if (user?.id) {
          await this.sync(user.id);
        }
      }

      return true;
    } catch {
      this.isOnline = false;
      this.notify();
      return false;
    }
  }

  startHealthMonitor() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }

    this.healthInterval = setInterval(
      () => {
        this.checkHealth(true);
      },
      HEALTH_INTERVAL
    );
  }

  handleOnline() {
    this.isOnline = true;
    this.notify();

    const user = authService.getUser();

    if (user?.id) {
      this.sync(user.id);
    }
  }

  handleOffline() {
    this.isOnline = false;
    this.notify();
  }

  async sync(
    userId = authService.getUser()?.id,
    { forceRetry = false } = {}
  ) {
    if (!userId || this.syncInProgress) {
      return;
    }

    const healthy = await this.checkHealth(false);

    if (!healthy) {
      return;
    }

    this.syncInProgress = true;
    this.notify();

    try {
      await this.pushMutations(
        userId,
        forceRetry
      );

      await this.pullChanges(userId);

      this.lastSyncTime =
        new Date().toISOString();
    } catch (error) {
      console.error(
        'Sync cycle failed:',
        error
      );
    } finally {
      this.syncInProgress = false;
      this.notify();
    }
  }

  async pushMutations(
    userId,
    forceRetry = false
  ) {
    const pendingMutations =
      await outbox.getPendingMutations(
        userId,
        { forceRetry }
      );

    if (!pendingMutations.length) {
      return;
    }

    for (
      let index = 0;
      index < pendingMutations.length;
      index += PUSH_BATCH_SIZE
    ) {
      const batch = pendingMutations.slice(
        index,
        index + PUSH_BATCH_SIZE
      );

      const mutations = batch.map((item) => ({
        id: String(item.id),
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        operation: item.operation,
        payload: item.payload,
        base_version:
          item.base_version ??
          item.payload?.base_version ??
          0,
        idempotency_key: item.idempotency_key,
        device_timestamp: item.device_timestamp,
        priority: item.priority || 0,
      }));

      try {
        const response = await api.post(
          '/api/sync/push',
          {
            device_id: outbox.deviceId,
            mutations,
          }
        );

        const results =
          response.data?.results || [];

        for (const result of results) {
          const outboxItem = batch.find(
            (item) =>
              String(item.id) ===
              String(result.outbox_id)
          );

          if (!outboxItem) {
            continue;
          }

          if (result.success) {
            await this.applySuccessfulPush(
              outboxItem,
              result
            );

            await outbox.markAsAcked(
              outboxItem.id
            );

            continue;
          }

          if (result.conflict) {
            await this.saveConflict(
              outboxItem,
              result
            );

            await outbox.markAsConflict(
              outboxItem.id
            );

            continue;
          }

          await outbox.markAsFailed(
            outboxItem.id,
            result.error ||
              'Server rejected mutation'
          );
        }
      } catch (error) {
        for (const item of batch) {
          await outbox.markForRetry(
            item.id,
            error.message || 'Network error'
          );
        }

        throw error;
      }
    }

    await outbox.clearAckedMutations(userId);
  }

  async applySuccessfulPush(
    outboxItem,
    result
  ) {
    const tableName = this.getTableName(
      outboxItem.entity_type
    );

    if (!db[tableName]) {
      return;
    }

    if (
      outboxItem.operation === 'delete'
    ) {
      const recordId =
        result.record?.id ||
        outboxItem.entity_id;

      if (recordId) {
        await db[tableName].delete(recordId);
      }

      return;
    }

    if (result.record) {
      await db[tableName].put(
        result.record
      );
    }
  }

  async saveConflict(
    outboxItem,
    result
  ) {
    if (!db.sync_conflicts) {
      return;
    }

    await db.sync_conflicts.add({
      outbox_id: outboxItem.id,
      entity_type: outboxItem.entity_type,
      entity_id:
        outboxItem.entity_id ||
        outboxItem.payload?.id,
      operation: outboxItem.operation,
      local: outboxItem.payload,
      server:
        result.server_data ||
        result.server_record ||
        result.record ||
        null,
      error_message:
        result.error ||
        'Version conflict detected',
      created_at: new Date().toISOString(),
    });
  }

  async pullChanges(userId) {
    const cursorKey =
      `sync_cursor_${userId}`;

    let cursor =
      localStorage.getItem(cursorKey) || '0';

    let hasMore = true;

    while (hasMore) {
      const response = await api.post(
        '/api/sync/pull',
        { cursor }
      );

      const data = response.data || {};
      const changes = data.changes || [];

      for (const change of changes) {
        await this.applyChange(change);
      }

      const newCursor =
        data.new_cursor ?? cursor;

      localStorage.setItem(
        cursorKey,
        String(newCursor)
      );

      hasMore =
        Boolean(data.has_more) &&
        String(newCursor) !== String(cursor);

      cursor = String(newCursor);
    }
  }

  async applyChange(change) {
    const {
      entity_type: entityType,
      operation,
      data,
    } = change;

    const tableName =
      this.getTableName(entityType);

    if (
      !tableName ||
      !db[tableName] ||
      !data
    ) {
      return;
    }

    if (
      operation === 'create' ||
      operation === 'update' ||
      operation === 'snapshot'
    ) {
      await db[tableName].put(data);
      return;
    }

    if (
      operation === 'delete' &&
      data.id
    ) {
      await db[tableName].delete(data.id);
    }
  }

  getTableName(entityType) {
    const mapping = {
      user: 'users',
      station: 'stations',
      consignment: 'consignments',
      consignment_item: 'consignment_items',
      custody_scan: 'custody_scans',
      custody_log: 'custody_scans',
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
    };

    return mapping[entityType] || entityType;
  }

  startAutoSync(
    userId,
    intervalMs = 60000
  ) {
    this.stopAutoSync();

    this.syncInterval = setInterval(
      () => {
        if (this.isOnline) {
          this.sync(userId);
        }
      },
      intervalMs
    );

    this.sync(userId);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async getSyncStatus(userId) {
    const pendingCount =
      await outbox.getPendingCount(userId);

    const failedCount =
      await outbox.getFailedCount(userId);

    const conflictCount =
      db.sync_conflicts
        ? await db.sync_conflicts.count()
        : 0;

    return {
      ...this.getStatus(),
      pendingCount,
      failedCount,
      conflictCount,
    };
  }
}


const syncEngine = new SyncEngine();

export default syncEngine;