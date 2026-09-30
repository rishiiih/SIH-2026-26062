import api from '../services/api';
import outbox from './outbox';
import db from '../db/dexie';

class SyncEngine {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncInterval = null;

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    this.isOnline = true;
    console.log('Network online - initiating sync');
    
    // Fetch the userId from local storage to ensure the sync has the required parameter
    const userId = localStorage.getItem('user-id');
    if (userId) {
      this.sync(userId);
    }
  }

  handleOffline() {
    this.isOnline = false;
    console.log('Network offline - sync paused');
  }

  async sync(userId) {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Push pending mutations
      await this.pushMutations(userId);

      // Pull changes from server
      await this.pullChanges(userId);

      this.lastSyncTime = new Date().toISOString();
      console.log('Sync completed at:', this.lastSyncTime);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async pushMutations(userId) {
    const pendingMutations = await outbox.getPendingMutations(userId);

    if (pendingMutations.length === 0) {
      return;
    }

    console.log(`Pushing ${pendingMutations.length} mutations`);

    try {
      // Swapped bare axios for our authenticated api instance
      const response = await api.post('/api/sync/push', {
        mutations: pendingMutations,
        device_id: outbox.deviceId
      });

      // Process results
      for (const result of response.data.results) {
        if (result.success) {
          await outbox.markAsAcked(result.outbox_id);
        } else if (result.conflict) {
          await outbox.markAsConflict(result.outbox_id);
        } else {
          await outbox.markAsFailed(result.outbox_id, result.error);
        }
      }

      // Clear acked mutations
      await outbox.clearAckedMutations(userId);
    } catch (error) {
      console.error('Push failed:', error);
      throw error;
    }
  }

  async pullChanges(userId) {
    const cursor = localStorage.getItem('sync-cursor') || '0';

    try {
      // Swapped bare axios for our authenticated api instance
      const response = await api.post('/api/sync/pull', {
        cursor: cursor,
        user_id: userId
      });

      const { changes, new_cursor } = response.data;

      // Apply changes to local database
      for (const change of changes) {
        await this.applyChange(change);
      }

      // Update cursor
      localStorage.setItem('sync-cursor', new_cursor);
    } catch (error) {
      console.error('Pull failed:', error);
      throw error;
    }
  }

  async applyChange(change) {
    const { entity_type, operation, data } = change;
    const tableName = this.getTableName(entity_type);

    if (!tableName) {
      console.warn('Unknown entity type:', entity_type);
      return;
    }

    if (operation === 'create' || operation === 'update') {
      await db[tableName].put(data);
    } else if (operation === 'delete') {
      await db[tableName].delete(data.id);
    }
  }

  getTableName(entityType) {
    const mapping = {
      'user': 'users',
      'role': 'roles',
      'permission': 'permissions',
      'station': 'stations',
      'consignment': 'consignments',
      'consignment_item': 'consignment_items',
      'custody_scan': 'custody_scans',
      'inventory_item': 'inventory_items',
      'inventory_batch': 'inventory_batches',
      'stock_movement': 'stock_movements',
      'asset': 'assets',
      'personnel': 'personnel',
      'incident': 'incidents',
      'audit_log': 'audit_log'
    };
    return mapping[entityType];
  }

  startAutoSync(userId, intervalMs = 60000) {
    this.stopAutoSync();
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.sync(userId);
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async getSyncStatus(userId) {
    const pendingCount = await outbox.getPendingCount(userId);
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      pendingCount
    };
  }
}

export default new SyncEngine();