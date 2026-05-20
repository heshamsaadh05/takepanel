from marshmallow import Schema, ValidationError, fields, validate


class FTPAccountCreateSchema(Schema):
    username = fields.String(required=True, validate=validate.Regexp(r'^[a-z_][a-z0-9_-]{2,31}$'))
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))
    protocol = fields.String(
        required=False,
        load_default='vsftpd',
        validate=validate.OneOf(['vsftpd', 'proftpd', 'openssh-sftp']),
    )
    home_directory = fields.String(required=True, validate=validate.Length(min=2, max=512))
    permissions = fields.String(required=False, load_default='rw', validate=validate.OneOf(['r', 'rw']))


class FTPAccountUpdateSchema(Schema):
    home_directory = fields.String(required=False, validate=validate.Length(min=2, max=512))
    permissions = fields.String(required=False, validate=validate.OneOf(['r', 'rw']))


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        return schema.load(payload), None
    except ValidationError as exc:
        return None, exc.messages
