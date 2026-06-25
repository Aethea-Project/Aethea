# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from pathlib import Path

import cv2
import numpy as np

from utils.ids import normalize_identifier


OUTPUT_ROOT = Path("outputs")
DEFAULT_OUTPUT_DIRS = ("bbox", "roi", "gradcam", "pdfs", "temp")


def ensure_directory(path):
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def ensure_output_dirs(root=OUTPUT_ROOT, subdirs=DEFAULT_OUTPUT_DIRS):
    root_path = Path(root)
    return {
        name: ensure_directory(root_path / name)
        for name in subdirs
    }


def build_artifact_path(category, request_id, name, extension=".png", root=OUTPUT_ROOT):
    category = normalize_identifier(category, fallback_prefix="artifact")
    request_id = normalize_identifier(request_id, fallback_prefix="request")
    name = normalize_identifier(name, fallback_prefix="output")
    extension = _normalize_extension(extension)

    return Path(root) / category / f"{request_id}_{name}{extension}"


def make_public_output_url(path, root=OUTPUT_ROOT, public_prefix="/outputs"):
    artifact_path = Path(path)
    root_path = Path(root)

    try:
        relative_path = artifact_path.relative_to(root_path)
    except ValueError:
        relative_path = artifact_path

    prefix = "/" + public_prefix.strip("/")
    return f"{prefix}/{relative_path.as_posix()}"


def save_image(image, path):
    output_path = Path(path)
    ensure_directory(output_path.parent)

    if not cv2.imwrite(str(output_path), image):
        raise ValueError(f"Failed to write image to {output_path}")

    return output_path


def draw_bbox_overlay(image, detections, color=(0, 0, 255), fill_alpha=0.18, thickness=3):
    base = _ensure_bgr_image(image)
    overlay = base.copy()
    height, width = base.shape[:2]

    for detection in detections or []:
        bbox = detection.get("bbox")
        if not bbox:
            continue

        x1, y1, x2, y2 = [int(round(value)) for value in bbox]
        x1, y1, x2, y2 = _clip_bbox(x1, y1, x2, y2, width, height)
        if x2 <= x1 or y2 <= y1:
            continue

        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)

    blended = cv2.addWeighted(overlay, fill_alpha, base, 1.0 - fill_alpha, 0)

    for detection in detections or []:
        bbox = detection.get("bbox")
        if not bbox:
            continue

        x1, y1, x2, y2 = [int(round(value)) for value in bbox]
        x1, y1, x2, y2 = _clip_bbox(x1, y1, x2, y2, width, height)
        if x2 <= x1 or y2 <= y1:
            continue

        label = detection.get("class_name") or detection.get("label") or "suspected fracture"
        confidence = detection.get("confidence")
        if confidence is not None:
            label = f"{label} {confidence:.2f}"

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]


        cv2.rectangle(blended, (x1, y1), (x2, y2), color, thickness)
        text_y = max(18, y1 - 8)
        cv2.putText(
            blended,
            label,
            (x1, text_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1,
            cv2.LINE_AA,
        )

    return blended


def save_bbox_overlay(image, detections, request_id, root=OUTPUT_ROOT):
    artifact_path = build_artifact_path("bbox", request_id, "overlay", root=root)
    overlay = draw_bbox_overlay(image, detections)
    saved_path = save_image(overlay, artifact_path)

    return {
        "path": str(saved_path),
        "url": make_public_output_url(saved_path, root=root),
    }


def save_roi_crops(rois, request_id, root=OUTPUT_ROOT, extension=".png"):
    """
    Save ROI crop images to the outputs/roi directory and return metadata list.

    rois: list of dicts as returned by ROIExtractor (must include key 'roi')
    """
    results = []

    for i, r in enumerate(rois or []):
        image = r.get("roi")
        if image is None:
            continue

        name = f"crop_{i+1}"
        artifact_path = build_artifact_path("roi", request_id, name, extension=extension, root=root)
        saved_path = save_image(image, artifact_path)

        results.append({
            "path": str(saved_path),
            "url": make_public_output_url(saved_path, root=root),
            "bbox": r.get("bbox"),
            "confidence": r.get("confidence"),
            "group": r.get("group"),
        })

    return results


def save_gradcam(image, request_id, name="gradcam", root=OUTPUT_ROOT, extension=".png"):
    artifact_path = build_artifact_path("gradcam", request_id, name, extension=extension, root=root)
    saved_path = save_image(image, artifact_path)
    return {"path": str(saved_path), "url": make_public_output_url(saved_path, root=root)}


def _normalize_extension(extension):
    extension = str(extension or ".png").strip()
    if not extension.startswith("."):
        extension = "." + extension
    return extension


def _ensure_bgr_image(image):
    array = np.asarray(image)

    if array.ndim == 2:
        return cv2.cvtColor(array, cv2.COLOR_GRAY2BGR)

    if array.ndim == 3 and array.shape[2] == 3:
        return array.copy()

    if array.ndim == 3 and array.shape[2] == 4:
        return cv2.cvtColor(array, cv2.COLOR_RGBA2BGR)

    raise ValueError("Expected a 2D grayscale or 3-channel color image")


def _clip_bbox(x1, y1, x2, y2, width, height):
    x1 = max(0, min(int(x1), width - 1))
    y1 = max(0, min(int(y1), height - 1))
    x2 = max(0, min(int(x2), width - 1))
    y2 = max(0, min(int(y2), height - 1))
    return x1, y1, x2, y2


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]