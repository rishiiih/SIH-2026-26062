# DHRUV Offline Sync Design

## Overview

The sync engine enables the DHRUV application to work offline during satellite blackouts and automatically synchronize data when the connection is restored. This is critical for polar stations where network can be unavailable for weeks.

## Core Principles

1. **Offline-First** - The app works fully offline; sync is a background operation
2. **Idempotent** - Replaying a request must be safe
3. **Conflict-Aware** - Handle concurrent edits gracefully
4. **Transparent** - Users always know the sync status
5. **Audit-Complete** - All sync operations are logged

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Device                            │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   React UI   │◄───│  IndexedDB   │◄───│   Outbox     │  │
│  │              │    │  (Dexie.js)  │    │  (Mutations) │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│         │                   │                   │          │
│         │                   │                   │          │
│         └───────────────────┴───────────────────┘          │
│                              │                              │
│                    Sync Engine (client/src/sync/)           │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               │ Network (when available)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server (Flask)                          │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ /api/sync/   │    │  PostgreSQL  │    │  Audit Log   │  │
│  │    push      │───>│  Database   │    │  (Immutable) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │ /api/sync/   │◄───│  Change Log  │                       │
│  │    pull      │    │  (Cursor)    │                       │
│  └──────────────┘    └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Client Outbox (IndexedDB)

```javascript
{
  id: "auto-increment",
  user_id: "string (UUID)",
  device_id: "string (UUID)",
  entity_type: "string (e.g., 'user', 'consignment')",
  entity_id: "string (UUID)",
  operation: "create | update | delete",
  payload: "object (full entity data)",
  idempotency_key: "string (unique per operation)",
  status: "pending | sent | acked | conflict | failed",
  device_timestamp: "ISO8601",
  server_timestamp: "ISO8601 | null",
  error_message: "string | null",
  retry_count: "integer",
  created_at: "ISO8601"
}
```

### Server Sync Cursor

```sql
CREATE TABLE sync_cursors (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    last_pull_version BIGINT DEFAULT 0,
    last_push_success TIMESTAMP WITH TIME ZONE,
    last_device_id VARCHAR(100)
);
```

### Server Sync Outbox

```sql
CREATE TABLE sync_outbox (
    id UUID PRIMARY KEY,
    user_id UUID,
    device_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL,
    device_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    server_timestamp TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Sync Flow

### Push (Client → Server)

1. **Collect Pending Mutations**
   ```javascript
   const pending = await outbox.getPendingMutations(userId);
   ```

2. **Batch to Server**
   ```javascript
   POST /api/sync/push
   {
     mutations: [...],
     device_id: "device-uuid"
   }
   ```

3. **Server Processes Each Mutation**
   - Check idempotency key (if exists, skip)
   - Validate permissions
   - Apply change to database
   - Write to audit log
   - Return per-item result

4. **Client Updates Outbox**
   - Success → mark as `acked`
   - Conflict → mark as `conflict`
   - Failure → mark as `failed`, increment retry_count

5. **Clean Up**
   - Delete acked mutations from outbox
   - Retry failed mutations on next sync

### Pull (Server → Client)

1. **Client Sends Cursor**
   ```javascript
   POST /api/sync/pull
   {
     cursor: "last-sync-version",
     user_id: "user-uuid"
   }
   ```

2. **Server Queries Changes**
   - Query audit log and tables for changes since cursor
   - Filter by user's role and station permissions
   - Return batch of changes

3. **Client Applies Changes**
   - For each change:
     - If `create` or `update` → put in IndexedDB
     - If `delete` → delete from IndexedDB

4. **Update Cursor**
   - Save new cursor for next sync

## Conflict Resolution

### Ledger Entities (No Conflict)

These entities are append-only, so conflicts cannot occur:
- Stock movements
- Custody scans
- Audit log entries
- Check-ins

**Strategy:** Both versions kept, no conflict resolution needed.

### Editable Records (Version-Based)

These entities can be edited:
- Users
- Consignments
- Inventory items
- Assets
- Personnel
- Expeditions
- Incidents

**Strategy:**
1. Each record has a `version` field (integer)
2. On update, client sends current version
3. Server compares:
   - If versions match → apply update, increment version
   - If versions mismatch → flag conflict

**Conflict Resolution UI:**
- Show both versions to user
- User chooses which to keep
- Or merge manually
- Re-sync after resolution

## Sync Status Bar

Always visible at top of screen:

```
┌─────────────────────────────────────────────────┐
│ 🟢 Online • 3 pending changes • Last sync: 2:30 PM │
└─────────────────────────────────────────────────┘
```

States:
- 🟢 Online - Network available, sync active
- 🔴 Offline - Network unavailable, sync paused
- 🟡 Syncing - Sync in progress
- ⚠️ Conflicts - Manual resolution needed

## Offline Operations

### Creating a Record (Offline)

```javascript
// 1. Generate UUID locally
const id = crypto.randomUUID();

