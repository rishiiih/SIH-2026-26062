# A simple registry pattern so we can add handlers without modifying core sync logic
SYNC_HANDLERS = {}

def register_handler(entity_type):
    def decorator(func):
        SYNC_HANDLERS[entity_type] = func
        return func
    return decorator

def get_handler(entity_type):
    return SYNC_HANDLERS.get(entity_type)