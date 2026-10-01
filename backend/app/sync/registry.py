from app.services.permission_service import PermissionService

class EntityHandler:
    entity_type = None
    model = None
    permission_prefix = None
    is_ledger = False

    def apply(self, db, user, operation, payload, base_version):
        raise NotImplementedError

    def serialize(self, obj):
        raise NotImplementedError


class FunctionHandlerWrapper(EntityHandler):
    """Wraps a plain handler function into an EntityHandler compatible object."""
    def __init__(self, func, entity_type=None):
        self.func = func
        self.entity_type = entity_type

    def apply(self, db, user, operation, payload, base_version):
        return self.func(db, user, operation, payload, base_version)


_REGISTRY = {}

def register_handler(arg=None):
    """
    Supports multiple usages:
    1. @register_handler('consignment') on a class or function
    2. @register_handler on an EntityHandler class
    """
    def decorator(cls_or_func):
        key = arg if isinstance(arg, str) else getattr(cls_or_func, 'entity_type', None)

        if isinstance(cls_or_func, type) and issubclass(cls_or_func, EntityHandler):
            instance = cls_or_func()
        elif callable(cls_or_func) and not hasattr(cls_or_func, 'apply'):
            instance = FunctionHandlerWrapper(cls_or_func, entity_type=key)
        else:
            instance = cls_or_func() if isinstance(cls_or_func, type) else cls_or_func

        if not key:
            key = getattr(instance, 'entity_type', None)

        if key:
            _REGISTRY[key] = instance

        return cls_or_func

    if isinstance(arg, str):
        return decorator
    elif arg is not None:
        return decorator(arg)

    return decorator


# Maintain register alias
register = register_handler

def get_handler(entity_type):
    return _REGISTRY.get(entity_type)