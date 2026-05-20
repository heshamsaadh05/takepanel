from marshmallow import Schema, ValidationError, fields, validate


class DatabaseCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Regexp(r'^[a-zA-Z0-9_]{1,64}$'))
    engine = fields.String(required=False, load_default='mysql', validate=validate.OneOf(['mysql', 'mariadb']))


class DatabaseUserCreateSchema(Schema):
    username = fields.String(required=True, validate=validate.Regexp(r'^[a-zA-Z0-9_]{1,64}$'))
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))
    host = fields.String(required=False, load_default='%', validate=validate.Length(min=1, max=255))


class GrantPrivilegesSchema(Schema):
    database_id = fields.Integer(required=True)
    db_user_id = fields.Integer(required=True)
    privileges = fields.String(
        required=True,
        validate=validate.Regexp(r'^[A-Z_, ]{4,512}$'),
    )


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        return schema.load(payload), None
    except ValidationError as exc:
        return None, exc.messages
