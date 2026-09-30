# DHRUV API Documentation

Base URL: `http://localhost:5000` (development)

All endpoints require authentication unless noted otherwise.

## Authentication

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response:
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "full_name": "string",
    "role_id": "integer",
    "station_id": "integer | null",
    "is_active": "boolean",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

### Refresh Token
```
POST /api/auth/refresh
Authorization: Bearer <refresh_token>

Response:
{
  "access_token": "string"
}
```

### Logout
```
POST /api/auth/logout
Authorization: Bearer <access_token>

Response:
{
  "message": "Logged out successfully"
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <access_token>

Response:
{
  "id": "string",
  "username": "string",
  "email": "string",
  "full_name": "string",
  "role_id": "integer",
  "station_id": "integer | null",
  "is_active": "boolean",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Users

### List Users
```
GET /api/users
Authorization: Bearer <access_token>

Query Parameters:
- None (filtered by user's role/station permissions)

Response:
[
  {
    "id": "string",
    "username": "string",
    "email": "string",
    "full_name": "string",
    "role_id": "integer",
    "station_id": "integer | null",
    "is_active": "boolean",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
]
```

### Get User
```
GET /api/users/:id
Authorization: Bearer <access_token>

Response:
{
  "id": "string",
  "username": "string",
  "email": "string",
  "full_name": "string",
  "role_id": "integer",
  "station_id": "integer | null",
  "is_active": "boolean",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Create User
```
POST /api/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "string (3-50 chars)",
  "email": "valid email",
  "password": "string (min 8 chars)",
  "full_name": "string (max 255 chars)",
  "role_id": "integer",
  "station_id": "integer | null"
}

Response:
{
  "message": "User created successfully",
  "user": { ... }
}
```

### Update User
```
PUT /api/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "valid email (optional)",
  "full_name": "string (optional)",
  "role_id": "integer (optional)",
  "station_id": "integer | null (optional)",
  "is_active": "boolean (optional)"
}

Response:
{
  "message": "User updated successfully",
  "user": { ... }
}
```

### Deactivate User
```
DELETE /api/users/:id
Authorization: Bearer <access_token>

Response:
{
  "message": "User deactivated successfully"
}
```

## Roles

### List Roles
```
GET /api/roles
Authorization: Bearer <access_token>

Response:
[
  {
    "id": "integer",
    "name": "string",
    "description": "string",
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "permissions": [
      {
        "id": "integer",
        "name": "string",
        "description": "string",
        "resource": "string",
        "action": "string"
      }
    ]
  }
]
```

### Get Role
```
GET /api/roles/:id
Authorization: Bearer <access_token>

Response:
{
  "id": "integer",
  "name": "string",
  "description": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "permissions": [ ... ]
}
```

### Create Role
```
POST /api/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "string (max 50 chars)",
  "description": "string"
}

Response:
{
  "id": "integer",
  "name": "string",
  "description": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Update Role
```
PUT /api/roles/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "string (optional)",
  "description": "string (optional)"
}

Response:
{
  "id": "integer",
  "name": "string",
  "description": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### List Permissions
```
GET /api/roles/permissions
Authorization: Bearer <access_token>

Response:
[
  {
    "id": "integer",
    "name": "string",
    "description": "string",
    "resource": "string",
    "action": "string"
  }
]
```

## Stations

### List Stations
```
GET /api/stations
Authorization: Bearer <access_token>

Response:
[
  {
    "id": "integer",
    "name": "string",
    "code": "string",
    "location": "string",
    "latitude": "number",
    "longitude": "number",
    "region": "antarctica | arctic",
    "timezone": "string",
    "is_active": "boolean",
    "created_at": "ISO8601"
  }
]
```

### Get Station
```
GET /api/stations/:id
Authorization: Bearer <access_token>

Response:
{
  "id": "integer",
  "name": "string",
  "code": "string",
  "location": "string",
  "latitude": "number",
  "longitude": "number",
  "region": "antarctica | arctic",
  "timezone": "string",
  "is_active": "boolean",
  "created_at": "ISO8601"
}
```

### Create Station
```
POST /api/stations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "string (max 100 chars)",
  "code": "string (max 10 chars)",
  "location": "string (max 100 chars)",
  "latitude": "number",
  "longitude": "number",
  "region": "antarctica | arctic",
  "timezone": "string",
  "is_active": "boolean (default: true)"
}

Response:
{
  "id": "integer",
  "name": "string",
  "code": "string",
  "location": "string",
  "latitude": "number",
  "longitude": "number",
  "region": "antarctica | arctic",
  "timezone": "string",
  "is_active": "boolean",
  "created_at": "ISO8601"
}
```

### Update Station
```
PUT /api/stations/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "string (optional)",
  "code": "string (optional)",
  "location": "string (optional)",
  "latitude": "number (optional)",
  "longitude": "number (optional)",
  "region": "antarctica | arctic (optional)",
  "timezone": "string (optional)",
  "is_active": "boolean (optional)"
}

Response:
{
  "id": "integer",
  "name": "string",
  "code": "string",
  "location": "string",
  "latitude": "number",
  "longitude": "number",
  "region": "antarctica | arctic",
  "timezone": "string",
  "is_active": "boolean",
  "created_at": "ISO8601"
}
```

## Audit Log

### Query Audit Log
```
GET /api/audit-log
Authorization: Bearer <access_token>

Query Parameters:
- user_id: string (optional)
- entity_type: string (optional)
- entity_id: string (optional)
- station_id: integer (optional)
- limit: integer (default: 100)

Response:
[
  {
    "id": "string",
    "user_id": "string",
    "username": "string",
    "action": "string",
    "entity_type": "string",
    "entity_id": "string",
    "before_data": "object | null",
    "after_data": "object | null",
    "device_timestamp": "ISO8601 | null",
    "server_timestamp": "ISO8601",
    "station_id": "integer | null",
    "ip_address": "string | null",
    "user_agent": "string | null"
  }
]
```

### Get Audit Entry
```
GET /api/audit-log/:id
Authorization: Bearer <access_token>

Response:
{
  "id": "string",
  "user_id": "string",
  "username": "string",
  "action": "string",
  "entity_type": "string",
  "entity_id": "string",
  "before_data": "object | null",
  "after_data": "object | null",
  "device_timestamp": "ISO8601 | null",
  "server_timestamp": "ISO8601",
  "station_id": "integer | null",
  "ip_address": "string | null",
  "user_agent": "string | null"
}
```

## Sync (Phase 3)

### Push Mutations
```
POST /api/sync/push
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "mutations": [
    {
      "id": "string",
      "user_id": "string",
      "device_id": "string",
      "entity_type": "string",
      "entity_id": "string",
      "operation": "create | update | delete",
      "payload": "object",
      "idempotency_key": "string",
      "device_timestamp": "ISO8601"
    }
  ],
  "device_id": "string"
}

Response:
{
  "results": [
    {
      "outbox_id": "string",
      "success": "boolean",
      "conflict": "boolean",
      "error": "string | null"
    }
  ]
}
```

### Pull Changes
```
POST /api/sync/pull
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "cursor": "string (last sync version)",
  "user_id": "string"
}

Response:
{
  "changes": [
    {
      "entity_type": "string",
      "operation": "create | update | delete",
      "data": "object",
      "version": "string"
    }
  ],
  "new_cursor": "string"
}
```

## Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Permission denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

Rate limiting will be implemented in Phase 7.

## Pagination

Pagination will be implemented in Phase 2 for list endpoints.
