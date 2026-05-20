from marshmallow import Schema, ValidationError, fields, validate


class DNSZoneCreateSchema(Schema):
    domain = fields.String(required=True, validate=validate.Length(min=3, max=255))
    provider = fields.String(required=False, load_default='bind', validate=validate.OneOf(['bind', 'powerdns']))


class DNSRecordCreateSchema(Schema):
    zone_id = fields.Integer(required=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    record_type = fields.String(required=True, validate=validate.OneOf(['A', 'CNAME', 'MX', 'TXT']))
    value = fields.String(required=True, validate=validate.Length(min=1, max=1024))
    ttl = fields.Integer(required=False, load_default=3600, validate=validate.Range(min=60, max=86400))
    priority = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=0, max=65535))


class DNSRecordUpdateSchema(Schema):
    name = fields.String(required=False, validate=validate.Length(min=1, max=255))
    value = fields.String(required=False, validate=validate.Length(min=1, max=1024))
    ttl = fields.Integer(required=False, validate=validate.Range(min=60, max=86400))
    priority = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=0, max=65535))


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        return schema.load(payload), None
    except ValidationError as exc:
        return None, exc.messages
