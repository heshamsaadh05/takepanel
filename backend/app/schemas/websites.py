from marshmallow import Schema, ValidationError, fields, validate

from app.utils.validators import is_valid_domain


class WebsiteCreateSchema(Schema):
    domain = fields.String(required=True, validate=validate.Length(min=3, max=253))
    server_type = fields.String(required=True, validate=validate.OneOf(['nginx', 'apache']))


class WebsiteUpdateSchema(Schema):
    server_type = fields.String(required=False, validate=validate.OneOf(['nginx', 'apache']))
    status = fields.String(required=False, validate=validate.OneOf(['running', 'stopped']))


def validate_website_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        data = schema.load(payload)
    except ValidationError as exc:
        return None, exc.messages

    if 'domain' in data and not is_valid_domain(data['domain']):
        return None, {'domain': ['invalid_domain_format']}

    return data, None
