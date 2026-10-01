from sqlalchemy.orm import Session
from app.models.sync import SyncCursor, ChangeLog
from app.sync.registry import get_handler

class SyncService:
    @staticmethod
    def process_push(db: Session, user, mutations, device_id):
        results = []
        for mutation in mutations:
            outbox_id = mutation.id
            entity_type = mutation.entity_type
            operation = mutation.operation
            payload = mutation.payload
            
            handler = get_handler(entity_type)
            if not handler:
                results.append({"outbox_id": outbox_id, "success": False, "error": f"No handler for {entity_type}"})
                continue
                
            try:
                # The handler returns True on success, False on conflict
                success = handler(db, user, operation, payload)
                
                if success:
                    # Log to change_log so other devices can pull this change
                    change = ChangeLog(
                        entity_type=entity_type,
                        entity_id=payload.get('id'),
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
        changes = db.query(ChangeLog).filter(ChangeLog.seq > int(cursor_val)).order_by(ChangeLog.seq.asc()).all()
        formatted_changes = []
        highest_seq = int(cursor_val)
        
        for change in changes:
            formatted_changes.append({
                "entity_type": change.entity_type,
                "entity_id": change.entity_id,
                "operation": change.operation,
                "seq": change.seq
            })
            highest_seq = max(highest_seq, change.seq)
            
        sync_cursor = db.query(SyncCursor).filter(SyncCursor.user_id == user.id).first()
        if not sync_cursor:
            sync_cursor = SyncCursor(user_id=user.id, last_pull_version=highest_seq)
            db.add(sync_cursor)
        else:
            sync_cursor.last_pull_version = highest_seq
            
        db.commit()
        return formatted_changes, str(highest_seq)