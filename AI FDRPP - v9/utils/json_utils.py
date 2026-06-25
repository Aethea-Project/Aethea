# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from dataclasses import asdict, is_dataclass
from pathlib import Path


def to_json_safe(value):
    if is_dataclass(value):
        return to_json_safe(asdict(value))

    if isinstance(value, Path):
        return str(value)

    if isinstance(value, dict):
        return {
            str(to_json_safe(key)): to_json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple, set)):
        return [to_json_safe(item) for item in value]

    converted = _convert_numpy(value)
    if converted is not value:
        return to_json_safe(converted)

    converted = _convert_torch(value)
    if converted is not value:
        return to_json_safe(converted)

    return value

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]



def _convert_numpy(value):
    try:
        import numpy as np
    except ImportError:
        return value

    if isinstance(value, np.ndarray):
        return value.tolist()

    if isinstance(value, np.generic):
        return value.item()

    return value


def _convert_torch(value):
    try:
        import torch
    except ImportError:
        return value

    if isinstance(value, torch.Tensor):
        if value.ndim == 0:
            return value.detach().cpu().item()
        return value.detach().cpu().tolist()

    return value


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]