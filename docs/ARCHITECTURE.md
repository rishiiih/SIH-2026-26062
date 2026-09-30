# DHRUV Architecture

## System Overview

DHRUV is an offline-first web application designed for polar expedition logistics. The system consists of:

1. **Backend API** (Flask + PostgreSQL) - Centralized data store and business logic
2. **Frontend PWA** (React + IndexedDB) - Offline-capable client application
3. **Sync Engine** - Bidirectional synchronization between client and server

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Field User at Station                        │
│              (Offline PWA - No Network Available)                │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   React UI   │    │  IndexedDB   │    │   Outbox     │      │
│  │              │    │  (Dexie.js)  │    │  (Mutations) │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                    │                    │              │
│         └────────────────────┴────────────────────┘              │
│                              │                                   │
│                    Local Storage (Offline)                       │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ (Connection Restored)
                               │ Auto-sync triggers
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Sync Engine                               │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Push Queue  │───>│  /api/sync/  │<───│ Pull Changes │      │
│  │              │    │    push      │    │  /api/sync/  │      │
│  └──────────────┘    └──────────────┘    │    pull      │      │
│                                             └──────────────┘      │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Central API + Database                        │
│                    (Goa Command - Online)                        │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Flask API    │    │  PostgreSQL  │    │  Audit Log   │      │
│  │              │    │  (Supabase)  │    │  (Immutable) │      │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘      │
│         │                    │                                   │
│         └────────────────────┴───────────┐                       │
│                                         │                       │
│  ┌──────────────┐    ┌──────────────┐  │                       │
│  │    RBAC      │    │ Permission   │  │                       │
│  │  Enforcement │    │   Matrix     │  │                       │
│  └──────────────┘    └──────────────┘  │                       │
│                                         │                       │
└─────────────────────────────────────────┘                       │
                               │                                   │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Command Centre Dashboard                       │
│              (Real-time view of all operations)                   │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Cargo      │    │  Inventory   │    │  Personnel   │      │
│  │   Tracking   │    │  Management  │    │  Movement    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Assets     │    │  Emergency   │    │  Expeditions │      │
│  │  Management  │    │  Response    │    │  Planning    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Offline-First Architecture

**Why:** Polar stations have intermittent satellite links that can black out for weeks.

**Implementation:**
- All data stored locally in IndexedDB via Dexie
- Service worker caches app shell and static assets
- Mutations queued in outbox when offline
- Automatic sync when connection returns
- Conflict resolution for concurrent edits

### 2. Immutable Audit Trail

**Why:** Safety-critical operations require complete traceability.

**Implementation:**
- Every mutation logged to audit_log table
- Stores: user, action, entity, before/after data, device time, server time
- Audit log is append-only (no deletes/updates)
- Cannot be tampered with by regular users

### 3. Append-Only Inventory Ledger

**Why:** Stock levels derived from movements, never overwritten.

**Implementation:**
- Stock movements table records every receipt, consumption, transfer, adjustment
- Current stock = sum of movements for each batch
- Stocktakes record variance but don't overwrite ledger
- Full history of stock movement for audit

### 4. Role-Based Access Control (RBAC)

**Why:** Different users need different access levels based on role and station.

