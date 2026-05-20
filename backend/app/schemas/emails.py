from marshmallow import Schema, ValidationError, fields, validate


class EmailAccountCreateSchema(Schema):
    domain = fields.String(required=True, validate=validate.Length(min=3, max=255))
    local_part = fields.String(required=True, validate=validate.Regexp(r'^[a-zA-Z0-9._+-]{1,64}$'))
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))


class EmailPasswordUpdateSchema(Schema):
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))


class EmailAccountStatusSchema(Schema):
    enabled = fields.Boolean(required=True)


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        return schema.load(payload), None
    except ValidationError as exc:
        return None, exc.messages
