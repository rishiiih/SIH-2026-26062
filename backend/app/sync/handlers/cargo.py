from app.models.cargo import Consignment
from app.sync.registry import register_handler

@register_handler('consignment')
def handle_consignment(db, user, operation, payload, base_version=1):
    entity_id = payload.get('id')
    
    if operation == 'create':
        existing = db.query(Consignment).filter(Consignment.id == entity_id).first()
        if existing:
            return True

        consignment = Consignment(
            id=entity_id,
            station_id=payload.get('station_id', user.station_id),
            version=payload.get('version', base_version),
            payload=payload
        )
        db.add(consignment)
        return True

    elif operation == 'update':
        consignment = db.query(Consignment).filter(Consignment.id == entity_id).first()
        if not consignment:
            return False 
        
        client_version = payload.get('version', base_version)
        if client_version < consignment.version:
            return False  # Conflict! Client has outdated version.
        
        consignment.payload = payload
        consignment.version = client_version
        return True

    elif operation == 'delete':
        consignment = db.query(Consignment).filter(Consignment.id == entity_id).first()
        if consignment:
            db.delete(consignment)
        return True

    return False