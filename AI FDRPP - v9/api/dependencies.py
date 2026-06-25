# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

import os
import logging
from functools import lru_cache
import sys
from pathlib import Path

from pipeline.main import FracturePipeline

try:
    from utils.environment import load_environment
    from utils import ensure_output_dirs
except ModuleNotFoundError:
    p = Path(__file__).resolve()
    repo_root = None
    for _ in range(6):
        candidate = p
        if (candidate / "utils").exists():
            repo_root = str(candidate)
            break
        p = p.parent
    if repo_root is None:
        repo_root = str(Path(__file__).resolve().parents[2])
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
    from utils.environment import load_environment
    from utils import ensure_output_dirs


load_environment()


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

logger = logging.getLogger("fdrpp.api")


def get_config_path() -> str:
    return os.environ.get("FDRPP_CONFIG_PATH", "config.yaml")


@lru_cache(maxsize=1)
def _load_pipeline(config_path: str):
    ensure_output_dirs()
    logger.info("Loading fracture pipeline models from config: %s", config_path)
    pipeline = FracturePipeline(config_path=config_path)
    logger.info("Fracture pipeline models loaded")
    return pipeline


def get_pipeline():
    """Return the process-wide FracturePipeline singleton."""
    return _load_pipeline(get_config_path())


def preload_pipeline():
    """Eagerly load the cached pipeline during API startup."""
    return get_pipeline()


def clear_pipeline_cache():
    """Clear the cached pipeline, mainly for tests or explicit reloads."""
    _load_pipeline.cache_clear()


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]