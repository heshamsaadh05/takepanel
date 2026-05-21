from marshmallow import Schema, ValidationError, fields, validate


class LoginSchema(Schema):
    # Accept both legacy email and Linux username identifiers.
    email = fields.String(required=False, validate=validate.Length(min=1, max=255))
    username = fields.String(required=False, validate=validate.Length(min=1, max=255))
    identifier = fields.String(required=False, validate=validate.Length(min=1, max=255))
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))


class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))
    role = fields.String(required=False, validate=validate.OneOf(['admin', 'reseller', 'user']))


class UserUpdateSchema(Schema):
    email = fields.Email(required=False)
    password = fields.String(required=False, validate=validate.Length(min=10, max=128))
    role = fields.String(required=False, validate=validate.OneOf(['admin', 'reseller', 'user']))
    is_active = fields.Boolean(required=False)


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        return schema.load(payload), None
    except ValidationError as exc:
        return None, exc.messages
