from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.db import get_db
from app.models.user import User
from app.security import get_current_user
from app.services.sync_service import SyncService

router = APIRouter(prefix="/api/sync", tags=["Sync Engine"])

class Mutation(BaseModel):
    id: str
    entity_type: str
    entity_id: Optional[str] = None
    operation: str
    payload: Dict[str, Any]
    base_version: Optional[int] = 1
    idempotency_key: Optional[str] = None
    device_timestamp: Optional[str] = None
    priority: Optional[int] = 0

class PushPayload(BaseModel):
    device_id: str
    mutations: List[Mutation]

class PullPayload(BaseModel):
    cursor: str

@router.post("/push")
def push_changes(payload: PushPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = SyncService.process_push(db, current_user, payload.mutations, payload.device_id)
    return {"results": results}

@router.get("/pull")
def pull_changes_get(cursor: str = Query("0"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    changes, new_cursor, has_more = SyncService.process_pull(db, current_user, cursor)
    return {"changes": changes, "new_cursor": new_cursor, "has_more": has_more}

@router.post("/pull")
def pull_changes_post(payload: PullPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    changes, new_cursor, has_more = SyncService.process_pull(db, current_user, payload.cursor)
    return {"changes": changes, "new_cursor": new_cursor, "has_more": has_more}