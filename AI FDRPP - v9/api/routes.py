# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from pathlib import Path
from datetime import datetime, timezone
from tempfile import TemporaryDirectory
import base64
import json
import mimetypes

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from schemas.response import AnalyzeResponse
from api.dependencies import get_pipeline
from utils.image_utils import OUTPUT_ROOT
from utils.resource_usage import profile_pipeline_request
from utils.supabase_storage import upload_request_outputs
from utils.verification_metadata import sync_verification_response, get_verification_record, build_verification_payload
from typing import Optional, List
from pydantic import BaseModel
from utils.cleanup import do_cleanup
import os
from fastapi import Request

router = APIRouter()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def get_system_version() -> str:
    return os.environ.get("FDRPP_SYSTEM_VERSION", "1.0.0")


def build_analyze_response(payload: dict) -> AnalyzeResponse:
    if hasattr(AnalyzeResponse, "model_validate"):
        return AnalyzeResponse.model_validate(payload)
    return AnalyzeResponse.parse_obj(payload)


@router.get("/")
def root():
    return {
        "status": "ok",
        "service": "Fracture Detection API",
        "docs": "/docs",
        "health": "/health",
        "analyze": "/analyze",
    }


@router.get("/download/pdfs/{request_id}")
def download_pdf(request_id: str):
    # Support legacy and bilingual filenames. Candidates:
    # {request_id}_report.pdf  (legacy)
    # {request_id}_en_report.pdf
    # {request_id}_ar_report.pdf
    candidates = [
        Path(OUTPUT_ROOT) / "pdfs" / f"{request_id}_report.pdf",
        Path(OUTPUT_ROOT) / "pdfs" / f"{request_id}_en_report.pdf",
        Path(OUTPUT_ROOT) / "pdfs" / f"{request_id}_ar_report.pdf",
    ]

    pdf_path = None
    for p in candidates:
        if p.exists():
            pdf_path = p
            break

    if pdf_path is None:
        raise HTTPException(status_code=404, detail="PDF report not found")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
        headers={"Content-Disposition": f'attachment; filename="{pdf_path.name}"'},
    )


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/verify/{report_id}")
def verify_report(report_id: str, lang: str = "en"):
    record = get_verification_record(report_id, lang=lang)
    if not record:
        raise HTTPException(status_code=404, detail="Verification record not found")
    return build_verification_payload(record)


@router.get("/verification/{report_id}")
def verification_page(report_id: str, lang: str = "en"):
    record = get_verification_record(report_id, lang=lang)
    if record:
        payload = build_verification_payload(record)
    else:
        payload = {
            "timestamp": None,
            "verification": {"status": "NOT_FOUND"},
            "report": {"id": report_id, "body_part": None, "fracture_type": None, "confidence": None},
            "integrity": {"status": "Not Found", "sha256": None},
        }
    template_path = Path(__file__).resolve().parents[1] / "utils" / "verification" / "AETHEA_Verification_Dynamic.html"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Verification page template not found")

    html = template_path.read_text(encoding="utf-8")
    logo_data_uri = _as_data_uri(Path(__file__).resolve().parents[1] / "utils" / "logo.png")
    leaf_data_uri = _as_data_uri(Path(__file__).resolve().parents[1] / "utils" / "pdf_generation" / "leaf.png")

    if logo_data_uri:
        html = html.replace("{{ logo_src }}", logo_data_uri)
    if leaf_data_uri:
        html = html.replace('src="leaf.png"', f'src="{leaf_data_uri}"')

    bootstrap = (
        "<script>"
        f"window.__AETHEA_VERIFICATION_DATA__ = {json.dumps(payload, ensure_ascii=False)};"
        "window.addEventListener('DOMContentLoaded', function () {"
        "  if (typeof renderPage === 'function') { renderPage(window.__AETHEA_VERIFICATION_DATA__); }"
        "});"
        "</script>"
    )
    html = html.replace("</body>", f"{bootstrap}</body>")
    return HTMLResponse(content=html)



# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

class CleanupRequest(BaseModel):
    dry_run: Optional[bool] = True
    paths: Optional[List[str]] = None
    retention_days: Optional[int] = None


