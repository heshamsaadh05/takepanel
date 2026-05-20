from marshmallow import Schema, ValidationError, fields, validate


class MonitoringThresholdSchema(Schema):
    cpu = fields.Float(required=False, load_default=85.0, validate=validate.Range(min=1, max=100))
    ram = fields.Float(required=False, load_default=85.0, validate=validate.Range(min=1, max=100))
    disk = fields.Float(required=False, load_default=90.0, validate=validate.Range(min=1, max=100))
    network_mbps = fields.Float(required=False, load_default=500.0, validate=validate.Range(min=1))


class SSLSetupSchema(Schema):
    domain = fields.String(required=True, validate=validate.Length(min=3, max=255))
    email = fields.Email(required=True)


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        return schema.load(payload), None
    except ValidationError as exc:
        return None, exc.messages
