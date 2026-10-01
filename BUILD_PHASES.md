# DHRUV Build Phases - Dependency-Ordered Checklist

## Live Demo Minimum Requirements
**Before demo can be shown:**
- Real login/logout
- Cargo status update while offline
- Sync (push/pull) working
- Command dashboard reflects changes
- SOS incident reaches command with acknowledgement

---

## Phase 0: Foundation (Platform Features)
**Status:** ⏳ Pending
**Estimated:** 2-3 days
**Blocks:** All subsequent phases

### 0.1 Database & Models
- [ ] Fix users table UUID default (migration already created, needs proper application)
- [ ] Add append-only enforcement audit trigger (blocks UPDATE/DELETE on audit_log)
- [ ] Add database trigger for automatic audit logging on all mutations
- [ ] Implement optional integrity check (hash chaining on audit_log)
- [ ] Verify all tables have created_at/updated_at with server timestamps

### 0.2 Authentication & Session
- [ ] Login page (already exists, verify it works)
- [ ] Session expiry handling (JWT token refresh)
- [ ] Offline sign-in with cached session (store tokens in IndexedDB)
- [ ] Password change endpoint
- [ ] Logout (already exists, verify clears local storage)
- [ ] Session timeout warning in UI

### 0.3 RBAC Backend
- [ ] Verify permission matrix enforcement on all endpoints
- [ ] Add station scoping to queries (users only see their assigned station)
- [ ] Create permission service middleware
- [ ] Test unauthorized access is blocked

### 0.4 Idempotent Writes
- [ ] Implement client-generated UUIDs for all mutable entities
- [ ] Add idempotency key handling in Flask endpoints
- [ ] Update Dexie to use client IDs as primary keys
- [ ] Test duplicate submissions are rejected

### 0.5 UI Error States & Loading
- [ ] Add loading skeletons to all pages
- [ ] Add error boundaries for React components
- [ ] Add offline banner (navigator.onLine detection)
- [ ] Add network status indicator in header
- [ ] Add retry mechanism for failed API calls

### 0.6 Input Validation & Rate Limiting
- [ ] Add Pydantic validation schemas for all inputs
- [ ] Add rate limiting middleware (Flask-Limiter)
- [ ] Add request logging middleware
- [ ] Test validation errors return clear messages

### 0.7 Seed Real Reference Data
- [ ] Seed real stations only (Maitri, Bharati, Himadri with real coordinates from NCPOR)
- [ ] Remove any mock station data
- [ ] Seed real roles (Command, Expedition Leader, Station Leader, etc.)
- [ ] Seed real permissions matching permission matrix
- [ ] Verify seed migration idempotent

---

## Phase 1: Sync Engine
**Status:** ⏳ Pending
**Estimated:** 3-4 days
**Blocks:** All offline functionality
**Depends on:** Phase 0

### 1.1 Dexie Outbox Schema
- [ ] Create outbox table (id, entity_type, entity_id, action, payload, state, created_at, updated_at, error)
- [ ] States: pending, sent, acknowledged, failed, conflict
- [ ] Add client UUID for device identification
- [ ] Add version field for conflict detection

### 1.2 Sync Endpoints (Flask)
- [ ] POST /api/sync/push (batched, idempotent by client UUID)
- [ ] GET /api/sync/pull (changes since cursor, scoped by role/station)
- [ ] Add cursor-based pagination
- [ ] Add last-sync timestamp per device

### 1.3 Sync Engine Logic
- [ ] Implement push function (batch pending items, handle responses)
- [ ] Implement pull function (fetch changes, merge into Dexie)
- [ ] Implement auto-sync (periodic background sync)
- [ ] Implement manual sync button
- [ ] Add sync status indicator in header

### 1.4 Conflict Resolution
- [ ] Detect version conflicts during pull
- [ ] Create conflict rows in Dexie
- [ ] Build conflict resolution UI (both versions side-by-side)
- [ ] Implement "use local" and "use server" actions
- [ ] Add conflict to sync queue after resolution

