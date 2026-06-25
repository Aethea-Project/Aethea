# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from datetime import datetime, timezone
from uuid import uuid4


def generate_request_id(prefix="req"):
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    suffix = uuid4().hex[:8]
    prefix = normalize_identifier(prefix, fallback_prefix="req")
    return f"{prefix}_{timestamp}_{suffix}"


def normalize_identifier(value, fallback_prefix="item"):

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

    text = str(value or "").strip()
    normalized = []

    for character in text:
        if character.isalnum() or character in {"-", "_"}:
            normalized.append(character)
        else:
            normalized.append("_")

    cleaned = "".join(normalized).strip("_")
    return cleaned or fallback_prefix


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]