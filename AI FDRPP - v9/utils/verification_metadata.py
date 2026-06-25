# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from utils.supabase_storage import get_project_url, get_secret_key


META_TABLE = "aifdrpp_meta_data"


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    file_path = Path(path)

    with file_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def normalize_confidence(value: Any) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0

    if 0.0 <= numeric <= 1.0:
        numeric *= 100.0

    return round(numeric, 2)


def parse_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        dt_value = value
    elif isinstance(value, str) and value.strip():
        text = value.strip().replace("Z", "+00:00")
        try:
            dt_value = datetime.fromisoformat(text)
        except ValueError:
            dt_value = datetime.now(timezone.utc)
    else:
        dt_value = datetime.now(timezone.utc)

    if dt_value.tzinfo is None:
        dt_value = dt_value.replace(tzinfo=timezone.utc)
    else:
        dt_value = dt_value.astimezone(timezone.utc)

    return dt_value


def format_timestamp(value: Any) -> str:
    return parse_timestamp(value).strftime("%Y-%m-%d %H:%M:%S")


def build_meta_record(result: Dict[str, Any], pdf_hashes: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Build a single metadata record (English). Kept for backward compatibility."""
    records = build_meta_records(result, pdf_hashes=pdf_hashes)
    return records[0] if records else {}


def build_meta_records(result: Dict[str, Any], pdf_hashes: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    pdf_hashes = pdf_hashes or {}
    structured = result.get("structured") or {}
    body_part = structured.get("body_part") if isinstance(structured, dict) else {}
    fracture_type = result.get("fracture_type") or {}

    report_id = str(result.get("request_id") or "")
    confidence = normalize_confidence(fracture_type.get("confidence"))

    common = {
        "report_id": report_id,
        "timestamp": parse_timestamp(result.get("created_at") or datetime.now(timezone.utc)).isoformat(),
        "body_part": str((body_part or {}).get("label") or "Unknown"),
        "fracture_type": str(fracture_type.get("label") or "Unknown"),
        "confidence": confidence,
    }

    records = []
    for lang in ("en", "ar"):
        sha256 = pdf_hashes.get(lang) or ""
        records.append({
            **common,
            "lang": lang,
            "verification_status": "VERIFIED" if sha256 else "UNVERIFIED",
            "integrity_status": "Verified" if sha256 else "Unverified",
            "sha256": sha256,
        })

    return records


def build_verification_payload(meta_record: Dict[str, Any]) -> Dict[str, Any]:
    confidence = normalize_confidence(meta_record.get("confidence"))
    verification_status = str(meta_record.get("verification_status") or "UNVERIFIED").upper()
    integrity_status = str(meta_record.get("integrity_status") or "Unverified")

    return {
        "timestamp": format_timestamp(meta_record.get("timestamp")),
        "verification": {
            "status": verification_status,
        },
        "report": {
            "id": meta_record.get("report_id") or "",
            "body_part": meta_record.get("body_part") or "Unknown",
            "fracture_type": meta_record.get("fracture_type") or "Unknown",
            "confidence": confidence,
        },
        "integrity": {
            "status": integrity_status,
            "sha256": meta_record.get("sha256") or "",
        },
    }


def _supabase_headers() -> Dict[str, str]:
    secret_key = get_secret_key()
    return {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]



def get_verification_record(report_id: str, lang: Optional[str] = None) -> Optional[Dict[str, Any]]:
    project_url = get_project_url()
    secret_key = get_secret_key()
    if not project_url or not secret_key or not report_id:
        return None

    endpoint = f"{project_url}/rest/v1/{META_TABLE}"
    params: Dict[str, str] = {"report_id": f"eq.{report_id}", "select": "*", "limit": "1"}
    if lang:
        params["lang"] = f"eq.{lang}"

    response = requests.get(
        endpoint,
        headers=_supabase_headers(),
        params=params,
        timeout=30,
    )

    if response.status_code >= 400:
        detail = response.text.strip() or response.reason
        raise RuntimeError(f"Supabase metadata lookup failed for {report_id}: {response.status_code} {detail}")

    payload = response.json() if response.content else []
    if isinstance(payload, list) and payload:
        return payload[0]
    if isinstance(payload, dict) and payload:
        return payload
    return None


def upsert_verification_record(meta_record: Dict[str, Any]) -> Dict[str, Any]:
    project_url = get_project_url()
    secret_key = get_secret_key()
    if not project_url or not secret_key:
        raise RuntimeError("Supabase metadata sync requires SUPABASE_URL and a secret key")

    endpoint = f"{project_url}/rest/v1/{META_TABLE}"
    headers = {**_supabase_headers(), "Prefer": "resolution=merge-duplicates,return=representation"}

    # Attempt 1: upsert with composite unique constraint (report_id, lang)
    response = requests.post(
        endpoint,
        headers=headers,
        params={"on_conflict": "report_id,lang"},
        json=meta_record,
        timeout=30,
    )

    if response.status_code < 400:
        return _parse_upsert_response(response, meta_record)

    # Attempt 2: plain insert (no conflict handling) — works for fresh rows
    response = requests.post(
        endpoint,
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        json=meta_record,
        timeout=30,
    )

    if response.status_code < 400:
        return _parse_upsert_response(response, meta_record)

    # Attempt 3: update existing row by report_id + lang
    report_id = meta_record.get("report_id", "")
    lang = meta_record.get("lang", "")
    patch_params = {"report_id": f"eq.{report_id}", "lang": f"eq.{lang}"}
    response = requests.patch(
        endpoint,
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        params=patch_params,
        json=meta_record,
        timeout=30,
    )

    if response.status_code < 400:
        return _parse_upsert_response(response, meta_record)

    detail = response.text.strip() or response.reason
    raise RuntimeError(f"Supabase metadata upsert failed for {meta_record.get('report_id')} ({lang}): {response.status_code} {detail}")


def _parse_upsert_response(response: requests.Response, fallback: Dict[str, Any]) -> Dict[str, Any]:
    payload = response.json() if response.content else []
    if isinstance(payload, list) and payload:
        return payload[0]
    if isinstance(payload, dict) and payload:
        return payload
    return fallback


def sync_verification_response(result: Dict[str, Any], pdf_hashes: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    records = build_meta_records(result, pdf_hashes=pdf_hashes)
    pdf_hashes = pdf_hashes or {}

    try:
        en_record = None
        ar_record = None
        for record in records:
            stored = upsert_verification_record(record)
            if stored.get("lang") == "en":
                en_record = stored
            elif stored.get("lang") == "ar":
                ar_record = stored

        base_record = en_record or records[0]
        payload = build_verification_payload(base_record)

        sha256_en = (en_record or {}).get("sha256") or pdf_hashes.get("en") or ""
        sha256_ar = (ar_record or {}).get("sha256") or pdf_hashes.get("ar") or ""
        both_verified = bool(sha256_en and sha256_ar)
        payload["integrity"] = {
            "status": "Verified" if both_verified else "Unverified",
            "sha256_en": sha256_en,
            "sha256_ar": sha256_ar,
        }

        return payload
    except Exception:
        fallback = dict(records[0]) if records else {}
        fallback["verification_status"] = "UNVERIFIED"
        fallback["integrity_status"] = "Unverified"
        payload = build_verification_payload(fallback)
        payload["integrity"] = {
            "status": "Unverified",
            "sha256_en": pdf_hashes.get("en") or "",
            "sha256_ar": pdf_hashes.get("ar") or "",
        }
        return payload

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]