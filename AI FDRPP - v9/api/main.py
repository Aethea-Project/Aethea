# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from utils import OUTPUT_ROOT, ensure_output_dirs
from api.routes import router as api_router
import asyncio
import logging

import os
from pipeline.config import load_config
from utils.cleanup import run_cleanup_from_config
from api.dependencies import get_config_path, preload_pipeline

logger = logging.getLogger("fdrpp.api")


def create_app() -> FastAPI:
    ensure_output_dirs()
    app = FastAPI(title="Fracture Detection API")

    # Mount outputs as static files
    app.mount("/outputs", StaticFiles(directory=str(OUTPUT_ROOT)), name="outputs")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    # Load the model pipeline before the API accepts analyze requests.

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

    @app.on_event("startup")
    async def startup_tasks():
        logger.info("Preloading fracture pipeline at startup")
        preload_pipeline()

        cfg = load_config(get_config_path())
        cleanup_cfg = cfg.get("cleanup", {}) or {}
        if not cleanup_cfg.get("enabled", False):
            logger.debug("Cleanup disabled in config")
            return

        # singleton behavior: only run cleanup on leader instance when configured
        singleton = cleanup_cfg.get("singleton", False)
        if singleton:
            leader_flag = os.environ.get("RUN_CLEANUP_LEADER", "0")
            if leader_flag != "1":
                logger.info("Cleanup singleton enabled but this instance is not leader (set RUN_CLEANUP_LEADER=1 to enable)")
                return

        interval = cleanup_cfg.get("interval_minutes", 720) * 60

        async def loop():
            while True:
                try:
                    logger.info("Starting scheduled cleanup run (dry_run=%s)", cleanup_cfg.get("dry_run"))
                    run_cleanup_from_config(cfg)
                except Exception:
                    logger.exception("Scheduled cleanup failed")
                await asyncio.sleep(interval)

        asyncio.create_task(loop())

    return app


app = create_app()


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]