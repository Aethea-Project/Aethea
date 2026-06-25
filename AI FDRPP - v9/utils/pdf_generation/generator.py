# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from __future__ import annotations

import base64
import hashlib
import json
import mimetypes
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict

from jinja2 import Environment, FileSystemLoader, select_autoescape
from playwright.sync_api import sync_playwright

from utils import build_artifact_path, ensure_directory, make_public_output_url, to_json_safe
from utils.image_utils import OUTPUT_ROOT

TEMPLATE_DIR = Path(__file__).resolve().parent
TEMPLATE_NAME = "fracture_report_template.html"
TEMPLATE_NAME_AR = "fracture_report_ar.html"
LOGO_PATH = Path(__file__).resolve().parents[1] / "logo.png"
LEAF_PATH = Path(__file__).resolve().parent / "leaf.png"


def generate_pdf_report(report_data: Dict[str, Any], request_id: str, root=OUTPUT_ROOT):
    """Render the report template to HTML and save a PDF artifact.

    The template still uses its embedded JavaScript renderer, so the data is
    injected into window.REPORT_DATA before printing the page to PDF.
    """
    pdf_path = build_artifact_path("pdfs", request_id, "report", extension=".pdf", root=root)
    html_dir = pdf_path.parent / "htmls"
    html_path = html_dir / f"{pdf_path.stem}.html"
    ensure_directory(pdf_path.parent)
    ensure_directory(html_dir)

    # Keep backward-compatible single-PDF behavior (English)
    meta = generate_bilingual_reports(report_data, request_id, root=root)
    # return English PDF meta for compatibility
    return meta.get("en")


def generate_bilingual_reports(
    report_data: Dict[str, Any],
    request_id: str,
    root=OUTPUT_ROOT,
    verification_base_url: str | None = None,
) -> Dict[str, Any]:
    """Generate two PDF reports (English + Arabic translated).

    Returns a dict with keys `en` and `ar` each containing metadata like
    `path`,`url` and `html_path`.
    """
    from utils.translation import translate_text

    results: Dict[str, Any] = {}

    # English
    pdf_path_en = build_artifact_path("pdfs", request_id + "_en", "report", extension=".pdf", root=root)
    html_dir_en = pdf_path_en.parent / "htmls"
    html_path_en = html_dir_en / f"{pdf_path_en.stem}.html"
    ensure_directory(pdf_path_en.parent)
    ensure_directory(html_dir_en)

    rendered_en = _render_template(report_data, request_id, template_name=TEMPLATE_NAME)
    rendered_en = _inject_qr_code(rendered_en, verification_base_url, lang="en")
    html_path_en.write_text(rendered_en, encoding="utf-8")
    _write_pdf_in_worker(rendered_en, pdf_path_en)

    results["en"] = {
        "path": str(pdf_path_en),
        "url": f"/download/pdfs/{request_id}_en",
        "html_path": str(html_path_en),
        "sha256": _sha256_file(pdf_path_en),
    }

    # Prepare Arabic content: prefer pre-computed `response_ar` produced by the Reporter
    report_data_ar = dict(report_data) if isinstance(report_data, dict) else {"report": report_data}
    precomputed_ar = report_data_ar.get("response_ar") or report_data_ar.get("report_ar")
    if precomputed_ar and isinstance(precomputed_ar, str):
        report_data_ar["report"] = precomputed_ar
    else:
        # Fallback: translate only the report paragraph using the generic translator
        report_text = ""
        if isinstance(report_data, dict):
            report_text = report_data.get("report") or report_data.get("structured", {}).get("report", "") or ""

        if report_text:
            try:
                translated = translate_text(report_text, source_lang="en", target_lang="ar") or ""
            except Exception:
                translated = ""
        else:
            translated = ""

        report_data_ar["report"] = translated

    # Translate structured fields to Arabic to be used in the Arabic template
    try:
        from utils.translation import translate_structured
        if isinstance(report_data_ar.get("structured"), dict):
            report_data_ar["structured"] = translate_structured(report_data_ar["structured"], source_lang="en", target_lang="ar")
    except Exception:
        pass

    # Arabic PDF
    pdf_path_ar = build_artifact_path("pdfs", request_id + "_ar", "report", extension=".pdf", root=root)
    html_dir_ar = pdf_path_ar.parent / "htmls"
    html_path_ar = html_dir_ar / f"{pdf_path_ar.stem}.html"
    ensure_directory(pdf_path_ar.parent)
    ensure_directory(html_dir_ar)

    rendered_ar = _render_template(report_data_ar, request_id, template_name=TEMPLATE_NAME_AR)
    rendered_ar = _inject_qr_code(rendered_ar, verification_base_url, lang="ar")
    html_path_ar.write_text(rendered_ar, encoding="utf-8")
    _write_pdf_in_worker(rendered_ar, pdf_path_ar)

    results["ar"] = {
        "path": str(pdf_path_ar),
        "url": f"/download/pdfs/{request_id}_ar",
        "html_path": str(html_path_ar),
        "sha256": _sha256_file(pdf_path_ar),
    }

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]


    return results


