from app.models.cargo import CustodyLog
from app.sync.registry import register_handler

@register_handler('custody_log')
def handle_custody_log(db, user, operation, payload, base_version=1):
    # We only allow 'create' operations for custody logs to prevent tampering
    if operation == 'create':
        entity_id = payload.get('id')
        
        # Idempotency check: if the client pushes it twice due to bad connection, ignore the second time
        existing = db.query(CustodyLog).filter(CustodyLog.id == entity_id).first()
        if existing:
            return True
            
        log = CustodyLog(
            id=entity_id,
            consignment_id=payload.get('consignment_id'),
            action=payload.get('action'),
            performed_by=user.id,
            station_id=user.station_id,
            notes=payload.get('notes', ''),
            signature_hash=payload.get('signature_hash', '')
        )
        db.add(log)
        return True
        
    # Reject updates and deletes
    return False