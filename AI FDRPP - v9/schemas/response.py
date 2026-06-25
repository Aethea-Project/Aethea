# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ImageArtifact(BaseModel):
    path: str
    url: str
    bbox: Optional[List[int]] = None
    confidence: Optional[float] = None
    group: Optional[str] = None


class Detection(BaseModel):
    bbox: List[int]
    confidence: float
    group: Optional[str] = None
    class_name: Optional[str] = None


class BodyPartInfo(BaseModel):
    label: Optional[str] = None
    detector_group: Optional[str] = None
    confidence: Optional[float] = None
    scores: Optional[Dict[str, Any]] = None
    model_predictions: Optional[List[Any]] = None



# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

class StructuredResponse(BaseModel):
    body_part: BodyPartInfo
    fracture_type: Dict[str, Any]
    fractures: List[Dict[str, Any]]
    count: int


class AnalyzeResponse(BaseModel):
    request_id: str
    created_at: Optional[str] = None
    system_version: Optional[str] = None
    report: Optional[str]
    response_ar: Optional[str] = None
    structured: StructuredResponse
    detections: List[Detection]
    groups: List[Dict[str, Any]]
    fracture_type: Dict[str, Any]
    images: Dict[str, Any]
    storage: Optional[Dict[str, Any]] = None
    pdf_url: Optional[str] = None
    pdf_url_en: Optional[str] = None
    pdf_url_ar: Optional[str] = None
    pdf_hashes: Optional[Dict[str, Any]] = None
    verification: Optional[Dict[str, Any]] = None
    integrity: Optional[Dict[str, Any]] = None
    verification_url: Optional[str] = None
    verification_url_en: Optional[str] = None
    verification_url_ar: Optional[str] = None


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]