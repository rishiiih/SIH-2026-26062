from marshmallow import Schema, fields, validate, validates, ValidationError

class UserSchema(Schema):
    id = fields.Str(dump_only=True)
    username = fields.Str(required=True)
    email = fields.Email(required=True)
    full_name = fields.Str(required=True)
    role_id = fields.Int()
    station_id = fields.Int(allow_none=True)
    is_active = fields.Bool()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class UserCreateSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    full_name = fields.Str(required=True, validate=validate.Length(max=255))
    role_id = fields.Int(required=True)
    station_id = fields.Int(allow_none=True)

class UserUpdateSchema(Schema):
    email = fields.Email()
    full_name = fields.Str(validate=validate.Length(max=255))
    role_id = fields.Int()
    station_id = fields.Int(allow_none=True)
    is_active = fields.Bool()
