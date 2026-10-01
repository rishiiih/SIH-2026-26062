import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/dexie';
import syncEngine from '../sync/sync-engine';

export default function SyncConflicts() {
  // Live query listening to outbox records marked with status === 'conflict'
  const conflicts = useLiveQuery(
    async () => {
      if (!db || !db.outbox) return [];
      return await db.outbox.where('status').equals('conflict').toArray();
    },
    [],
    []
  );

  // Re-queue local mutation to override server version
  const handleForceLocal = async (conflict) => {
    try {
      await db.outbox.update(conflict.id, {
        status: 'pending',
        updated_at: new Date().toISOString()
      });

      // Optionally trigger immediate sync if online
      if (navigator.onLine) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.id) {
          syncEngine.sync(user.id);
        }
      }
    } catch (err) {
      console.error('Failed to force local mutation:', err);
    }
  };

  // Discard local change: delete from outbox & purge local optimistic record
  const handleDiscardLocal = async (conflict) => {
    try {
      await db.transaction('rw', db.outbox, db[conflict.entity_type], async () => {
        // Delete outbox entry
        await db.outbox.delete(conflict.id);

        // Delete local entity record if ID is known
        if (conflict.entity_id && db[conflict.entity_type]) {
          await db[conflict.entity_type].delete(conflict.entity_id);
        }
      });

      // Pull latest server copy to replace discarded local version
      if (navigator.onLine) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.id) {
          syncEngine.pullChanges(user.id);
        }
      }
    } catch (err) {
      console.error('Failed to discard local conflict:', err);
    }
  };

  return (
    <div className="p-gutter-lg max-w-6xl mx-auto space-y-space-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-space-xs">
        <div>
          <h1 className="font-title-lg text-title-lg text-on-surface">Sync Conflict Resolution</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Review and resolve state mismatches between local offline writes and Central Command.
          </p>
        </div>
        <div className="px-space-md py-space-xs bg-error-container text-on-error-container font-label-md text-label-md rounded-sm">
          {conflicts.length} Active {conflicts.length === 1 ? 'Conflict' : 'Conflicts'}
        </div>
      </div>

      {/* Conflict List */}
      {conflicts.length === 0 ? (
        <div className="p-space-xl bg-surface-container-low border border-outline-variant rounded-sm text-center">
          <span className="material-symbols-outlined text-[48px] text-emerald-600 mb-space-xs">
            check_circle
          </span>
          <h2 className="font-title-md text-title-md text-on-surface">No Pending Conflicts</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            All offline actions have been cleanly synchronized with the central database.
          </p>
        </div>
      ) : (
        <div className="space-y-space-sm">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="p-space-md bg-surface-container-low border border-error/30 rounded-sm space-y-space-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-error text-[20px]">
                    warning
                  </span>
                  <span className="font-data-mono-md text-title-sm text-on-surface uppercase">
                    Entity: {conflict.entity_type}
                  </span>
                  <span className="text-outline-variant">|</span>
                  <span className="font-data-mono-md text-body-sm text-on-surface-variant">
                    Operation: {conflict.operation || 'UPDATE'}
                  </span>
                </div>
                <span className="font-data-mono-md text-body-sm text-on-surface-variant">
                  {new Date(conflict.device_timestamp).toLocaleString()}
                </span>
              </div>

              {/* Conflict Payloads */}
              <div className="grid grid-cols-2 gap-space-sm text-body-sm font-data-mono-md">
                <div className="p-space-xs bg-surface-container-lowest border border-outline-variant rounded-sm">
                  <span className="text-on-surface-variant font-medium block mb-1">Local Value (Pending)</span>
                  <pre className="text-xs overflow-x-auto text-on-surface">
                    {JSON.stringify(conflict.payload || conflict.data || {}, null, 2)}
                  </pre>
                </div>
                <div className="p-space-xs bg-surface-container-lowest border border-outline-variant rounded-sm">
                  <span className="text-on-surface-variant font-medium block mb-1">Server Reason / Error</span>
                  <pre className="text-xs overflow-x-auto text-error">
                    {conflict.error_message || 'Version mismatch on remote sync.'}
                  </pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-space-xs pt-space-xs border-t border-outline-variant">
                <button
                  onClick={() => handleForceLocal(conflict)}
                  className="h-8 px-space-md bg-primary text-on-primary font-title-sm text-title-sm rounded-sm hover:opacity-90 transition-opacity"
                  type="button"
                >
                  Force Local Save
                </button>
                <button
                  onClick={() => handleDiscardLocal(conflict)}
                  className="h-8 px-space-md bg-surface-container-lowest border border-outline text-error font-title-sm text-title-sm rounded-sm hover:bg-error-container hover:text-on-error-container transition-colors"
                  type="button"
                >
                  Discard Local
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}