// 2. Save to IndexedDB
await db.users.add({
  id,
  username: 'newuser',
  email: 'user@example.com',
  // ... other fields
});

// 3. Add to outbox
await outbox.addMutation(userId, 'user', id, 'create', userData);

// 4. Update UI to show "pending" status
showStatus('Pending sync');
```

### Reading Data (Offline)

```javascript
// 1. Check IndexedDB first
const localData = await db.users.toArray();

// 2. If data exists, return immediately
if (localData.length > 0) {
  return localData;
}

// 3. If no data, show empty state
return <EmptyState message="No data available offline" />;
```

## Network Events

### Online Event

```javascript
window.addEventListener('online', () => {
  syncEngine.sync(userId);
});
```

### Offline Event

```javascript
window.addEventListener('offline', () => {
  showStatus('Offline - data will sync when connection returns');
});
```

## Performance Considerations

### Batching
- Mutations batched in groups of 50
- Pull changes limited to 1000 per sync
- Compression enabled for payloads

### Incremental Sync
- Cursor-based to avoid full re-sync
- Only changes since last sync transferred
- Efficient for large datasets

### Caching
- Service worker caches static assets
- IndexedDB caches API responses
- Cache invalidation on sync

## Security

### Authentication
- Sync endpoints require valid JWT
- Refresh tokens handled automatically
- Token expiry handled gracefully

### Authorization
- All mutations checked for permissions
- Pull changes scoped by role/station
- Server never sends data user cannot access

### Data Integrity
- Idempotency keys prevent duplicate operations
- Version fields prevent lost updates
- Audit log tracks all changes

## Testing

### Test Scenarios

1. **Basic Sync**
   - Create record online
   - Verify sync to server
   - Verify data appears on other clients

2. **Offline Create**
   - Go offline
   - Create record
   - Go online
   - Verify sync

3. **Conflict**
   - Two users edit same record offline
   - Both go online
   - Verify conflict detected
   - Resolve conflict
   - Verify resolution synced

4. **Network Interruption**
   - Start sync
   - Interrupt network
   - Verify partial sync handled
   - Resume network
   - Verify sync completes

5. **Large Dataset**
   - Sync 1000+ records
   - Verify performance
   - Verify no data loss

## Implementation Status

### Client (Complete)
- [x] IndexedDB schema
- [x] Outbox pattern
- [x] Sync engine skeleton
- [x] Network event listeners
- [x] Sync status UI

### Server (Not Started)
- [ ] /api/sync/push endpoint
- [ ] /api/sync/pull endpoint
- [ ] Sync cursor table
- [ ] Change log query logic
- [ ] Conflict detection
- [ ] Idempotency key handling

### Testing (Not Started)
- [ ] Unit tests for sync engine
- [ ] Integration tests for sync endpoints
- [ ] E2E tests for offline scenarios

## Future Enhancements

1. **Delta Sync** - Send only changed fields, not full records
2. **Compression** - Gzip compression for large payloads
3. **Background Sync** - Sync even when app is closed (Service Worker)
4. **Selective Sync** - Sync only certain entity types
5. **Sync Groups** - Group related mutations for atomicity
6. **Retry Exponential Backoff** - Smart retry for failed mutations
7. **Sync Analytics** - Track sync success rates, conflict rates
