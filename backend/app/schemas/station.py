from marshmallow import Schema, fields, validate


class StationSchema(Schema):
    id = fields.Int(dump_only=True)

    name = fields.Str(
        required=True,
        validate=validate.Length(max=100),
    )

    code = fields.Str(
        required=True,
        validate=validate.Length(max=10),
    )

    location = fields.Str(
        required=True,
        validate=validate.Length(max=100),
    )

    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)

    region = fields.Str(
        required=True,
        validate=validate.OneOf(
            [
                "antarctica",
                "arctic",
                "mainland",
            ]
        ),
    )

    timezone = fields.Str(required=True)
    is_active = fields.Bool()
    created_at = fields.DateTime(dump_only=True)