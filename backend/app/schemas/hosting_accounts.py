from marshmallow import Schema, ValidationError, fields, validate

from app.utils.validators import is_valid_domain


class HostingAccountCreateSchema(Schema):
    domain = fields.String(required=True, validate=validate.Length(min=3, max=253))
    username = fields.String(required=True, validate=validate.Regexp(r'^[a-z_][a-z0-9_-]{2,31}$'))
    password = fields.String(required=True, validate=validate.Length(min=10, max=128))
    confirm_password = fields.String(required=True, validate=validate.Length(min=10, max=128))
    email = fields.Email(required=True, validate=validate.Length(max=320))
    package_name = fields.String(required=False, load_default='starter', validate=validate.Length(min=1, max=64))
    select_options_manually = fields.Boolean(required=False, load_default=False)
    server_type = fields.String(required=False, load_default='nginx', validate=validate.OneOf(['nginx', 'apache']))
    cgi_access = fields.Boolean(required=False, load_default=True)
    cpanel_theme = fields.String(
        required=False,
        load_default='jupiter',
        validate=validate.OneOf(['jupiter', 'paper_lantern', 'classic']),
    )
    locale = fields.String(required=False, load_default='en', validate=validate.Length(min=2, max=32))
    enable_apache_spamassassin = fields.Boolean(required=False, load_default=False)
    enable_spam_box = fields.Boolean(required=False, load_default=False)
    mail_routing = fields.String(
        required=False,
        load_default='local',
        validate=validate.OneOf(['local', 'remote', 'auto']),
    )
    shell_access = fields.Boolean(required=False, load_default=False)
    dns_enabled = fields.Boolean(required=False, load_default=True)


def validate_payload(schema_cls: type[Schema], payload: dict):
    schema = schema_cls()
    try:
        data = schema.load(payload)
    except ValidationError as exc:
        return None, exc.messages

    if 'domain' in data and not is_valid_domain(data['domain']):
        return None, {'domain': ['invalid_domain_format']}

    return data, None
