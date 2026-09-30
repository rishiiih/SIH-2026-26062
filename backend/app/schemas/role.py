from marshmallow import Schema, fields, validate

class PermissionSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    description = fields.Str()
    resource = fields.Str(required=True)
    action = fields.Str(required=True)

class RoleSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(max=50))
    description = fields.Str()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    permissions = fields.List(fields.Nested(PermissionSchema), dump_only=True)
