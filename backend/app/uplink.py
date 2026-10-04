import asyncio
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.sync import ChangeLog, SyncCursor
from app.sync.registry import get_handler


class UplinkWorker:
    """
    Background station uplink worker.
    Whenever CENTRAL_URL /api/health answers, pushes local ChangeLog rows to Central
    via /api/sync/push (preserving idempotency keys) and pulls Central updates.
    """

    def __init__(
        self,
        central_url: Optional[str] = None,
        station_id: Optional[int] = None,
        uplink_user: Optional[str] = None,
        uplink_password: Optional[str] = None,
        interval: float = 5.0,
    ):
        self.central_url = (central_url or os.environ.get("CENTRAL_URL", "http://localhost:5001")).rstrip("/")
        self.station_id = station_id if station_id is not None else int(os.environ.get("STATION_ID", "1"))
        self.uplink_user = uplink_user or os.environ.get("UPLINK_USER", f"station_{self.station_id}_service")
        self.uplink_password = uplink_password or os.environ.get("UPLINK_PASSWORD", "uplink123")
        self.interval = interval

        self.token: Optional[str] = None
        self.last_pushed_seq: int = 0
        self.last_pull_cursor: str = "0"
        self.is_connected: bool = False
        self._init_cursors_from_db()

    def _init_cursors_from_db(self):
        if SessionLocal is None:
            return
        with SessionLocal() as db:
            cursor_pushed = db.query(SyncCursor).filter(SyncCursor.user_id == f"uplink_pushed_{self.station_id}").first()
            if cursor_pushed:
                self.last_pushed_seq = cursor_pushed.last_pull_version or 0

            cursor_pulled = db.query(SyncCursor).filter(SyncCursor.user_id == f"uplink_pulled_{self.station_id}").first()
            if cursor_pulled:
                self.last_pull_cursor = str(cursor_pulled.last_pull_version or "0")

    def _save_cursors_to_db(self, db: Session):
        pushed = db.query(SyncCursor).filter(SyncCursor.user_id == f"uplink_pushed_{self.station_id}").first()
        if not pushed:
            pushed = SyncCursor(user_id=f"uplink_pushed_{self.station_id}", last_pull_version=self.last_pushed_seq)
            db.add(pushed)
        else:
            pushed.last_pull_version = self.last_pushed_seq

        pulled = db.query(SyncCursor).filter(SyncCursor.user_id == f"uplink_pulled_{self.station_id}").first()
        if not pulled:
            pulled = SyncCursor(user_id=f"uplink_pulled_{self.station_id}", last_pull_version=int(self.last_pull_cursor or 0))
            db.add(pulled)
        else:
            pulled.last_pull_version = int(self.last_pull_cursor or 0)
        db.commit()

    async def check_health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.central_url}/api/health")
                self.is_connected = (res.status_code == 200)
                return self.is_connected
        except Exception:
            self.is_connected = False
            return False

    async def authenticate(self) -> Optional[str]:
        if self.token:
            return self.token

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # 1. Attempt login
                login_res = await client.post(
                    f"{self.central_url}/api/auth/login",
                    data={"username": self.uplink_user, "password": self.uplink_password},
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )

                if login_res.status_code == 200:
                    self.token = login_res.json().get("access_token")
                    return self.token

                # 2. If user doesn't exist on Central, register service account
                if login_res.status_code in (401, 404):
                    reg_res = await client.post(
                        f"{self.central_url}/api/auth/register",
                        json={
                            "username": self.uplink_user,
                            "password": self.uplink_password,
                            "email": f"{self.uplink_user}@station.dhruv.local",
                            "full_name": f"Station {self.station_id} Uplink Service",
                            "station_id": self.station_id,
                            "role_id": 1,
                        },
                    )
                    if reg_res.status_code in (200, 201):
                        # Retry login after registration
                        retry_login = await client.post(
                            f"{self.central_url}/api/auth/login",
                            data={"username": self.uplink_user, "password": self.uplink_password},
                            headers={"Content-Type": "application/x-www-form-urlencoded"},
                        )
                        if retry_login.status_code == 200:
                            self.token = retry_login.json().get("access_token")
                            return self.token
        except Exception:
            pass

        return None

    async def push_to_central(self, db: Session, token: str) -> int:
        unsynced_logs = (
            db.query(ChangeLog)
            .filter(ChangeLog.seq > self.last_pushed_seq)
            .order_by(ChangeLog.seq.asc())
            .limit(50)
            .all()
        )

        if not unsynced_logs:
            return 0

        mutations = []
        highest_seq = self.last_pushed_seq

        for log in unsynced_logs:
            payload = log.serialized_data or log.data or {"id": log.entity_id}
            is_sos = bool(payload.get("is_sos", False)) if isinstance(payload, dict) else False
            priority = 100 if (log.entity_type == "incident" and is_sos) else 10

            # Preserve exact idempotency key: station-id + entity_id + seq
            idempotency_key = f"station-{self.station_id}-{log.entity_type}-{log.entity_id}"
            if not is_sos:
                idempotency_key += f"-{log.seq}"

            mutations.append({
                "id": f"uplink-{log.seq}",
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id),
                "operation": log.operation,
                "payload": payload,
                "base_version": 1,
                "idempotency_key": idempotency_key,
                "device_timestamp": log.created_at.isoformat() if log.created_at else datetime.now(timezone.utc).isoformat(),
                "priority": priority,
            })
            highest_seq = max(highest_seq, log.seq)

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.central_url}/api/sync/push",
                json={
                    "device_id": f"station-uplink-{self.station_id}",
                    "mutations": mutations,
                },
                headers={"Authorization": f"Bearer {token}"},
            )

            if res.status_code == 200:
                self.last_pushed_seq = highest_seq
                self._save_cursors_to_db(db)
                return len(mutations)
            elif res.status_code == 401:
                self.token = None

        return 0

    async def pull_from_central(self, db: Session, token: str) -> int:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.central_url}/api/sync/pull",
                json={"cursor": str(self.last_pull_cursor)},
                headers={"Authorization": f"Bearer {token}"},
            )

            if res.status_code == 200:
                data = res.json()
                changes = data.get("changes", [])
                new_cursor = data.get("new_cursor", self.last_pull_cursor)

                for change in changes:
                    entity_type = change.get("entity_type")
                    op = change.get("operation")
                    record_data = change.get("data")
                    handler = get_handler(entity_type)
                    if handler and record_data:
                        try:
                            # Apply locally
                            if hasattr(handler, "apply"):
                                handler.apply(db, None, op, record_data, 1)
                            elif callable(handler):
                                handler(db, None, op, record_data, 1)
                        except Exception:
                            pass

                self.last_pull_cursor = str(new_cursor)
                self._save_cursors_to_db(db)
                return len(changes)
            elif res.status_code == 401:
                self.token = None

        return 0

    async def run_cycle(self, db: Session) -> Dict[str, Any]:
        """Runs a single push-pull cycle."""
        healthy = await self.check_health()
        if not healthy:
            return {"connected": False, "pushed": 0, "pulled": 0}

        token = await self.authenticate()
        if not token:
            return {"connected": True, "authenticated": False, "pushed": 0, "pulled": 0}

        pushed = await self.push_to_central(db, token)
        pulled = await self.pull_from_central(db, token)
        return {"connected": True, "authenticated": True, "pushed": pushed, "pulled": pulled}

    async def run_loop(self):
        """Continuous background execution loop."""
        while True:
            try:
                await asyncio.sleep(self.interval)
                if SessionLocal is not None:
                    with SessionLocal() as db:
                        await self.run_cycle(db)
            except asyncio.CancelledError:
                break
            except Exception:
                pass


uplink_worker = UplinkWorker()
