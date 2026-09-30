# DHRUV Permission Matrix

This document defines the complete permission matrix for all roles in the DHRUV system.

## Roles

1. **Command** - Mainland Command staff based in Goa with full access
2. **Expedition Leader** - Leads expeditions with station-level access
3. **Station Leader** - Manages a specific polar station
4. **Store/Logistics Officer** - Manages inventory and cargo at a station
5. **Field Team Member** - Field personnel with limited access
6. **Medical Officer** - Medical staff at a station
7. **Admin** - System administrator with full access

## Permission Scopes

- **all** - Full access across all stations
- **own_station** - Access limited to user's assigned station (Command users have no station, so they get all)
- **own** - Access only to own records
- **none** - No access

## Complete Permission Matrix

| Permission | Resource | Action | Command | Expedition Leader | Station Leader | Store/Logistics | Field Team | Medical | Admin |
|------------|----------|--------|---------|-------------------|----------------|-----------------|------------|---------|-------|
| user:read | users | read | all | own_station | own_station | own_station | own | own_station | all |
| user:create | users | create | all | own_station | own_station | own_station | none | own_station | all |
| user:update | users | update | own_station | own_station | own_station | own_station | own | own_station | all |
| user:delete | users | delete | all | none | none | none | none | none | all |
| role:read | roles | read | all | all | all | all | all | all | all |
| role:create | roles | create | none | none | none | none | none | none | all |
| role:update | roles | update | none | none | none | none | none | none | all |
| station:read | stations | read | all | all | own | own | own | own | all |
| station:create | stations | create | none | none | none | none | none | none | all |
| station:update | stations | update | none | none | own | own | none | none | all |
| audit:read | audit_log | read | all | own_station | own_station | own_station | own | own_station | all |
| cargo:read | consignments | read | all | own_station | own_station | own_station | own | own_station | all |
| cargo:create | consignments | create | all | own_station | own_station | own_station | none | none | all |
| cargo:update | consignments | update | all | own_station | own_station | own_station | none | none | all |
| cargo:delete | consignments | delete | all | none | none | none | none | none | all |
| custody:scan | custody_scans | create | all | own_station | own_station | own_station | own | own_station | all |
| inventory:read | inventory | read | all | own_station | own_station | own_station | own | own_station | all |
| inventory:receive | stock_movements | create | all | own_station | own_station | own_station | none | none | all |
| inventory:consume | stock_movements | create | all | own_station | own_station | own_station | own | own_station | all |
| inventory:transfer | stock_movements | create | all | own_station | own_station | own_station | none | none | all |
| inventory:adjust | stock_movements | create | all | own_station | own_station | own_station | none | own_station | all |
| stocktake:perform | stocktakes | create | all | own_station | own_station | own_station | none | own_station | all |
| asset:read | assets | read | all | own_station | own_station | own_station | own | own_station | all |
| asset:create | assets | create | all | own_station | own_station | own_station | none | none | all |
| asset:update | assets | update | all | own_station | own_station | own_station | none | none | all |
| asset:assign | asset_assignments | create | all | own_station | own_station | own_station | none | none | all |
| personnel:read | personnel | read | all | own_station | own_station | own_station | own | own_station | all |
| personnel:create | personnel | create | all | own_station | own_station | own_station | none | none | all |
| personnel:update | personnel | update | all | own_station | own_station | own_station | own | own_station | all |
| personnel:move | movement_legs | create | all | own_station | own_station | own_station | none | none | all |
| checkin:perform | check_ins | create | all | own_station | own_station | own_station | own | own_station | all |
| expedition:read | expeditions | read | all | own | own_station | own_station | own | own_station | all |
| expedition:create | expeditions | create | all | own | own_station | none | none | none | all |
| expedition:submit | expeditions | update | all | own | own_station | none | none | none | all |
| expedition:approve | expeditions | update | all | none | none | none | none | none | all |
| emergency:read | incidents | read | all | own_station | own_station | own_station | own | own_station | all |
| emergency:raise | incidents | create | all | own_station | own_station | own_station | own | own_station | all |
| emergency:acknowledge | incidents | update | all | own_station | own_station | own_station | none | own_station | all |
| emergency:respond | incidents | update | all | own_station | own_station | own_station | own | own_station | all |
| emergency:resolve | incidents | update | all | own_station | own_station | own_station | none | own_station | all |
| sync:push | sync | push | all | all | all | all | all | all | all |
| sync:pull | sync | pull | all | all | all | all | all | all | all |

## Permission Descriptions

### User Management
- **user:read** - View user information
- **user:create** - Create new users
- **user:update** - Update user information
- **user:delete** - Deactivate users

### Role Management
- **role:read** - View roles and permissions
- **role:create** - Create new roles
- **role:update** - Update roles

### Station Management
- **station:read** - View station information
- **station:create** - Create new stations
- **station:update** - Update station information

### Audit
- **audit:read** - View audit log

### Cargo Tracking
- **cargo:read** - View cargo/consignments
- **cargo:create** - Create cargo/consignments
- **cargo:update** - Update cargo/consignments
- **cargo:delete** - Delete cargo/consignments
- **custody:scan** - Scan cargo for custody transfer

### Inventory Management
- **inventory:read** - View inventory
- **inventory:receive** - Receive inventory
- **inventory:consume** - Consume inventory
- **inventory:transfer** - Transfer inventory
- **inventory:adjust** - Adjust inventory
- **stocktake:perform** - Perform stocktake

### Asset Management
- **asset:read** - View assets
- **asset:create** - Create assets
- **asset:update** - Update assets
- **asset:assign** - Assign assets to users

### Personnel Management
- **personnel:read** - View personnel information
- **personnel:create** - Create personnel records
- **personnel:update** - Update personnel information
- **personnel:move** - Move personnel between stations
- **checkin:perform** - Perform check-in/check-out

### Expedition Management
- **expedition:read** - View expeditions
- **expedition:create** - Create expeditions
- **expedition:submit** - Submit expeditions for approval
- **expedition:approve** - Approve expeditions

### Emergency Response
- **emergency:read** - View emergency incidents
- **emergency:raise** - Raise emergency incidents
- **emergency:acknowledge** - Acknowledge emergency incidents
- **emergency:respond** - Respond to emergency incidents
- **emergency:resolve** - Resolve emergency incidents

### Sync
- **sync:push** - Push data to server
- **sync:pull** - Pull data from server

## Implementation

The permission matrix is implemented in:
- Backend: `backend/app/services/permission_service.py`
- Enforced on every endpoint via decorators
- Frontend: `client/src/utils/permissions.js` (to be created)

## Notes

1. **Backend is authoritative** - All permission checks happen on the backend
2. **Frontend hides UI** - The frontend hides actions the user cannot perform, but the backend is the final authority
3. **Station-scoped access** - Users with a station_id can only access data for their station
4. **Command users** - Users with no station_id (Command/Goa) can access all stations
5. **Own records** - Some permissions allow users to only access their own records
