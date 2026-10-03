#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
CLIENT_DIR="$ROOT_DIR/client"
if [[ -z "${PYTHON_BIN:-}" ]]; then
  if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
  else
    PYTHON_BIN="python"
  fi
fi
SKIP_LINT="${SKIP_LINT:-0}"
CHECK_API="${CHECK_API:-0}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() {
  printf "${GREEN}PASS${NC} %s\n" "$1"
}

warn() {
  printf "${YELLOW}WARN${NC} %s\n" "$1"
}

fail() {
  printf "${RED}FAIL${NC} %s\n" "$1"
  exit 1
}

section() {
  printf "\n${BLUE}[%s] %s${NC}\n" "$1" "$2"
}

cd "$ROOT_DIR"

echo "DHRUV pre-feature validation"
echo "Project: $ROOT_DIR"

if [[ ! -d "$BACKEND_DIR" ]]; then
  fail "backend directory not found"
fi

if [[ ! -d "$CLIENT_DIR" ]]; then
  fail "client directory not found"
fi

section "0A" "Bug fixes, ports, naming, and boot checks"

if rg -n \
  "localhost:5000|IND-GOA-01|Goa Command|Polar Ops Build 1042|DHRUV v2\\.4\\.1" \
  README.md docs backend/app client/src client/vite.config.js \
  --glob '!client/dist/**' \
  --glob '!backend/venv/**' \
  --glob '!backend/.venv/**' \
  --glob '!**/__pycache__/**'
then
  fail "stale 0A strings were found"
else
  pass "no stale 0A port, Goa, or fake build strings found"
fi

if rg -n \
  "registerSW|serviceWorker\\.register" \
  client/src/main.jsx
then
  pass "PWA registration configuration found"
else
  fail "PWA registration configuration missing"
fi

if [[ "$CHECK_API" == "1" ]]; then
  if curl -fsS http://localhost:5001/api/health >/dev/null; then
    pass "backend health endpoint responded"
  else
    fail "backend health endpoint did not respond"
  fi
else
  warn "live API check skipped; run with CHECK_API=1"
fi

section "0B" "Foundation models and database schema"

cd "$BACKEND_DIR"

if ! "$PYTHON_BIN" -m compileall -q app; then
  fail "backend Python compilation failed"
else
  pass "backend Python files compile"
fi

if ! PYTHONPATH=. "$PYTHON_BIN" - <<'PY'
import app.models
from app.db import Base

required_tables = {
    "consignments",
    "consignment_items",
    "custody_scans",
    "inventory_items",
    "stock_movements",
    "personnel",
    "check_ins",
    "assets",
    "maintenance_records",
    "incidents",
    "incident_updates",
    "alerts",
    "change_log",
    "sync_receipts",
}

actual_tables = set(Base.metadata.tables)
missing_tables = required_tables - actual_tables

if missing_tables:
    raise SystemExit(
        f"Missing SQLAlchemy tables: {sorted(missing_tables)}"
    )

from app.models.sync import ChangeLog, SyncReceipt

if not hasattr(ChangeLog, "data"):
    raise SystemExit("ChangeLog.data is missing")

if not hasattr(SyncReceipt, "user_id"):
    raise SystemExit("SyncReceipt.user_id is missing")

print("Foundation models and sync columns are registered")
PY
then
  fail "foundation model validation failed"
else
  pass "foundation models and sync columns are present"
fi

HEAD="$(
  PYTHONPATH=. "$PYTHON_BIN" -m alembic heads \
    | awk 'NF { print $1; exit }'
)"

CURRENT="$(
  PYTHONPATH=. "$PYTHON_BIN" -m alembic current \
    | awk 'NF { print $1; exit }'
)"

if [[ -z "$HEAD" ]]; then
  fail "could not determine Alembic head"
fi

if [[ -z "$CURRENT" ]]; then
  fail "could not determine current Alembic revision"
fi

if [[ "$CURRENT" == "$HEAD" ]]; then
  pass "database is at Alembic head: $HEAD"
else
  fail "database revision $CURRENT does not match head $HEAD"
fi

section "1" "Backend sync API"

if ! PYTHONPATH=. "$PYTHON_BIN" -m pytest \
  --import-mode=importlib \
  tests/test_sync.py -q
then
  fail "backend sync tests failed"
else
  pass "backend sync tests passed"
fi

section "2" "Client offline sync"

cd "$CLIENT_DIR"

if [[ ! -d node_modules ]]; then
  warn "client/node_modules missing; running npm install"
  npm install
fi

if ! npm run build; then
  fail "frontend production build failed"
else
  pass "frontend production build passed"
fi

if [[ "$SKIP_LINT" == "1" ]]; then
  warn "frontend lint skipped because SKIP_LINT=1"
else
  if npm run lint; then
    pass "frontend lint passed"
  else
    fail "frontend lint failed; use SKIP_LINT=1 only to inspect other checks"
  fi
fi

REQUIRED_CLIENT_FILES=(
  "src/db/dexie.js"
  "src/sync/outbox.js"
  "src/sync/mutations.js"
  "src/sync/sync-engine.js"
  "src/components/layout/Header.jsx"
  "src/pages/SyncConflicts.jsx"
)

for file in "${REQUIRED_CLIENT_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    fail "missing client sync file: client/$file"
  fi
done

pass "client sync files are present"

if rg -q "saveAndQueue" src/sync/mutations.js; then
  pass "offline mutation queue is present"
else
  fail "saveAndQueue is missing"
fi

if rg -q "/api/sync/push" src/sync/sync-engine.js; then
  pass "client push endpoint is configured"
else
  fail "client push endpoint is missing"
fi

if rg -q "sync_conflicts" src/pages/SyncConflicts.jsx; then
  pass "conflict page is connected to sync_conflicts"
else
  fail "conflict store is not connected to the conflict page"
fi

section "3" "AI/NLP engine and incident processing"

cd "$BACKEND_DIR"

if ! PYTHONPATH=. "$PYTHON_BIN" -m pytest \
  --import-mode=importlib \
  tests/test_incidents.py -q
then
  fail "backend incident and AI processing tests failed"
else
  pass "backend incident and AI processing tests passed"
fi

printf "\n${GREEN}All requested feature checks passed.${NC}\n"
printf "Features checked: 0A, 0B, 1, 2, and 3.\n"