### 1.5 Sync UI (SyncConflicts page)
- [ ] Display real queue list with states
- [ ] Add retry button for failed items
- [ ] Add "Discard failed items" with confirmation (not "Clear Pending")
- [ ] Show sync history
- [ ] Show last sync per device
- [ ] Add clock-skew warning
- [ ] Add session expiry warning
- [ ] Add remote device revoke

### 1.6 Offline SOS Priority
- [ ] Mark SOS incidents as priority in outbox
- [ ] Add local alarm when SOS queued
- [ ] Distinguish "queued on device" vs "delivered to command" in UI
- [ ] Test SOS sends immediately when network returns

---

## Phase 2: Admin & Reference Data
**Status:** ⏳ Pending
**Estimated:** 2-3 days
**Blocks:** All feature pages that need reference data
**Depends on:** Phase 0, Phase 1

### 2.1 User Management
- [ ] Create user detail view (drawer/page)
- [ ] Add user creation form with role/station assignment
- [ ] Add user editing (name, role, station)
- [ ] Add user deactivation (soft delete)
- [ ] Add CSV import for users
- [ ] Test RBAC enforcement (users can't escalate own role)

### 2.2 Role & Permission Management
- [ ] Create role detail view
- [ ] Add role creation/editing
- [ ] Add permission matrix UI (grid of roles × permissions)
- [ ] Add permission assignment to roles
- [ ] Test permission changes take effect immediately

### 2.3 Station Management
- [ ] Create station detail view
- [ ] Add station creation (name, code, location, coordinates, region, timezone)
- [ ] Add station metadata (capacity, facilities, contacts)
- [ ] Add station assignment to users
- [ ] Verify real coordinates from NCPOR sources

### 2.4 Vessel & Flight Register
- [ ] Create vessel/flight table (name, type, capacity_kg, capacity_m3)
- [ ] Add vessel/flight creation form
- [ ] Add vessel/flight list in Admin
- [ ] Add vessel/flight selection in cargo creation

### 2.5 Categories & Units
- [ ] Create item categories table
- [ ] Create units of measure table
- [ ] Add category/unit management UI
- [ ] Seed common categories (fuel, food, medical, equipment)

### 2.6 Thresholds
- [ ] Create thresholds table (type, name, value, station_id)
- [ ] Add threshold management UI
- [ ] Add low stock threshold
- [ ] Add check-in interval threshold
- [ ] Add escalation minutes threshold
- [ ] Add weather risk thresholds
- [ ] Mark defaults as placeholders (real limits from NCPOR)

### 2.7 Checklist Templates
- [ ] Create checklist_templates table
- [ ] Add template editor UI
- [ ] Seed emergency response templates
- [ ] Add template assignment to incident types

### 2.8 Integrations (Admin)
- [ ] Add weather source configuration (Open-Meteo endpoint)
- [ ] Add notification channel configuration (email, Telegram, web push)
- [ ] Add map tile source configuration
- [ ] Mark satellite messaging as "not integrated"
- [ ] Add sync settings (interval, batch size)
- [ ] Add import history log
- [ ] Add backup status indicator

---

## Phase 3: Cargo & Logistics (LIVE DEMO CRITICAL)
**Status:** ⏳ Pending
**Estimated:** 4-5 days
**Blocks:** Live demo cargo workflow
**Depends on:** Phase 0, Phase 1, Phase 2

### 3.1 Cargo Models
- [ ] Create consignments table (id, code, name, origin, destination, leg, priority, status, created_at, updated_at)
- [ ] Create consignment_items table (consignment_id, item_name, quantity, weight, volume, hazardous, fragile, cold_chain)
- [ ] Create custody_events table (append-only: consignment_id, user_id, location, action, timestamp)
- [ ] Add status trail enum (Packed, Dispatched, In Transit, Received, Delivered)
- [ ] Add server-enforced status transitions

### 3.2 Cargo Endpoints
- [ ] POST /api/cargo/consignments (create)
- [ ] GET /api/cargo/consignments (list with search, filters, sorting)
- [ ] GET /api/cargo/consignments/:id (detail)
- [ ] PUT /api/cargo/consignments/:id (update status only)
- [ ] POST /api/cargo/consignments/:id/custody (scan custody event)
- [ ] POST /api/cargo/consignments/:id/receive (receipt reconciliation)
- [ ] GET /api/cargo/vessels (for capacity check)

### 3.3 Cargo UI - List
- [ ] Implement consignment list with search
- [ ] Add filters (status, priority, origin, destination)
- [ ] Add sorting (date, priority, weight)
- [ ] Add consignment detail view (drawer/page)
- [ ] Add export button

### 3.4 Cargo UI - Create
- [ ] Create consignment form (items, weight, volume, origin, destination, leg)
- [ ] Add hazardous, fragile, cold-chain flags
- [ ] Add vessel/flight selection
- [ ] Add capacity check against vessel/flight
- [ ] Add validation (required fields, capacity limits)

### 3.5 Cargo UI - Manifest Import
- [ ] Add CSV upload (papaparse)
- [ ] Add preview step before import
- [ ] Add error report for invalid rows
- [ ] Add batch creation from CSV

### 3.6 QR Code Generation & Scanning
- [ ] Generate QR code encoding consignment code (qrcode Python)
- [ ] Add print label button
- [ ] Add scan label button (html5-qrcode)
- [ ] Add manual code entry fallback
- [ ] Test camera requires HTTPS or localhost

### 3.7 Status Trail & Custody Log
- [ ] Display status trail with timestamps
- [ ] Display custody log (who scanned, where, when)
- [ ] Enforce valid status transitions on backend
- [ ] Add status change confirmation

### 3.8 Receipt Reconciliation
- [ ] Compare expected vs received quantities
- [ ] Generate discrepancy report
- [ ] Add damaged/missing reporting with photos
- [ ] Create adjustment movements for variance

### 3.9 Cold-Chain
- [ ] Add temperature log table (consignment_id, temperature, timestamp, source)
- [ ] Add manual temperature entry form
- [ ] Add CSV upload for temperature data
- [ ] Mark live sensor feeds as "not integrated"
- [ ] Display temperature history on consignment detail

### 3.10 Offline Cargo Updates
- [ ] Create consignment while offline (queued in outbox)
- [ ] Update consignment status while offline (queued in outbox)
- [ ] Scan custody event while offline (queued in outbox)
- [ ] Test sync pushes changes to server
- [ ] Test Command Dashboard reflects changes after sync

---

## Phase 4: Inventory
**Status:** ⏳ Pending
**Estimated:** 3-4 days
**Blocks:** Days of supply calculations, low-stock alerts
**Depends on:** Phase 0, Phase 1, Phase 2

### 4.1 Inventory Models
- [ ] Create items table (id, name, category_id, unit_id, min_level, safety_level)
- [ ] Create locations table (id, name, type, station_id)
- [ ] Create batches table (id, item_id, location_id, expiry_date, quantity)
- [ ] Create stock_movements table (append-only: item_id, location_id, type, quantity, batch_id, reason, created_at)
- [ ] Movement types: receipt, consumption, transfer, adjustment
- [ ] Create stocktakes table (id, location_id, performed_at, performed_by)

### 4.2 Inventory Endpoints
- [ ] POST /api/inventory/items (create)
- [ ] GET /api/inventory/items (list)
- [ ] GET /api/inventory/stock (derived from movements)
- [ ] POST /api/inventory/movements (create movement)
- [ ] POST /api/inventory/stocktake (create stocktake)
- [ ] GET /api/inventory/days-of-supply (calculated endpoint)

### 4.3 Inventory UI - Catalog
- [ ] Item catalogue list
- [ ] Add item form (name, category, unit, min/safety levels)
- [ ] Add location management
- [ ] Add CSV import for items

### 4.4 Stock Movements
- [ ] Display stock per location (derived from movements)
- [ ] Add movement form (type, quantity, location, batch, reason)
- [ ] Add quick "log consumption" action
- [ ] Add transfer between locations
- [ ] Add adjustment with reason

### 4.5 Batches & Expiry
- [ ] Display batches with expiry dates
- [ ] Add expiry alerts (expiring soon, expired)
- [ ] Filter movements by batch

### 4.6 Days of Supply & Alerts
- [ ] Calculate days of supply = stock ÷ average daily consumption
- [ ] Add "not enough data" message below history threshold
- [ ] Add low-stock alerts against resupply window
- [ ] Add reorder alerts when below safety level
- [ ] Test alerts appear on Station Leader page

### 4.7 Request Resupply
- [ ] Add "Request resupply" button
- [ ] Creates planned consignment in Cargo module
- [ ] Links to cargo creation form with pre-filled data

### 4.8 Forecast Panel
- [ ] Implement Croston/SBA/TSB forecasting (~30 lines, explainable)
- [ ] Show method, inputs, and result
- [ ] Add "not enough data" message
- [ ] Use numpy for calculations

### 4.9 Stocktake
- [ ] Add stocktake form (location, expected vs actual)
- [ ] Calculate variance
- [ ] Create adjustment movements for variance
- [ ] Add CSV import for stocktake data
- [ ] Add CSV export for stocktake results

---

## Phase 5: Personnel
**Status:** ⏳ Pending
**Estimated:** 3-4 days
**Blocks:** Check-in system, movement tracking
**Depends on:** Phase 0, Phase 1, Phase 2

### 5.1 Personnel Models
- [ ] Create people table (id, name, station_id, role, status)
- [ ] Create clearances table (id, person_id, type, status, expiry_date)
- [ ] Create movement_legs table (id, person_id, from_station, to_station, type, departure_at, arrival_at)
- [ ] Create check_ins table (id, person_id, location, timestamp, method)
- [ ] Create roll_calls table (id, station_id, performed_at, performed_by, headcount)

### 5.2 Personnel Endpoints
- [ ] POST /api/personnel/people (create)
- [ ] GET /api/personnel/people (list)
- [ ] GET /api/personnel/people/:id (detail)
- [ ] POST /api/personnel/movements (create movement leg)
- [ ] POST /api/personnel/check-ins (create check-in)
- [ ] POST /api/personnel/roll-calls (create roll call)

### 5.3 Personnel UI - Roster
- [ ] Roster list with search/filter
- [ ] Add person form (name, station, role)
- [ ] Add CSV import for people
- [ ] Add person detail view (drawer/page)

### 5.4 Profile & Clearances
- [ ] Display station assignment
- [ ] Display qualifications
- [ ] Display medical clearance status (status only, no medical detail)
- [ ] Display training clearance status with expiry
- [ ] Add clearance expiry alerts
- [ ] Document on Data Handling page (status only stored)

### 5.5 Movement Legs
- [ ] Display movement history
- [ ] Add movement form (arrival, departure, transfer)
- [ ] Display who is where per station
- [ ] Display accommodation allocation

### 5.6 Check-In System
- [ ] Manual check-in form
- [ ] Periodic check-in reminder (scheduled job)
- [ ] Missed check-in detection (scheduled job)
- [ ] Missed check-in flags
- [ ] Check-in status display on roster

### 5.7 Roll Call
- [ ] "Log roll call" button on Station Leader
- [ ] Creates roll call record
- [ ] Displays headcount
- [ ] Compares to expected personnel

### 5.8 Emergency Contacts
- [ ] Add emergency contacts per person
- [ ] Display in emergency incidents
- [ ] Resource lookup (medical stock, fuel, transport)

---

## Phase 6: Emergency & Incidents (LIVE DEMO CRITICAL)
**Status:** ⏳ Pending
**Estimated:** 3-4 days
**Blocks:** Live demo SOS workflow
**Depends on:** Phase 0, Phase 1, Phase 2, Phase 5

### 6.1 Emergency Models
- [ ] Create incidents table (id, type, severity, location_lat, location_lon, station_id, description, status, created_at, updated_at)
- [ ] Create incident_events table (append-only: incident_id, action, user_id, timestamp, details)
- [ ] Create contacts table (id, name, role, phone, email, station_id)
- [ ] Status enum: raised, acknowledged, responding, resolved
- [ ] Severity enum: low, medium, high, critical

### 6.2 Emergency Endpoints
- [ ] POST /api/emergency/incidents (raise incident)
- [ ] GET /api/emergency/incidents (list)
- [ ] GET /api/emergency/incidents/:id (detail)
- [ ] PUT /api/emergency/incidents/:id/status (update status)
- [ ] POST /api/emergency/incidents/:id/acknowledge
- [ ] POST /api/emergency/incidents/:id/respond
- [ ] POST /api/emergency/incidents/:id/resolve
- [ ] GET /api/emergency/contacts (directory)

### 6.3 Raise Incident UI
- [ ] Incident form (type, severity, location (GPS or station), description)
- [ ] One-tap SOS button
- [ ] GPS location capture
- [ ] Station location fallback

### 6.4 SOS Offline
- [ ] One-tap SOS works offline
- [ ] Local alarm when SOS triggered
- [ ] SOS marked as priority in sync queue
- [ ] Distinguish "queued on device" vs "delivered to command"
- [ ] Test SOS sends immediately when network returns

### 6.5 Incident List & Detail
- [ ] Incident list with filters
- [ ] Incident detail view with append-only timeline
- [ ] Display incident events chronologically
- [ ] Add incident type icons

### 6.6 Workflow & Escalation
- [ ] Acknowledge button
- [ ] Respond button
- [ ] Resolve button
- [ ] Server-enforced status transitions
- [ ] Escalation timer (scheduled job for unacknowledged incidents)
- [ ] Escalation alert when time exceeded

### 6.7 Response Checklists
- [ ] Load checklist template for incident type
- [ ] Display checklist items
- [ ] Checkbox for each item
- [ ] Save checklist completion

### 6.8 Emergency Contacts & Resources
- [ ] Emergency contacts directory
- [ ] Resource lookup (medical stock, fuel, transport)
- [ ] Link to inventory for medical stock
- [ ] Link to assets for transport

### 6.9 Muster & Headcount
- [ ] Muster form
- [ ] Headcount entry
- [ ] Compare to roll call
- [ ] Display missing personnel

### 6.10 Post-Incident Report
- [ ] Post-incident report form
- [ ] Export as PDF
- [ ] Link to audit log

### 6.11 Alerts
- [ ] In-app notification for new incidents
- [ ] Web push notification (pywebpush)
- [ ] Email notification (SMTP)
- [ ] Telegram notification (Telegram Bot API)
- [ ] Test alert delivery

### 6.12 Live Demo Integration
- [ ] Test SOS raised from offline device
- [ ] Test SOS reaches command after sync
- [ ] Test command acknowledges incident
- [ ] Test acknowledgement reflected on station device after sync
- [ ] Test escalation timer triggers if unacknowledged

---

## Phase 7: Assets
**Status:** ⏳ Pending
**Estimated:** 2-3 days
**Blocks:** Equipment flags on Station Leader
**Depends on:** Phase 0, Phase 1, Phase 2

### 7.1 Asset Models
- [ ] Create assets table (id, unique_id, name, type, station_id, condition, location, created_at, updated_at)
- [ ] Create maintenance_schedule table (id, asset_id, due_date, type, description)
- [ ] Create maintenance_log table (id, asset_id, performed_at, performed_by, description, cost)
- [ ] Create usage_log table (id, asset_id, user_id, action, timestamp)

### 7.2 Asset Endpoints
- [ ] POST /api/assets/assets (register)
- [ ] GET /api/assets/assets (list)
- [ ] GET /api/assets/assets/:id (detail)
- [ ] PUT /api/assets/assets/:id (update)
- [ ] POST /api/assets/assets/:id/assign (assign to user)
- [ ] POST /api/assets/assets/:id/checkout (check out)
- [ ] POST /api/assets/assets/:id/return (return)
- [ ] POST /api/assets/assets/:id/move (location move)

### 7.3 Asset UI - Register
- [ ] Asset registration form (unique ID, type, station, condition)
- [ ] Generate QR tag for asset
- [ ] Print QR label
- [ ] Scan QR to open asset detail

### 7.4 Asset Management
- [ ] Asset list with search/filter
- [ ] Asset detail view (drawer/page)
- [ ] Assign to user
- [ ] Check out
- [ ] Return
- [ ] Location move

### 7.5 Maintenance
- [ ] Maintenance schedule display
- [ ] Add maintenance schedule entry
- [ ] Maintenance log display
- [ ] Add maintenance log entry
- [ ] Maintenance due alerts
- [ ] Alert when maintenance overdue

### 7.6 Usage History
- [ ] Display usage log
- [ ] Add usage log entry automatically on checkout/return
- [ ] Display usage statistics

### 7.7 Equipment Flags
- [ ] Create equipment flag table (id, asset_id, type, message, created_at, resolved_at)
- [ ] Display flags on Station Leader page
- [ ] Add flag creation form
- [ ] Resolve flag
- [ ] Test flags appear on dashboard

---

## Phase 8: Weather
**Status:** ⏳ Pending
**Estimated:** 2-3 days
**Blocks:** Weather risk, route planning
**Depends on:** Phase 0, Phase 1, Phase 2

### 8.1 Weather Models
- [ ] Create weather_snapshots table (id, lat, lon, fetched_at, source, raw_json)
- [ ] Create weather_rules table (id, type, threshold, action, station_id)

### 8.2 Weather Endpoints
- [ ] POST /api/weather/configure (set weather source)
- [ ] GET /api/weather/forecast/:station_id (get forecast)
- [ ] GET /api/weather/route-forecast (get forecast for route points)
- [ ] POST /api/weather/refresh (manual refresh)
- [ ] GET /api/weather/risk-assessment (risk flags)

### 8.3 Weather Source Setup
- [ ] Configure Open-Meteo endpoint
- [ ] Configure API key (if needed)
- [ ] Test API connection
- [ ] Verify free-tier limits (10,000 requests/day)
- [ ] Handle 429 errors gracefully

### 8.4 Forecast Fetching
- [ ] Scheduled job to fetch forecast for stations
- [ ] Scheduled job to fetch forecast for route points
- [ ] Cache results in weather_snapshots
- [ ] Include sea state (marine API)
- [ ] Display forecast per station
- [ ] Display forecast per route point

### 8.5 Risk Rules
- [ ] Risk rules management UI (thresholds)
- [ ] Mark defaults as placeholders (real limits from NCPOR)
- [ ] Compare values to thresholds
- [ ] Show which threshold fired
- [ ] Add risk flag to planned shipments
- [ ] Add risk flag to traverses
- [ ] Add risk flag to movements

### 8.6 Weather UI
- [ ] Display forecast with "as of" time
- [ ] Display cached last-known data when offline
- [ ] Display risk alerts
- [ ] Display sea state
- [ ] Add manual refresh button
- [ ] Add decision log (delay, reroute, reschedule)

### 8.7 System Recommends Only
- [ ] Decision log: person records action
- [ ] System only recommends, does not enforce
- [ ] Clear UI distinction between recommendation and decision

---

## Phase 9: Polar Map
**Status:** ⏳ Pending
**Estimated:** 3-4 days
**Blocks:** Geographic visualization
**Depends on:** Phase 0, Phase 1, Phase 2, Phase 3, Phase 6

### 9.1 Map Models
- [ ] Create positions table (id, entity_type, entity_id, lat, lon, source, reported_at)

### 9.2 Map Endpoints
- [ ] POST /api/map/positions (report position)
- [ ] GET /api/map/positions (list positions)
- [ ] GET /api/map/stations (station markers)
- [ ] GET /api/map/incidents (incident markers)
- [ ] GET /api/map/consignments (consignment markers)

### 9.3 Leaflet Integration
- [ ] Install Leaflet
- [ ] Create map component
- [ ] Add station markers
- [ ] Add vessel/flight markers
- [ ] Add consignment in transit markers
- [ ] Add incident markers
- [ ] Add weather markers

### 9.4 Layers & Toggles
- [ ] Implement layer toggles
- [ ] Stations layer
- [ ] Vessels and flights layer
- [ ] Consignments in transit layer
- [ ] Incidents layer
- [ ] Weather layer

### 9.5 Position Reporting
- [ ] Report Position (manual) form
- [ ] Browser geolocation integration
- [ ] GPS capture
- [ ] Store in positions table
- [ ] Display on map

### 9.6 Routes & Waypoints
- [ ] Display planned routes
- [ ] Display waypoints
- [ ] Add route creation (optional)
- [ ] Add waypoint creation (optional)

### 9.7 Marker Detail
- [ ] Click marker for detail
- [ ] Station detail popup
- [ ] Vessel detail popup
- [ ] Consignment detail popup
- [ ] Incident detail popup

### 9.8 Offline Map Tiles
- [ ] Build regional PMTiles file (pmtiles CLI from Protomaps extract)
- [ ] Host PMTiles file
- [ ] Implement range-request caching in service worker
- [ ] Add storage indicator (navigator.storage.estimate())
- [ ] Start online-only, add offline later
- [ ] Download offline tiles button

### 9.9 AISStream Integration (Optional)
- [ ] Check AISStream free tier terms
- [ ] Check polar waters coverage
- [ ] If acceptable, integrate for vessel tracking
- [ ] If not, use manual vessel position reporting

---

## Phase 10: Advanced Features
**Status:** ⏳ Pending
**Estimated:** 4-5 days
**Blocks:** Full feature parity
**Depends on:** All previous phases

### 10.1 Expedition Planning
- [ ] Create expeditions table (id, name, season, start_date, end_date, status)
- [ ] Create mission_calendar table (id, expedition_id, date, event)
- [ ] Create voyage_schedules table (id, vessel_id, route, departure, arrival)
- [ ] Create flight_schedules table (id, aircraft_id, route, departure, arrival)
- [ ] Create resupply_windows table (id, station_id, start, end, vessel_id)
- [ ] Create task_checklists table (id, expedition_id, task, completed, completed_by)
- [ ] Expedition planning UI
- [ ] Season calendar view
- [ ] Voyage/flight schedule view
- [ ] Resupply window display
- [ ] Task checklist management
- [ ] Link resupply windows to low-stock alerts

### 10.2 Reports & Exports
- [ ] Install reportlab (PDF)
- [ ] Install openpyxl (Excel)
- [ ] Create PDF export for SITREP
- [ ] Create PDF export for incidents
- [ ] Create PDF export for stock reports
- [ ] Create PDF export for cargo manifests
- [ ] Create Excel export for inventory
- [ ] Create Excel export for personnel
- [ ] Add export buttons to all modules
- [ ] Test exports include real data

### 10.3 Notifications (Advanced)
- [ ] Configure web push (pywebpush)
- [ ] Configure email (SMTP)
- [ ] Configure Telegram (Telegram Bot API)
- [ ] Test notification delivery
- [ ] Add notification preferences per user
- [ ] Add notification history

### 10.4 Terms, Privacy, Data Handling
- [ ] Create Terms of Use page
- [ ] Create Privacy Policy page
- [ ] Create Data Handling page
- [ ] Document what data is stored
- [ ] Document medical data is status only
- [ ] Document data retention policy
- [ ] Add links from footer

### 10.5 Theme & Accessibility
- [ ] Add low-light theme
- [ ] Add theme toggle
- [ ] Add keyboard focus indicators
- [ ] Add large touch targets for field use
- [ ] Test with screen reader
- [ ] Test with keyboard navigation

### 10.6 Additional Pages
- [ ] Reports page (central export hub)
- [ ] Expedition planning page
- [ ] Detail views for all entities (consignment, incident, person, asset, item)

---

## Platform Features (Cross-Cutting)
**Implemented across all phases**

### Scheduled Jobs
- [ ] Weather refresh job (every X hours)
- [ ] Low-stock evaluation job (daily)
- [ ] Missed check-in detection job (every X minutes)
- [ ] Escalation job (every X minutes for unacknowledged incidents)
- [ ] Use APScheduler or Celery

### Performance
- [ ] Add database indexes for common queries
- [ ] Add query result caching where appropriate
- [ ] Optimize sync payload size
- [ ] Add pagination to all list endpoints

### Security
- [ ] Add CSRF protection
- [ ] Add SQL injection prevention (parameterized queries)
- [ ] Add XSS prevention (input sanitization)
- [ ] Add rate limiting on auth endpoints
- [ ] Add password hashing (bcrypt - already done)
- [ ] Add JWT token validation (already done)

### Monitoring
- [ ] Add application logging
- [ ] Add error tracking (Sentry or similar)
- [ ] Add performance monitoring
- [ ] Add uptime monitoring

### Backup & Recovery
- [ ] Add database backup job
- [ ] Add backup status indicator in Admin
- [ ] Test restore procedure
- [ ] Document backup/restore process

---

## Testing Checklist
**Run after each phase**

### Unit Tests
- [ ] Test all model methods
- [ ] Test all service methods
- [ ] Test all endpoint with pytest
- [ ] Test RBAC enforcement
- [ ] Test idempotency

### Integration Tests
- [ ] Test sync push/pull
- [ ] Test conflict resolution
- [ ] Test offline workflow
- [ ] Test scheduled jobs
- [ ] Test notification delivery

### End-to-End Tests
- [ ] Test login/logout
- [ ] Test cargo creation offline → sync → dashboard update
- [ ] Test SOS offline → sync → command acknowledgement
- [ ] Test low-stock alert → resupply request
- [ ] Test check-in → missed check-in flag
- [ ] Test equipment flag → dashboard update

### Manual Testing
- [ ] Test all forms with valid data
- [ ] Test all forms with invalid data
- [ ] Test all buttons work
- [ ] Test all error states display
- [ ] Test all loading states display
- [ ] Test offline banner appears
- [ ] Test sync status updates
- [ ] Test mobile responsiveness
- [ ] Test keyboard navigation

---

## Live Demo Readiness Checklist
**Before demo can be shown**

### Must Have
- [ ] Real login/logout works
- [ ] Cargo status update works while offline
- [ ] Sync (push/pull) works
- [ ] Command dashboard reflects changes after sync
- [ ] SOS incident reaches command with acknowledgement
- [ ] All error states handle gracefully
- [ ] No hardcoded values in UI
- [ ] No fake activity indicators
- [ ] Real data from database

### Should Have
- [ ] Command dashboard shows real station status
- [ ] Station leader shows real consumables
- [ ] Inventory shows real stock levels
- [ ] Personnel shows real roster
- [ ] Assets show real equipment
- [ ] Emergency shows real incidents

### Nice to Have
- [ ] Weather integration works
- [ ] Map shows real positions
- [ ] Reports export real data
- [ ] Notifications deliver

---

## Current Status Summary

### Completed
- ✅ Basic auth (login, JWT, logout)
- ✅ Users, roles, stations models
- ✅ Permission matrix design
- ✅ Audit logging scaffolding
- ✅ Offline sync scaffolding (Dexie)
- ✅ React/Vite frontend setup
- ✅ 12 page UI shells with empty states
- ✅ Tailwind configuration
- ✅ Material Icons and fonts
- ✅ CORS configuration
- ✅ Supabase connection
- ✅ Admin user created

### In Progress
- ⏳ Phase 0: Foundation (fixing hardcoded values, error states)

### Next Steps
1. Fix hardcoded values in UI (station time, sync status, terminal ID, etc.)
2. Implement proper error states and loading skeletons
3. Implement real sync engine with outbox
4. Build Cargo module (live demo critical)
5. Build Emergency module (live demo critical)
6. Test live demo end-to-end

### Known Issues
- ⚠️ Hardcoded station time (14:32:08 UTC)
- ⚠️ Hardcoded terminal ID (IND-CMD-01)
- ⚠️ Hardcoded version (v2.4.1 Build 1042)
- ⚠️ Fake sync status ("Online", "Last sync")
- ⚠️ Fake activity indicators ("Map Initializing", "SatLink: Checking...")
- ⚠️ Dangerous "Clear Pending" button on sync page
- ⚠️ Missing detail views for entities
- ⚠️ Missing Terms/Privacy/Data Handling pages
- ⚠️ Missing Expedition Planning page
- ⚠️ Missing Reports page/exports
