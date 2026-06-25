# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

import logging
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Tuple

import requests

logger = logging.getLogger("fdrpp.cleanup")


def _iter_files(paths: List[str]):
    for p in paths:
        root = Path(p)
        if not root.exists():
            continue
        for fp in root.rglob("*"):
            if fp.is_file():
                yield fp


def _bytes_to_mb(b: int) -> float:
    return b / 1024.0 / 1024.0


def _cleanup_supabase_storage(retention_days: int = 30, dry_run: bool = False) -> Dict:
    """Delete objects from Supabase bucket and metadata rows older than retention_days."""
    from utils.supabase_storage import get_project_url, get_secret_key, get_bucket_name
    from utils.verification_metadata import META_TABLE

    project_url = get_project_url()
    secret_key = get_secret_key()
    if not project_url or not secret_key:
        return {"skipped": True, "reason": "Supabase not configured"}

    bucket = get_bucket_name()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    cutoff = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()

    # Find expired metadata records
    endpoint = f"{project_url}/rest/v1/{META_TABLE}"
    params = {"timestamp": f"lt.{cutoff}", "select": "report_id,lang"}
    resp = requests.get(endpoint, headers=headers, params=params, timeout=30)

    if resp.status_code >= 400:
        return {"skipped": True, "reason": f"Failed to query metadata: {resp.status_code}"}

    expired_records = resp.json() if resp.content else []
    if not isinstance(expired_records, list):
        expired_records = []

    deleted_storage = 0
    deleted_meta = 0
    errors = []

    # Collect unique report_ids to delete from storage
    report_ids = list({r["report_id"] for r in expired_records if r.get("report_id")})

    for report_id in report_ids:
        if dry_run:
            logger.info("DRY_RUN would delete bucket folder: %s/", report_id)
            continue

        # Delete the folder from the bucket (list then remove)
        list_endpoint = f"{project_url}/storage/v1/object/list/{bucket}"
        list_resp = requests.post(
            list_endpoint,
            headers=headers,
            json={"prefix": f"{report_id}/", "limit": 1000},
            timeout=30,
        )

        if list_resp.status_code < 400:
            objects = list_resp.json() if list_resp.content else []
            if isinstance(objects, list) and objects:
                paths_to_delete = [f"{report_id}/{obj['name']}" for obj in objects if obj.get("name")]
                if paths_to_delete:
                    del_endpoint = f"{project_url}/storage/v1/object/{bucket}"
                    del_resp = requests.delete(
                        del_endpoint,
                        headers=headers,
                        json={"prefixes": paths_to_delete},
                        timeout=30,
                    )
                    if del_resp.status_code < 400:
                        deleted_storage += len(paths_to_delete)
                    else:
                        errors.append(f"Failed to delete objects for {report_id}: {del_resp.status_code}")
        else:
            errors.append(f"Failed to list objects for {report_id}: {list_resp.status_code}")

    # Delete expired metadata rows from the database
    if not dry_run and report_ids:
        del_meta_endpoint = f"{project_url}/rest/v1/{META_TABLE}"
        del_resp = requests.delete(
            del_meta_endpoint,
            headers=headers,
            params={"timestamp": f"lt.{cutoff}"},
            timeout=30,
        )
        if del_resp.status_code < 400:
            deleted_meta = len(expired_records)
        else:
            errors.append(f"Failed to delete metadata rows: {del_resp.status_code}")
    elif dry_run:
        logger.info("DRY_RUN would delete %d metadata rows", len(expired_records))

    return {
        "dry_run": dry_run,
        "expired_report_ids": len(report_ids),
        "deleted_storage_objects": deleted_storage,
        "deleted_meta_rows": deleted_meta,
        "errors": errors,
    }


