import { useLiveQuery } from 'dexie-react-hooks';

import db from '../db/dexie';
import outbox from '../sync/outbox';
import syncEngine from '../sync/sync-engine';
import { authService } from '../services/auth';


export default function SyncConflicts() {
  const user = authService.getUser();
  const userId = user?.id || null;

  const conflicts = useLiveQuery(
    async () => {
      if (!db.sync_conflicts) {
        return [];
      }

      return db.sync_conflicts
        .orderBy('id')
        .reverse()
        .toArray();
    },
    [],
    []
  );

  const queueItems = useLiveQuery(
    async () => {
      if (!userId) {
        return [];
      }

      const items =
        await outbox.getUserItems(userId);

      return items
        .filter(
          (item) =>
            item.status === 'pending' ||
            item.status === 'failed' ||
            item.status === 'conflict'
        )
        .sort((first, second) => {
          return (
            new Date(second.created_at) -
            new Date(first.created_at)
          );
        });
    },
    [userId],
    []
  );

  const handleKeepMine = async (conflict) => {
    const mutation =
      await db.outbox.get(conflict.outbox_id);

    if (!mutation) {
      await db.sync_conflicts.delete(
        conflict.id
      );
      return;
    }

    const serverVersion =
      conflict.server?.version ??
      conflict.server?.server_version ??
      0;

    const localPayload = {
      ...(conflict.local ||
        mutation.payload ||
        {}),
      base_version: serverVersion,
    };

    await db.outbox.update(
      mutation.id,
      {
        payload: localPayload,
        base_version: serverVersion,
        status: 'pending',
        error_message: null,
        next_attempt_at: null,
        updated_at: new Date().toISOString(),
      }
    );

    await db.sync_conflicts.delete(
      conflict.id
    );

    if (navigator.onLine && userId) {
      await syncEngine.sync(userId);
    }
  };

  const handleKeepServer = async (conflict) => {
    const mutation =
      await db.outbox.get(conflict.outbox_id);

    const tableName =
      syncEngine.getTableName(
        conflict.entity_type
      );

    await db.transaction(
      'rw',
      [
        db.outbox,
        db.sync_conflicts,
        db[tableName],
      ],
      async () => {
        if (
          conflict.server &&
          db[tableName]
        ) {
          await db[tableName].put(
            conflict.server
          );
        }

        if (mutation) {
          await db.outbox.delete(
            mutation.id
          );
        }

        await db.sync_conflicts.delete(
          conflict.id
        );
      }
    );

    if (navigator.onLine && userId) {
      await syncEngine.pullChanges(userId);
    }
  };

  return (
    <div className="p-gutter-lg max-w-6xl mx-auto space-y-space-md">
      <div className="flex items-center justify-between border-b border-outline-variant pb-space-xs">
        <div>
          <h1 className="font-title-lg text-title-lg text-on-surface">
            Sync Conflict Resolution
          </h1>

          <p className="font-body-md text-body-md text-on-surface-variant">
            Compare local offline changes with server data.
          </p>
        </div>

        <div className="px-space-md py-space-xs bg-error-container text-on-error-container font-label-md text-label-md rounded-sm">
          {conflicts.length}{' '}
          {conflicts.length === 1
            ? 'Conflict'
            : 'Conflicts'}
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="p-space-xl bg-surface-container-low border border-outline-variant rounded-sm text-center">
          <span className="material-symbols-outlined text-[48px] text-emerald-600 mb-space-xs">
            check_circle
          </span>

          <h2 className="font-title-md text-title-md text-on-surface">
            No Pending Conflicts
          </h2>

          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            All offline actions are synchronized.
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
                <div>
                  <div className="font-data-mono-md text-title-sm text-on-surface uppercase">
                    {conflict.entity_type}
                  </div>

                  <div className="font-data-mono-md text-body-sm text-on-surface-variant">
                    {conflict.operation}
                  </div>
                </div>

                <span className="font-data-mono-md text-body-sm text-on-surface-variant">
                  {conflict.created_at
                    ? new Date(
                        conflict.created_at
                      ).toLocaleString()
                    : 'Unknown time'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                <div className="p-space-sm bg-surface-container-lowest border border-outline-variant rounded-sm">
                  <h3 className="font-title-sm text-on-surface mb-space-xs">
                    Local change
                  </h3>

                  <pre className="text-xs overflow-x-auto text-on-surface">
                    {JSON.stringify(
                      conflict.local || {},
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="p-space-sm bg-surface-container-lowest border border-outline-variant rounded-sm">
                  <h3 className="font-title-sm text-on-surface mb-space-xs">
                    Server change
                  </h3>

                  <pre className="text-xs overflow-x-auto text-on-surface">
                    {JSON.stringify(
                      conflict.server || {
                        error:
                          conflict.error_message ||
                          'No server record returned',
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end gap-space-xs pt-space-xs border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() =>
                    handleKeepMine(conflict)
                  }
                  className="h-8 px-space-md bg-primary text-on-primary rounded-sm"
                >
                  Keep mine
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleKeepServer(conflict)
                  }
                  className="h-8 px-space-md bg-surface-container-lowest border border-outline text-error rounded-sm"
                >
                  Keep server
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="p-space-md bg-surface-container-low border border-outline-variant rounded-sm">
        <h2 className="font-title-md text-title-md text-on-surface mb-space-sm">
          Mutation Queue
        </h2>

        {queueItems.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">
            No pending queue items.
          </p>
        ) : (
          <div className="space-y-space-xs">
            {queueItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-space-sm bg-surface-container-lowest border border-outline-variant rounded-sm"
              >
                <div>
                  <div className="font-data-mono-md text-body-sm text-on-surface">
                    {item.entity_type} / {item.operation}
                  </div>

                  <div className="text-xs text-on-surface-variant">
                    Retry count: {item.retry_count || 0}
                  </div>
                </div>

                <span className="font-data-mono-md text-body-sm text-on-surface-variant uppercase">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}