**Implementation:**
- 7 roles: Command, Expedition Leader, Station Leader, Store/Logistics, Field Team, Medical, Admin
- 45 permissions across all modules
- Backend enforces permissions on every endpoint
- Frontend hides actions user cannot perform
- Station-scoped access (users see only their station's data)

### 5. Idempotent Operations

**Why:** Network interruptions can cause duplicate requests.

**Implementation:**
- Every client-generated record has UUID
- Every mutation has idempotency key
- Server can safely replay requests
- Sync engine handles duplicate detection

## Data Flow

### Write Operation (Online)

```
1. User creates record in UI
2. Frontend validates locally
3. Frontend saves to IndexedDB
4. Frontend adds mutation to outbox
5. Frontend calls API endpoint
6. Backend validates permissions
7. Backend saves to PostgreSQL
8. Backend writes to audit log
9. Backend returns success
10. Frontend marks outbox as acked
```

### Write Operation (Offline)

```
1. User creates record in UI
2. Frontend validates locally
3. Frontend saves to IndexedDB
4. Frontend adds mutation to outbox
5. Frontend shows "pending" status
6. User continues working offline
7. Connection restored
8. Sync engine pushes outbox mutations
9. Backend processes and returns results
10. Frontend updates IndexedDB with server data
11. Frontend marks outbox as acked/failed/conflict
```

### Read Operation

```
1. User requests data
2. Frontend checks IndexedDB first
3. If data exists and fresh, return immediately
4. If data missing or stale, fetch from API
5. API validates permissions
6. API returns scoped data
7. Frontend updates IndexedDB
8. Frontend displays data
```

## Sync Engine

### Push (Client → Server)

```
1. Sync engine collects pending mutations from outbox
2. Batch mutations to /api/sync/push
3. Server processes each mutation:
   - Validates idempotency key
   - Checks permissions
   - Applies change
   - Writes audit log
   - Returns per-item result
4. Client updates outbox status per result
5. Client clears acked mutations
```

### Pull (Server → Client)

```
1. Client sends cursor (last sync version)
2. Server queries changes since cursor
3. Server returns scoped changes (by role/station)
4. Client applies changes to IndexedDB
5. Client updates cursor
```

### Conflict Resolution

**Ledger entities (stock movements, custody scans, audit):**
- Append-only, no conflict possible
- Both versions kept

**Editable records (users, cargo, personnel):**
- Version field on each record
- Server compares version on update
- If mismatch, flag conflict
- UI shows both versions for manual resolution

## Security

### Authentication
- JWT access tokens (1 hour expiry)
- JWT refresh tokens (30 days expiry)
- Token refresh automatically handled
- Remote token revocation via /api/auth/revoke-device

### Authorization
- RBAC enforced on every endpoint
- Permission matrix in code (see PERMISSIONS.md)
- Station-scoped data access
- Frontend hides unauthorized actions

### Data Protection
- HTTPS in production
- Passwords hashed with bcrypt
- Sensitive data not logged
- Audit log immutable

## Performance

### Offline Performance
- All reads from IndexedDB (instant)
- Service worker caches static assets
- Minimal network usage when online

### Online Performance
- API responses compressed
- Cursor-based incremental sync
- Batch mutations for efficiency
- Database indexes on common queries

### Scalability
- Stateless API (horizontal scaling)
- Database connection pooling
- CDN for static assets
- IndexedDB for client-side caching

## Technology Choices

### Backend: Flask
- Lightweight and fast
- Extensive ecosystem
- Easy to deploy
- Good for REST APIs

### Database: PostgreSQL
- ACID compliance
- JSON support for audit log
- Reliable and mature
- Full-text search available

### Frontend: React
- Component-based architecture
- Large ecosystem
- Good for complex UIs
- Server-side rendering available

### Offline Storage: IndexedDB + Dexie
- Browser-native storage
- Large capacity (hundreds of MB)
- Dexie provides clean API
- Works offline by design

### Maps: Leaflet
- Lightweight (no heavy dependencies)
- Works offline with tile caching
- Customizable
- Open-source

## Deployment

### Development
- Backend: Flask dev server (localhost:5000)
- Frontend: Vite dev server (localhost:5173)
- Database: Local PostgreSQL or Supabase

### Production
- Backend: Gunicorn + Nginx
- Frontend: Static files served by Nginx
- Database: Managed PostgreSQL (Supabase/RDS)
- CDN: Cloudflare or similar

## Monitoring

### Metrics to Track
- API response times
- Sync success/failure rates
- Conflict rates
- Offline time per user
- Database query performance

### Logging
- Backend: Structured logs (JSON)
- Frontend: Error tracking (Sentry)
- Audit log: All mutations
