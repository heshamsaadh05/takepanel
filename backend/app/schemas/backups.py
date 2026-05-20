from marshmallow import Schema, ValidationError, fields, validate


class BackupRunSchema(Schema):
    backup_type = fields.String(required=False, load_default='full', validate=validate.OneOf(['full']))


class BackupRestoreSchema(Schema):
    backup_id = fields.Integer(required=True)


class BackupScheduleSchema(Schema):
    cron_expression = fields.String(required=True, validate=validate.Length(min=5, max=64))
    is_enabled = fields.Boolean(required=False, load_default=True)


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        return schema.load(payload), None
    except ValidationError as exc:
        return None, exc.messages