@router.post("/admin/cleanup")
def admin_cleanup(body: CleanupRequest, request: Request):
    # optional admin token protection: if CLEANUP_ADMIN_TOKEN is set, require header X-Admin-Token
    admin_token = os.environ.get("CLEANUP_ADMIN_TOKEN")
    cfg = {}
    if admin_token:
        header_token = request.headers.get("x-admin-token")
        if not header_token or header_token != admin_token:
            raise HTTPException(status_code=403, detail="Invalid or missing admin token")
    paths = body.paths or [
        "outputs/pdfs",
        "outputs/pdfs/htmls",
        "outputs/roi",
        "outputs/gradcam",
        "outputs/bbox",
        "outputs/temp",
    ]
    retention = body.retention_days or 30
    result = do_cleanup(
        paths=paths,
        retention_days=retention,
        dry_run=bool(body.dry_run),
        move_to_trash=bool(os.environ.get("CLEANUP_MOVE_TO_TRASH", "1") == "1"),
        trash_path=os.environ.get("CLEANUP_TRASH_PATH", "outputs/trash"),
        per_path_retention=None,
    )
    return result


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...), request: Request = None, pipeline=Depends(get_pipeline)):
    try:
        image_bytes = await file.read()
        with TemporaryDirectory(prefix="fdrpp_outputs_") as temp_output_dir:
            output_root = Path(temp_output_dir)
            result = profile_pipeline_request(
                pipeline,
                image_bytes,
                request=request,
                upload_file=file,
                output_root=output_root,
                base_url=str(request.base_url) if request else None,
            )
            result["created_at"] = result.get("created_at") or utc_now_iso()
            result["system_version"] = result.get("system_version") or get_system_version()
            upload_request_outputs(
                result,
                image_bytes=image_bytes,
                original_filename=file.filename,
                original_content_type=file.content_type,
                output_root=output_root,
            )

            verification_payload = sync_verification_response(result, pdf_hashes=result.get("pdf_hashes") or {})
            result["verification"] = verification_payload.get("verification")
            result["integrity"] = verification_payload.get("integrity")

            # convert any remaining legacy relative URLs to absolute API URLs
            if request is not None:
                base = str(request.base_url).rstrip("/")
                result["verification_url"] = f"{base}/verification/{result.get('request_id')}"
                result["verification_url_en"] = f"{base}/verification/{result.get('request_id')}?lang=en"
                result["verification_url_ar"] = f"{base}/verification/{result.get('request_id')}?lang=ar"
                images = result.get("images", {})
                if isinstance(images.get("bbox_overlay"), dict):
                    url = images["bbox_overlay"].get("url")
                    if isinstance(url, str) and url.startswith("/"):
                        images["bbox_overlay"]["url"] = base + url

                if isinstance(images.get("gradcam_overlay"), dict):
                    url = images["gradcam_overlay"].get("url")
                    if isinstance(url, str) and url.startswith("/"):
                        images["gradcam_overlay"]["url"] = base + url

                for roi in images.get("roi_crops", []) or []:
                    url = roi.get("url")
                    if isinstance(url, str) and url.startswith("/"):
                        roi["url"] = base + url

                for key in ("pdf_url", "pdf_url_en", "pdf_url_ar"):
                    url = result.get(key)
                    if isinstance(url, str) and url.startswith("/"):
                        result[key] = base + url

                result["images"] = images

            resp = build_analyze_response({
                "request_id": result.get("request_id"),
                "created_at": result.get("created_at"),
                "system_version": result.get("system_version"),
                "report": result.get("report"),
                "response_ar": result.get("response_ar"),
                "structured": result.get("structured"),
                "detections": result.get("detections", []),
                "groups": result.get("groups", []),
                "fracture_type": result.get("fracture_type", {}),
                "images": result.get("images", {}),
                "storage": result.get("storage"),
                "pdf_url": result.get("pdf_url"),
                "pdf_url_en": result.get("pdf_url_en"),
                "pdf_url_ar": result.get("pdf_url_ar"),
                "pdf_hashes": result.get("pdf_hashes"),
                "verification": result.get("verification"),
                "integrity": result.get("integrity"),
                "verification_url": result.get("verification_url"),
                "verification_url_en": result.get("verification_url_en"),
                "verification_url_ar": result.get("verification_url_ar"),
            })

            return resp
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _as_data_uri(path: Path) -> str | None:
    if not path.exists():
        return None

    mime_type, _ = mimetypes.guess_type(path.name)
    mime_type = mime_type or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]