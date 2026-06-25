# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from pipeline.config import load_config
from pipeline.modules.aggregator import Aggregator
from pipeline.modules.classifier import Classifier
from pipeline.modules.detector import Detector
from pipeline.modules.feature_extractor import FeatureExtractor
from pipeline.modules.preprocessor import Preprocessor
from pipeline.modules.reporter import Reporter
from pipeline.modules.roi_extractor import ROIExtractor
from pipeline.modules.router import BodyPartRouter
from pipeline.modules.gradcam import generate_gradcam
from utils.pdf_generation import generate_pdf_report
from utils import OUTPUT_ROOT, generate_request_id, save_bbox_overlay, save_roi_crops, save_gradcam
import traceback


class FracturePipeline:
    """
    Full fracture detection and reporting pipeline.
    """

    def __init__(self, config_path="config.yaml"):
        self.config = load_config(config_path)

        image_config = self.config.get("image", {})
        detectors_config = self.config.get("detectors", {})

        self.preprocessor = Preprocessor(img_size=int(image_config.get("size", 512)))
        self.detector = Detector(detectors_config)
        self.router = BodyPartRouter(
            self.config.get("router", {}),
            available_groups=self.detector.configured_groups(),
        )
        self.roi_extractor = ROIExtractor()
        self.feature_extractor = FeatureExtractor(self.config.get("features", {}))
        self.classifier = Classifier(self.config.get("features", {}))
        self.aggregator = Aggregator()
        self.reporter = Reporter(self.config.get("report_generation", {}))

    def run(self, image_bytes, output_root=OUTPUT_ROOT, base_url=None):
        request_id = generate_request_id("fracture")
        prepared = self.preprocessor.process(image_bytes)
        image = prepared["bgr"]

        def finalize(result):
            try:
                from utils.pdf_generation.generator import generate_bilingual_reports

                # ensure we have an Arabic translation of the report using the Reporter (Gemini)
                try:
                    if isinstance(result.get("report"), str):
                        ar = self.reporter.translate_report(result["report"], target_lang="ar")
                        if ar:
                            result["response_ar"] = ar
                except Exception:
                    result["response_ar"] = None

                verification_base_url = None
                if base_url:
                    verification_base_url = f"{base_url.rstrip('/')}/verification/{request_id}"

                pdf_meta = generate_bilingual_reports(
                    result, request_id, root=output_root,
                    verification_base_url=verification_base_url,
                )
                result["pdfs"] = pdf_meta
                # expose both English and Arabic URLs and keep `pdf_url` for backward compatibility
                result["pdf_url_en"] = pdf_meta.get("en", {}).get("url")
                result["pdf_url_ar"] = pdf_meta.get("ar", {}).get("url")
                result["pdf_url"] = result.get("pdf_url_en")
                result["pdf_hashes"] = {
                    "en": pdf_meta.get("en", {}).get("sha256"),
                    "ar": pdf_meta.get("ar", {}).get("sha256"),
                }
            except Exception:
                traceback.print_exc()
                result["pdf_url"] = None
            return result

        groups = self.router.predict(image)
        if not groups:
            return finalize({
                "request_id": request_id,

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

                "groups": [],
                "detections": [],
                "rois": [],
                "features": [],
                "fracture_type": {},
                "structured": {
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
                },
                "report": "No detector group matched this image.",
                "images": {},
            })

        detections = self.detector.detect(image, groups)
        if not detections:
            bbox_overlay = save_bbox_overlay(image, [], request_id, root=output_root)
            structured = self.aggregator.build(
                analyzed_rois=[],
                body_part=groups[0],
                fracture_type={},
            )
            report = self.reporter.generate(structured)

            return finalize({
                "request_id": request_id,
                "groups": groups,
                "detections": [],
                "rois": [],
                "features": [],
                "fracture_type": {},
                "images": {"bbox_overlay": bbox_overlay},
                "structured": structured,
                "report": report,
            })

        # Normal flow: extract ROIs, features, classify fracture type
        rois = self.roi_extractor.extract(image, detections)
        analyzed = self.feature_extractor.extract(rois)
        fracture_type = self.classifier.predict(image)
        bbox_overlay = save_bbox_overlay(image, detections, request_id, root=output_root)

        # Save ROI crop images and attach their metadata/URLs
        roi_crops = save_roi_crops(rois, request_id, root=output_root)
        gradcam_meta = None
        try:
            if self.config.get("features", {}).get("gradcam_enabled"):
                # Attempt to generate a Grad-CAM overlay using the classifier ensemble
                try:
                    ensemble = self.classifier.ensemble
                    overlay = generate_gradcam(ensemble, image)
                    gradcam_meta = save_gradcam(overlay, request_id, root=output_root)
                except Exception:
                    gradcam_meta = None
        except Exception:
            gradcam_meta = None
        structured = self.aggregator.build(
            analyzed_rois=analyzed,
            body_part=groups[0],
            fracture_type=fracture_type,
        )
        report = self.reporter.generate(structured)

        return finalize({
            "request_id": request_id,
            "groups": groups,
            "detections": detections,
            "rois": rois,
            "features": analyzed,
            "fracture_type": fracture_type,
            "images": {"bbox_overlay": bbox_overlay, "roi_crops": roi_crops, "gradcam_overlay": gradcam_meta},
            "structured": structured,
            "report": report,
        })


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]