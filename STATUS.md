# DHRUV - Project Status

**Project:** Integrated Polar Expedition Logistics and Asset Management System
**Problem Statement:** SIH-2026-26062
**Ministry:** Ministry of Earth Sciences / NCPOR

---

## Phase Status

### ✅ Phase 0: Repo Scaffold (COMPLETE)
- [x] Monorepo structure created (backend/, client/)
- [x] Docker Compose ready (using Supabase instead)
- [x] Flask app factory pattern implemented
- [x] Vite React app initialized
- [x] Migrations framework (Alembic) set up
- [x] Test infrastructure scaffolding ready

### ✅ Phase 1: Auth, Roles, Permissions, Audit (COMPLETE)
- [x] JWT authentication (access + refresh tokens)
- [x] User model with bcrypt password hashing
- [x] Role and Permission models
- [x] Station model with real coordinates (Maitri, Bharati, Himadri, Goa)
- [x] Immutable audit log (user, action, entity, before/after, timestamps)
- [x] CLI command for admin user creation
- [x] Seed migration for reference data (7 roles, 45 permissions, 4 stations)
- [x] Permission matrix enforcement (backend)
- [x] Auth endpoints: login, register, refresh, logout, me
- [x] Users, roles, stations, audit log endpoints
- [x] Frontend: Login page with auth service
- [x] Frontend: Dashboard with sync status bar
- [x] Frontend: IndexedDB with Dexie for offline storage
- [x] Frontend: Sync engine with outbox pattern
- [x] Frontend: PWA configuration with service worker

### ⏳ Phase 2: Cargo and Inventory (NOT STARTED)
- [ ] Consignments model and endpoints
- [ ] Consignment items model
- [ ] QR label generation
- [ ] Custody scan model and endpoints
- [ ] Inventory locations model
- [ ] Inventory items model
- [ ] Inventory batches model
- [ ] Stock movements (append-only ledger)
- [ ] Stocktakes model
- [ ] Frontend: Cargo list and detail pages
- [ ] Frontend: Inventory management pages
- [ ] Frontend: QR scanning integration

### ⏳ Phase 3: Offline Sync Engine (PARTIAL)
- [x] IndexedDB schema defined
- [x] Outbox pattern implemented
- [x] Sync engine skeleton (push/pull structure)
- [ ] Backend sync endpoints (/api/sync/push, /api/sync/pull)
- [ ] Conflict resolution logic
- [ ] Cursor-based incremental sync
- [ ] Service worker for offline caching
- [ ] End-to-end sync testing with network disabled

### ⏳ Phase 4: Personnel, Expeditions, Assets (NOT STARTED)
- [ ] Personnel model and endpoints
- [ ] Qualifications and training records
- [ ] Movement legs and check-ins
- [ ] Expedition model and approval workflow
- [ ] Expedition legs and requirements
- [ ] Asset model and endpoints
- [ ] Asset assignments
- [ ] Maintenance schedules
- [ ] Frontend: Personnel roster and movement pages
- [ ] Frontend: Expedition planning and approval pages
- [ ] Frontend: Asset management pages

### ⏳ Phase 5: Emergency Response (NOT STARTED)
- [ ] Incident model
- [ ] Incident updates
- [ ] Muster roll calls
- [ ] Emergency endpoints
- [ ] Escalation timers
- [ ] Frontend: SOS button and workflow
- [ ] Frontend: Incident management
- [ ] Frontend: Emergency contacts and resources

### ⏳ Phase 6: Maps, Rules, Alerts, Dashboards (NOT STARTED)
- [ ] Leaflet map integration
- [ ] Station layer
- [ ] Vessel/flight position layer
- [ ] Consignment in transit layer
- [ ] Incident layer
- [ ] Offline tile caching
- [ ] Rule engine
- [ ] Alert triggers (stock, shipments, weather, clearances, check-ins, SOS)
- [ ] Per-role dashboards
- [ ] CSV and PDF export

### ⏳ Phase 7: Hardening (NOT STARTED)
- [ ] Input validation (marshmallow/pydantic)
- [ ] Rate limiting
- [ ] Security review
- [ ] Comprehensive tests
- [ ] Deployment notes

---

## Known Issues

### Database Connection
- **Issue:** Supabase connection timing out during migration
- **Status:** Migrations created manually, need to be applied when connection is stable
- **Workaround:** Run `flask db upgrade` when Supabase is accessible

### Frontend Styling
- **Issue:** Tailwind CSS not fully configured
- **Status:** Config files created, need to verify build
- **Workaround:** May need additional configuration

---

## Integration Status

| Feature | Status | Notes |
|---------|--------|-------|
| Weather API | Not Integrated | Open-Meteo planned |
| AIS/Vessel Tracking | Not Integrated | Real feed needed |
| SMS Gateway | Not Integrated | Credentials needed |
| Satellite Messenger | Not Integrated | Webhook needed |
| QR Scanning | Not Integrated | Browser API ready |

---

## Next Steps

1. **Immediate:** Apply migrations to Supabase when connection is stable
2. **Immediate:** Create first admin user via CLI
3. **Phase 1 Completion:** Test auth flow end-to-end
4. **Phase 2:** Implement cargo tracking and inventory ledger
5. **Phase 3:** Complete sync engine and test offline scenarios

---

## Data Seeding

### Reference Data (Ready in Migration 002)
- **Roles:** Command, Expedition Leader, Station Leader, Store/Logistics Officer, Field Team Member, Medical Officer, Admin
- **Permissions:** 45 permissions across all modules
- **Stations:**
  - Maitri: -70.7650, 11.7330 (Antarctica)
  - Bharati: -69.4147, 76.1769 (Antarctica)
  - Himadri: 78.9230, 11.9230 (Arctic)
  - Goa Command: 15.4989, 73.8278 (India)

### First Admin User
- Command: `python -m app.cli create-admin`
- Prompts for username, email, password, full name
- Assigns Admin role with no station (Command/Goa)

---

## Testing Status

### Backend Tests
- Framework: pytest + pytest-flask
- Status: Scaffold ready, no tests written yet

### Frontend Tests
- Status: Not started

### E2E Tests
- Status: Not started

---

## Deployment Notes

### Environment Variables Required
```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Production Checklist
- [ ] Change JWT_SECRET_KEY
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up monitoring
- [ ] Configure backup strategy
- [ ] Review rate limits
- [ ] Audit logging enabled
