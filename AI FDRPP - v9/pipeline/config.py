# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise ImportError("PyYAML is required to read config.yaml. Install it with: pip install pyyaml") from exc


DEFAULT_CONFIG = {
    "image": {"size": 512},
    "router": {
        "classifier_models": {},
        "labels": [],
        "input_size": 224,
        "top_k": 2,
        "confidence_threshold": 0.25,
        "group_mapping": {},
    },
    "detectors": {
        "confidence_threshold": 0.25,
        "iou_threshold": 0.45,
        "fallback_min_detections": 1,
        "ensemble": [],
        "groups": {},
    },
    "features": {
        "local_patch_size": 64,
        "local_patch_overlap": 0.5,
        "classifier_models": {},
        "fracture_type_labels": [],
        "classifier_input_size": 224,
        "gradcam_enabled": False,
    },
    "report_generation": {
        "enabled": True,
        "provider": "gemini",
        "model": "gemini-2.5-flash",
    },
    "cleanup": {
        "enabled": False,
        "retention_days": 30,
        "interval_minutes": 720,

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

        "min_age_seconds": 300,
        "dry_run": True,
        "max_disk_usage_mb": None,
        "paths": [
            "outputs/pdfs",
            "outputs/pdfs/htmls",
            "outputs/roi",
            "outputs/gradcam",
            "outputs/bbox",
            "outputs/temp",
        ],
        "per_path_retention": {
            "outputs/pdfs": 365,
            "outputs/pdfs/htmls": 30,
            "outputs/roi": 30,
            "outputs/gradcam": 30,
            "outputs/bbox": 30,
            "outputs/temp": 1,
        },
    },
}


def deep_merge(base, override):
    merged = dict(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_config(path="config.yaml"):
    config_path = Path(path)
    if not config_path.exists():
        return DEFAULT_CONFIG

    with config_path.open("r", encoding="utf-8") as f:
        loaded = yaml.safe_load(f) or {}

    return deep_merge(DEFAULT_CONFIG, loaded)


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]