def do_cleanup(
    paths: List[str],
    retention_days: int = 30,
    min_age_seconds: int = 300,
    dry_run: bool = False,
    max_disk_usage_mb: Optional[int] = None,
    per_path_retention: Optional[Dict[str, int]] = None,
    move_to_trash: bool = False,
    trash_path: Optional[str] = None,
) -> Dict:
    """Delete files older than retention_days under given paths.

    Returns a summary dict. Operates in dry_run mode by default.
    """
    now = time.time()

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

    retention_seconds = retention_days * 86400
    candidates: List[Tuple[float, Path]] = []
    freed_bytes = 0
    considered = 0

    per_path_retention = per_path_retention or {}

    # collect candidates
    for fp in _iter_files(paths):
        try:
            stat = fp.stat()
        except FileNotFoundError:
            continue
        mtime = stat.st_mtime
        age = now - mtime
        considered += 1

        # skip very recent files to avoid races with writers
        if age < min_age_seconds:
            continue

        # determine retention for this path
        rel = None
        for prefix, days in per_path_retention.items():
            try:
                if str(fp).startswith(str(Path(prefix).resolve())):
                    rel = days * 86400
                    break
            except Exception:
                continue

        effective_retention = rel if rel is not None else retention_seconds

        if age >= effective_retention:
            candidates.append((mtime, fp))

    # sort oldest first
    candidates.sort()

    for mtime, fp in candidates:
        try:
            size = fp.stat().st_size
        except FileNotFoundError:
            continue
        if dry_run:
            logger.info("DRY_RUN would delete: %s (%d bytes)", fp, size)
        else:
            try:
                if move_to_trash and trash_path:
                    dest_root = Path(trash_path)
                    dest_root.mkdir(parents=True, exist_ok=True)
                    rel = fp.name
                    dest = dest_root / rel
                    fp.replace(dest)
                    logger.info("Moved to trash %s -> %s (%d bytes)", fp, dest, size)
                else:
                    fp.unlink()
                    logger.info("Deleted %s (%d bytes)", fp, size)
                freed_bytes += size
            except Exception:
                logger.exception("Failed to delete/move %s", fp)

    # optional quota-based trimming
    quota_freed = 0
    if max_disk_usage_mb is not None:
        # compute current usage for given paths
        total_bytes = 0
        files = []
        for fp in _iter_files(paths):
            try:
                stat = fp.stat()
            except FileNotFoundError:
                continue
            total_bytes += stat.st_size
            files.append((stat.st_mtime, fp, stat.st_size))

        total_mb = _bytes_to_mb(total_bytes)
        if total_mb > max_disk_usage_mb:
            # delete oldest files (excluding those younger than min_age_seconds)
            files.sort()
            for mtime, fp, size in files:
                age = now - mtime
                if age < min_age_seconds:
                    continue
                if dry_run:
                    logger.info("DRY_RUN quota delete: %s (%d bytes)", fp, size)
                else:
                    try:
                        if move_to_trash and trash_path:
                            dest_root = Path(trash_path)
                            dest_root.mkdir(parents=True, exist_ok=True)
                            dest = dest_root / fp.name
                            fp.replace(dest)
                            logger.info("Quota moved to trash %s -> %s (%d bytes)", fp, dest, size)
                        else:
                            fp.unlink()
                            logger.info("Quota deleted %s (%d bytes)", fp, size)
                        quota_freed += size
                    except Exception:
                        logger.exception("Failed to delete during quota trim: %s", fp)

                total_mb = _bytes_to_mb(total_bytes - quota_freed)
                if total_mb <= max_disk_usage_mb:
                    break

    summary = {
        "dry_run": bool(dry_run),
        "files_considered": considered,
        "candidates": len(candidates),
        "freed_bytes": freed_bytes,
        "quota_freed_bytes": quota_freed,
    }

    # Clean up expired files from Supabase bucket and metadata table
    try:
        supabase_result = _cleanup_supabase_storage(retention_days=retention_days, dry_run=dry_run)
        summary["supabase"] = supabase_result
    except Exception as exc:
        logger.exception("Supabase cleanup failed")
        summary["supabase"] = {"skipped": True, "reason": str(exc)}

    return summary


def run_cleanup_from_config(cfg: Dict) -> Dict:
    cleanup_cfg = cfg.get("cleanup", {}) or {}
    return do_cleanup(
        paths=cleanup_cfg.get("paths", []),
        retention_days=cleanup_cfg.get("retention_days", 30),
        min_age_seconds=cleanup_cfg.get("min_age_seconds", 300),
        dry_run=cleanup_cfg.get("dry_run", False),
        max_disk_usage_mb=cleanup_cfg.get("max_disk_usage_mb"),
        per_path_retention=cleanup_cfg.get("per_path_retention"),
        move_to_trash=cleanup_cfg.get("move_to_trash", True),
        trash_path=cleanup_cfg.get("trash_path", "outputs/trash"),
    )


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]