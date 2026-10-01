# DHRUV - Integrated Polar Expedition Logistics and Asset Management System

**Smart India Hackathon 2026 - Problem Statement 26062**
**Ministry of Earth Sciences / NCPOR**

> "Plan. Track. Predict. Respond. Even when the network is down."

---

## Overview

DHRUV is an offline-first web platform (Progressive Web App) that lets NCPOR plan, track and manage every expedition to Maitri and Bharati (Antarctica) and Himadri (Arctic) from a single dashboard. It covers the full chain: mainland (Goa) > shipment/flight > station > people, cargo, inventory, assets and emergencies.

## Key Features

- **Offline-First PWA:** Works during satellite blackouts with automatic sync when connection returns
- **Role-Based Access Control:** 7 roles with scoped permissions (Command, Expedition Leader, Station Leader, etc.)
- **Cargo Tracking:** QR-based consignment tracking with custody chain
- **Inventory Ledger:** Append-only stock movements for auditability
- **Personnel Movement:** Expedition roster, qualifications, check-ins
- **Asset Management:** Equipment register with maintenance schedules
- **Emergency Response:** SOS workflow with escalation timers
- **Real-time Maps:** Leaflet-based station and shipment visualization
- **Rule-Based Alerts:** Stock levels, shipment windows, weather risks, clearance expiry

## Tech Stack

### Backend
- **Framework:** Flask (REST API)
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Auth:** Flask-JWT-Extended
- **Database:** PostgreSQL (Supabase)
- **Validation:** Marshmallow/Pydantic

### Frontend
- **Framework:** React (Vite)
- **Routing:** React Router
- **Offline Storage:** IndexedDB (Dexie)
- **Maps:** Leaflet + react-leaflet
- **PWA:** Workbox + vite-plugin-pwa
- **Styling:** Tailwind CSS

## Project Structure

```
SIH-2026-26062/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── schemas/         # Validation schemas
│   │   └── utils/           # Utilities
│   ├── migrations/          # Alembic migrations
│   ├── tests/               # Backend tests
│   ├── requirements.txt
│   ├── config.py
│   └── run.py
├── client/                  # Frontend (Vite React app)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── db/              # IndexedDB (Dexie)
│   │   └── sync/            # Sync engine
│   ├── public/
│   └── package.json
├── docs/
├── STATUS.md
└── README.md
```

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL database (Supabase recommended)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
flask db upgrade

# Create first admin user
python -m app.cli create-admin

# Run development server
python run.py
```

Backend will run on `http://localhost:5001`

### 2. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with API URL

# Run development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 3. Environment Variables

**Backend (.env):**
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET_KEY=your-secret-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5001
```

## Database Migrations

```bash
cd backend
source venv/bin/activate

# Create new migration
flask db migrate -m "description"

# Apply migrations
flask db upgrade

# Rollback
flask db downgrade
```

## Running Tests

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest

# Frontend tests (when implemented)
cd client
npm test
```

## Building for Production

### Backend
```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5001 run:app
```

### Frontend
```bash
cd client
npm run build
# Build output in client/dist/
```

## Permission Matrix

The system enforces role-based permissions on every endpoint:

| Role | Scope |
|------|-------|
| Command | Full access across all stations |
| Expedition Leader | Own station, own expeditions |
| Station Leader | Own station, can update station info |
| Store/Logistics Officer | Own station, inventory/cargo focus |
| Field Team Member | Own records only |
| Medical Officer | Own station, medical records |
| Admin | Full system access |

See `backend/app/services/permission_service.py` for complete matrix.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Roles & Permissions
- `GET /api/roles` - List roles
- `GET /api/roles/:id` - Get role with permissions
- `GET /api/permissions` - List all permissions

### Stations
- `GET /api/stations` - List stations
- `GET /api/stations/:id` - Get station
- `POST /api/stations` - Create station (admin only)
- `PUT /api/stations/:id` - Update station

### Audit Log
- `GET /api/audit-log` - Query audit log

## Offline Sync Design

The app uses an outbox pattern for offline operations:

1. **Client creates record** → Saved to IndexedDB + added to outbox
2. **Client goes offline** → Outbox queues mutations
3. **Client comes online** → Sync engine pushes mutations to server
4. **Server processes** → Returns success/failure/conflict per item
5. **Client updates** → Marks outbox items acked/failed/conflict
6. **Client pulls** → Fetches changes since last cursor

Conflict resolution:
- Ledger entities (stock movements, custody scans, audit): Append-only, no conflict
- Editable records: Version field, on mismatch flag conflict for manual resolution

## Real Station Coordinates

| Station | Code | Latitude | Longitude | Region |
|---------|------|----------|-----------|--------|
| Maitri | MAI | -70.7650 | 11.7330 | Antarctica |
| Bharati | BHA | -69.4147 | 76.1769 | Antarctica |
| Himadri | HIM | 78.9230 | 11.9230 | Arctic |
| Goa Command | GOA | 15.4989 | 73.8278 | India |

## Development Workflow

1. Create feature branch
2. Make changes (backend models → migrations → endpoints → frontend)
3. Write tests
4. Run `pytest` (backend) and `npm test` (frontend)
5. Update STATUS.md with progress
6. Submit PR

## Current Status

See [STATUS.md](STATUS.md) for detailed phase progress.

**Phase 1 (Auth, Roles, Permissions, Audit):** ✅ COMPLETE
**Phase 2 (Cargo, Inventory):** ⏳ NOT STARTED
**Phase 3 (Offline Sync):** ⏳ PARTIAL
**Phase 4 (Personnel, Expeditions, Assets):** ⏳ NOT STARTED
**Phase 5 (Emergency):** ⏳ NOT STARTED
**Phase 6 (Maps, Rules, Alerts):** ⏳ NOT STARTED
**Phase 7 (Hardening):** ⏳ NOT STARTED

## License

This project is developed for the Smart India Hackathon 2026.

## Contact

- **Problem Statement:** SIH-2026-26062
- **Ministry:** Ministry of Earth Sciences / NCPOR
- **Team:** [Your Team Name]

---

**DHRUV - One Command Centre for Polar Expedition Logistics, Assets and Safety**
