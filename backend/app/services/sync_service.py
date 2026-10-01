from sqlalchemy.orm import Session
from app.models.sync import SyncCursor, ChangeLog
from app.sync.registry import get_handler

class SyncService:
    @staticmethod
    def process_push(db: Session, user, mutations, device_id):
        results = []
        for mutation in mutations:
            # Convert Pydantic model instance to dict if needed
            m_dict = mutation.model_dump() if hasattr(mutation, "model_dump") else mutation.dict() if hasattr(mutation, "dict") else mutation

            outbox_id = m_dict.get("id") or m_dict.get("outbox_id")
            entity_type = m_dict.get("entity_type")
            operation = m_dict.get("operation")
            payload = m_dict.get("payload", {}) or {}
            base_version = m_dict.get("base_version", 1)

            handler = get_handler(entity_type)
            if not handler:
                results.append({
                    "outbox_id": outbox_id,
                    "success": False,
                    "error": f"No handler registered for {entity_type}"
                })
                continue

            try:
                # Safely execute .apply() on EntityHandler or directly call handler
                if hasattr(handler, "apply"):
                    success = handler.apply(db, user, operation, payload, base_version)
                elif callable(handler):
                    success = handler(db, user, operation, payload, base_version)
                else:
                    raise TypeError(f"Handler for {entity_type} is not callable and has no apply method")

                if success:
                    # Fallback chain to ensure entity_id is never None
                    entity_id = payload.get("id") or payload.get("code") or outbox_id

                    change = ChangeLog(
                        entity_type=entity_type,
                        entity_id=entity_id,
                        station_id=user.station_id,
                        operation=operation
                    )
                    db.add(change)
                    results.append({"outbox_id": outbox_id, "success": True})
                else:
                    results.append({"outbox_id": outbox_id, "success": False, "conflict": True})
            except Exception as e:
                results.append({"outbox_id": outbox_id, "success": False, "error": str(e)})

        db.commit()
        return results

    @staticmethod
    def process_pull(db: Session, user, cursor_val):
        try:
            cursor_seq = int(cursor_val)
        except (ValueError, TypeError):
            cursor_seq = 0

        # Query all operations with a sequence higher than the client's current cursor
        query = db.query(ChangeLog).filter(ChangeLog.seq > cursor_seq)
        
        # Scope filter: restrict pull results to the user's station if not command level
        if user.station_id:
            query = query.filter(
                (ChangeLog.station_id == user.station_id) | (ChangeLog.station_id.is_(None))
            )

        changes = query.order_by(ChangeLog.seq.asc()).all()
        formatted_changes = []
        highest_seq = cursor_seq

        for change in changes:
            formatted_changes.append({
                "entity_type": change.entity_type,
                "entity_id": change.entity_id,
                "operation": change.operation,
                "seq": change.seq
            })
            highest_seq = max(highest_seq, change.seq)

        # Update cursor tracker
        sync_cursor = db.query(SyncCursor).filter(SyncCursor.user_id == user.id).first()
        if not sync_cursor:
            sync_cursor = SyncCursor(user_id=user.id, last_pull_version=highest_seq)
            db.add(sync_cursor)
        else:
            sync_cursor.last_pull_version = highest_seq

        db.commit()
        return formatted_changes, str(highest_seq)