def _inject_qr_code(rendered_html: str, verification_base_url: str | None, lang: str) -> str:
    if not verification_base_url:
        return rendered_html

    try:
        from utils.qr_code import generate_qr_data_uri

        url = f"{verification_base_url}?lang={lang}"
        data_uri = generate_qr_data_uri(url)
        qr_img = f'<img src="{data_uri}" style="width:100%;height:100%" />'
        return rendered_html.replace(
            '<div class="qr-container" id="qr-container">',
            f'<div class="qr-container" id="qr-container">{qr_img}',
            1,
        )
    except Exception:
        return rendered_html


def _render_template(report_data: Dict[str, Any], request_id: str, template_name: str = TEMPLATE_NAME) -> str:
    environment = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    template = environment.get_template(template_name)
    template_data = _prepare_template_data(report_data, request_id)
    return template.render(**template_data)


def _prepare_template_data(report_data: Dict[str, Any], request_id: str) -> Dict[str, Any]:
    safe_data = to_json_safe(report_data)
    safe_data["request_id"] = request_id

    images = safe_data.get("images", {})
    if isinstance(images, dict):
        for key in ("bbox_overlay", "gradcam_overlay"):
            _embed_artifact_image(images.get(key))
        for crop in images.get("roi_crops", []) or []:
            _embed_artifact_image(crop)
        safe_data["images"] = images

    if not safe_data.get("structured"):
        safe_data["structured"] = {
            "body_part": {
                "label": "Unknown",
                "detector_group": "",
                "confidence": 0.0,
                "scores": {},
                "model_predictions": [],
            },
            "fracture_type": {},
            "fractures": [],
            "count": 0,
        }

    return {
        "logo_src": _as_data_uri(LOGO_PATH),
        "leaf_src": _as_data_uri(LEAF_PATH),
        "report_data_json": json.dumps(safe_data, ensure_ascii=False),
    }


def _embed_artifact_image(artifact: Any) -> None:
    if not isinstance(artifact, dict):
        return

    source = artifact.get("path") or artifact.get("url")
    if not isinstance(source, str) or not source:
        return

    data_uri = _as_data_uri(Path(source))
    if data_uri:
        artifact["url"] = data_uri


def _as_data_uri(path: Path) -> str | None:
    if not path.exists():
        return None

    mime_type, _ = mimetypes.guess_type(path.name)
    mime_type = mime_type or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _write_pdf(rendered_html: str, pdf_path: Path) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1400, "height": 2200})
            page.set_content(rendered_html, wait_until="load")
            page.emulate_media(media="print")
            page.wait_for_function("document.getElementById('summary-grid') && document.getElementById('summary-grid').children.length > 0")
            page.wait_for_function("Array.from(document.images).every(img => img.complete)")
            page.pdf(
                path=str(pdf_path),
                format="A4",
                print_background=True,
                prefer_css_page_size=True,
            )
        finally:
            browser.close()


def _write_pdf_in_worker(rendered_html: str, pdf_path: Path) -> None:
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_write_pdf, rendered_html, pdf_path)
        future.result()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]