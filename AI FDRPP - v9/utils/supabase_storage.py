# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from __future__ import annotations

import mimetypes
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import quote

import requests

from utils.ids import normalize_identifier
from utils.image_utils import OUTPUT_ROOT


DEFAULT_BUCKET = "outputs"
DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60


class SupabaseStorageError(RuntimeError):
    """Raised when Supabase storage upload is required but fails."""


class SupabaseStorageClient:
    def __init__(self, project_url: str, secret_key: str, bucket: str, timeout: float = 30.0) -> None:
        self.project_url = project_url.rstrip("/")
        self.secret_key = secret_key
        self.bucket = bucket
        self.timeout = timeout

    def upload_bytes(self, object_path: str, data: bytes, content_type: Optional[str] = None) -> Dict[str, Any]:
        object_path = object_path.strip("/")
        encoded_path = quote(object_path, safe="/")
        endpoint = f"{self.project_url}/storage/v1/object/{self.bucket}/{encoded_path}"
        content_type = content_type or "application/octet-stream"

        response = requests.post(
            endpoint,
            headers={
                "apikey": self.secret_key,
                "Authorization": f"Bearer {self.secret_key}",
                "Cache-Control": "3600",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
            data=data,
            timeout=self.timeout,
        )

        if response.status_code >= 400:
            detail = response.text.strip() or response.reason
            raise SupabaseStorageError(
                f"Supabase upload failed for {object_path}: {response.status_code} {detail}"
            )

        return {
            "bucket": self.bucket,
            "path": object_path,
            "url": self.signed_url(object_path),
            "size_bytes": len(data),
            "content_type": content_type,
        }

    def upload_file(self, source_path: Path, object_path: str) -> Dict[str, Any]:
        content_type = mimetypes.guess_type(source_path.name)[0] or "application/octet-stream"
        uploaded = self.upload_bytes(object_path, source_path.read_bytes(), content_type=content_type)
        uploaded["local_path"] = str(source_path)
        return uploaded

    def public_url(self, object_path: str) -> str:
        encoded_path = quote(object_path.strip("/"), safe="/")
        return f"{self.project_url}/storage/v1/object/public/{self.bucket}/{encoded_path}"

    def signed_url(self, object_path: str, *, expires_in: int = DEFAULT_SIGNED_URL_EXPIRY_SECONDS) -> str:
        encoded_path = quote(object_path.strip("/"), safe="/")
        endpoint = f"{self.project_url}/storage/v1/object/sign/{self.bucket}/{encoded_path}"

        response = requests.post(
            endpoint,
            headers={
                "apikey": self.secret_key,
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
            },
            json={"expiresIn": int(expires_in)},
            timeout=self.timeout,
        )

        if response.status_code >= 400:
            detail = response.text.strip() or response.reason
            raise SupabaseStorageError(
                f"Supabase signed URL generation failed for {object_path}: {response.status_code} {detail}"
            )

        payload = response.json() if response.content else {}
        signed_path = payload.get("signedURL") or payload.get("signedUrl")
        if not isinstance(signed_path, str) or not signed_path:
            raise SupabaseStorageError(f"Supabase signed URL response missing signedURL for {object_path}")

        if signed_path.startswith("http://") or signed_path.startswith("https://"):
            return signed_path
        if not signed_path.startswith("/"):
            signed_path = "/" + signed_path
        if signed_path.startswith("/storage/v1/"):
            return f"{self.project_url}{signed_path}"
        return f"{self.project_url}/storage/v1{signed_path}"


def upload_request_outputs(
    result: Dict[str, Any],
    *,
    image_bytes: bytes,
    original_filename: Optional[str] = None,
    original_content_type: Optional[str] = None,
    output_root: Path = OUTPUT_ROOT,
) -> Dict[str, Any]:
    request_id = str(result.get("request_id") or "")
    request_prefix = normalize_identifier(request_id, fallback_prefix="request")
    bucket = get_bucket_name()

    storage: Dict[str, Any] = {
        "enabled": uploads_enabled(),
        "bucket": bucket,
        "request_prefix": request_prefix,
        "original_image": None,
        "outputs": [],
        "errors": [],
    }

    if not storage["enabled"]:
        if explicit_upload_enabled() or uploads_required():
            storage["errors"].append("Supabase storage is enabled, but SUPABASE_URL and a secret key are not configured.")
        result["storage"] = storage
        if storage["errors"] and uploads_required():
            raise SupabaseStorageError("; ".join(storage["errors"]))
        return storage

    client = SupabaseStorageClient(
        project_url=get_project_url(),
        secret_key=get_secret_key(),
        bucket=bucket,
        timeout=get_timeout_seconds(),
    )

    try:
        original_path = build_original_object_path(
            request_prefix,
            original_filename=original_filename,
            content_type=original_content_type,
        )
        storage["original_image"] = client.upload_bytes(
            original_path,
            image_bytes,
            content_type=original_content_type or "application/octet-stream",
        )
    except Exception as exc:
        storage["errors"].append(str(exc))

    uploaded_outputs: List[Dict[str, Any]] = []
    for source_path in collect_request_output_files(request_prefix, output_root=output_root):
        try:
            object_path = build_output_object_path(request_prefix, source_path, output_root=output_root)
            uploaded_outputs.append(client.upload_file(source_path, object_path))
        except Exception as exc:
            storage["errors"].append(str(exc))

    storage["outputs"] = [without_local_path(uploaded) for uploaded in uploaded_outputs]
    attach_uploaded_outputs(result, uploaded_outputs)
    attach_pdf_urls(result, uploaded_outputs)
    result["storage"] = storage

    if storage["errors"] and uploads_required():
        raise SupabaseStorageError("; ".join(storage["errors"]))

    return storage


def collect_request_output_files(request_id: str, *, output_root: Path = OUTPUT_ROOT) -> Iterable[Path]:
    root = Path(output_root)

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

    if not root.exists():
        return []

    return sorted(
        (path for path in root.rglob(f"{request_id}*") if path.is_file()),
        key=lambda path: path.as_posix(),
    )


def build_original_object_path(
    request_prefix: str,
    *,
    original_filename: Optional[str],
    content_type: Optional[str],
) -> str:
    filename = Path(original_filename or "")
    stem = normalize_identifier(filename.stem or "original", fallback_prefix="original")
    extension = clean_extension(filename.suffix)

    if not extension:
        extension = clean_extension(mimetypes.guess_extension(content_type or "") or "") or ".bin"

    return f"{request_prefix}/original/{stem}{extension}"


def build_output_object_path(request_prefix: str, source_path: Path, *, output_root: Path = OUTPUT_ROOT) -> str:
    try:
        relative_path = source_path.relative_to(output_root)
    except ValueError:
        relative_path = source_path.name

    relative = Path(relative_path).as_posix()
    return f"{request_prefix}/outputs/{relative}"


def attach_uploaded_outputs(result: Dict[str, Any], uploaded_outputs: List[Dict[str, Any]]) -> None:
    by_local_path = {
        str(Path(uploaded.get("local_path", "")).resolve()): uploaded
        for uploaded in uploaded_outputs
        if uploaded.get("local_path")
    }
    if not by_local_path:
        return

    for artifact in iter_image_artifacts(result.get("images", {})):
        local_path = artifact.get("path")
        if not local_path:
            continue

        uploaded = by_local_path.get(str(Path(local_path).resolve()))
        if uploaded:
            public_upload = without_local_path(uploaded)
            artifact["path"] = public_upload["path"]
            artifact["url"] = public_upload["url"]
            artifact["storage"] = public_upload


def attach_pdf_urls(result: Dict[str, Any], uploaded_outputs: List[Dict[str, Any]]) -> None:
    by_local_path = {
        str(Path(uploaded.get("local_path", "")).resolve()): uploaded
        for uploaded in uploaded_outputs
        if uploaded.get("local_path")
    }
    if not by_local_path:
        return

    pdfs = result.get("pdfs")
    if not isinstance(pdfs, dict):
        return

    for language in ("en", "ar"):
        pdf_meta = pdfs.get(language)
        if not isinstance(pdf_meta, dict):
            continue

        local_path = pdf_meta.get("path")
        if not local_path:
            continue

        uploaded = by_local_path.get(str(Path(local_path).resolve()))
        if not uploaded:
            continue

        public_upload = without_local_path(uploaded)
        pdf_meta["path"] = public_upload["path"]
        pdf_meta["url"] = public_upload["url"]
        pdf_meta["storage"] = public_upload
        result[f"pdf_url_{language}"] = public_upload["url"]

    result["pdf_url"] = result.get("pdf_url_en")


def without_local_path(uploaded: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in uploaded.items()
        if key != "local_path"
    }


def iter_image_artifacts(images: Any) -> Iterable[Dict[str, Any]]:
    if not isinstance(images, dict):
        return []

    artifacts: List[Dict[str, Any]] = []
    for key in ("bbox_overlay", "gradcam_overlay"):
        artifact = images.get(key)
        if isinstance(artifact, dict):
            artifacts.append(artifact)

    for artifact in images.get("roi_crops", []) or []:
        if isinstance(artifact, dict):
            artifacts.append(artifact)

    return artifacts


def get_project_url() -> str:
    return (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("SUPABASE_PROJECT_URL")
        or ""
    ).rstrip("/")


def get_secret_key() -> str:
    return (
        os.environ.get("SUPABASE_SECRET_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_KEY")
        or ""
    )


def get_bucket_name() -> str:
    return (
        os.environ.get("SUPABASE_OUTPUTS_BUCKET")
        or os.environ.get("SUPABASE_BUCKET")
        or DEFAULT_BUCKET
    )


def explicit_upload_enabled() -> bool:
    raw_value = os.environ.get("SUPABASE_UPLOAD_ENABLED")
    if raw_value is None:
        return False
    return raw_value.strip().lower() not in {"0", "false", "no", "off"}


def uploads_enabled() -> bool:
    raw_value = os.environ.get("SUPABASE_UPLOAD_ENABLED")
    if raw_value is not None and raw_value.strip().lower() in {"0", "false", "no", "off"}:
        return False
    return bool(get_project_url() and get_secret_key())


def uploads_required() -> bool:
    raw_value = os.environ.get("SUPABASE_UPLOAD_REQUIRED", "0")
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def get_timeout_seconds() -> float:
    raw_value = os.environ.get("SUPABASE_UPLOAD_TIMEOUT", "30")
    try:
        return max(1.0, float(raw_value))
    except ValueError:
        return 30.0


def clean_extension(extension: str) -> str:
    extension = (extension or "").strip().lower()
    if not extension:
        return ""
    if not extension.startswith("."):
        extension = "." + extension
    if not all(char.isalnum() or char == "." for char in extension):
        return ""
    return extension[:16]


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]