import api from '../services/api';
import outbox from './outbox';
import db from '../db/dexie';
import { authService } from '../services/auth';

class SyncEngine {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncInterval = null;

    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    this.isOnline = true;
    const user = authService.getUser();
    if (user?.id) {
      this.sync(user.id);
    }
  }

  handleOffline() {
    this.isOnline = false;
  }

  async sync(userId = authService.getUser()?.id) {
    if (!userId || this.syncInProgress || !this.isOnline) {
      return;
    }

    try {
      await api.get('/api/health');
    } catch (err) {
      console.warn('Sync aborted: backend health check failed');
      return;
    }

    this.syncInProgress = true;

    try {
      await this.pushMutations(userId);
      await this.pullChanges(userId);

      this.lastSyncTime = new Date().toISOString();
    } catch (error) {
      console.error('Sync cycle execution error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async pushMutations(userId) {
    const pendingMutations = await outbox.getPendingMutations(userId);
    if (!pendingMutations || pendingMutations.length === 0) {
      return;
    }

    // Sort by priority before sending to the backend
    pendingMutations.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    try {
      const response = await api.post('/api/sync/push', {
        mutations: pendingMutations,
        device_id: localStorage.getItem('device_id') || 'browser-client'
      });

      if (response.data?.results) {
        for (const result of response.data.results) {
          if (result.success) {
            await outbox.markAsAcked(result.outbox_id);
          } else if (result.conflict) {
            await outbox.markAsConflict(result.outbox_id);
          } else {
            await outbox.markAsFailed(result.outbox_id, result.error);
          }
        }
      }

      await outbox.clearAckedMutations(userId);
    } catch (error) {
      console.error('Push execution failed:', error);
      throw error;
    }
  }

  async pullChanges(userId) {
    const cursorKey = `sync_cursor_${userId}`;
    const cursor = localStorage.getItem(cursorKey) || '0';

    try {
      const response = await api.post('/api/sync/pull', { cursor });
      const { changes, new_cursor } = response.data || {};

      if (Array.isArray(changes)) {
        for (const change of changes) {
          await this.applyChange(change);
        }
      }

      if (new_cursor) {
        localStorage.setItem(cursorKey, new_cursor);
      }
    } catch (error) {
      console.error('Pull execution failed:', error);
      throw error;
    }
  }

  async applyChange(change) {
    const { entity_type, operation, data } = change;
    const tableName = this.getTableName(entity_type);

    if (!tableName || !db[tableName]) {
      console.warn('No local Dexie table mapping found for entity:', entity_type);
      return;
    }

    if (operation === 'create' || operation === 'update') {
      await db[tableName].put(data);
    } else if (operation === 'delete' && data?.id) {
      await db[tableName].delete(data.id);
    }
  }

  getTableName(entityType) {
    const mapping = {
      'user': 'users',
      'station': 'stations',
      'consignment': 'consignments',
      'consignment_item': 'consignment_items',
      'custody_scan': 'custody_scans',
      'inventory_item': 'inventory_items',
      'stock_movement': 'stock_movements',
      'asset': 'assets',
      'maintenance_record': 'maintenance_records',
      'personnel': 'personnel',
      'check_in': 'check_ins',
      'incident': 'incidents',
      'incident_update': 'incident_updates',
      'alert': 'alerts'
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

const syncEngine = new SyncEngine();
export default syncEngine;