import re

DOMAIN_PATTERN = re.compile(
    r'^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$'
)


def is_valid_domain(domain: str) -> bool:
    return bool(DOMAIN_PATTERN.fullmatch(domain.strip()))
