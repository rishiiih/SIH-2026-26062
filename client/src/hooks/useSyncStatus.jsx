import {
  useEffect,
  useState,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import db from '../db/dexie';
import outbox from '../sync/outbox';
import syncEngine from '../sync/sync-engine';
import { authService } from '../services/auth';


export default function useSyncStatus() {
  const user = authService.getUser();
  const userId = user?.id || null;

  const [engineStatus, setEngineStatus] =
    useState(syncEngine.getStatus());

  const pendingCount = useLiveQuery(
    async () => {
      if (!userId) {
        return 0;
      }

      return outbox.getPendingCount(userId);
    },
    [userId],
    0
  );

  const conflictCount = useLiveQuery(
    async () => {
      if (!db.sync_conflicts) {
        return 0;
      }

      return db.sync_conflicts.count();
    },
    [],
    0
  );

  const failedCount = useLiveQuery(
  async () => {
    if (!userId) {
      return 0;
    }

    return outbox.getFailedCount(userId);
  },
  [userId],
  0
);

  useEffect(() => {
    return syncEngine.subscribe(
      (status) => {
        setEngineStatus(status);
      }
    );
  }, []);

  return {
    isOnline: engineStatus.isOnline,
    pendingCount,
    conflictCount,
    failedCount,
    lastSyncTime: engineStatus.lastSyncTime,
    syncing: engineStatus.syncing,
  };
}