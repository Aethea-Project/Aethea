# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

class Aggregator:
    """
    Formats the outputs of routing, detection, ROI feature extraction, and
    fracture-type classification into one structured response.
    """

    def build(self, analyzed_rois, body_part=None, fracture_type=None):
        body_part = body_part or {}
        fracture_type = fracture_type or {}
        fractures = [
            self._build_fracture(item, fracture_type)
            for item in analyzed_rois
        ]

        return {
            "body_part": {
                "label": body_part.get("part"),
                "detector_group": body_part.get("group"),
                "confidence": body_part.get("confidence"),
                "scores": body_part.get("scores", {}),
                "model_predictions": body_part.get("model_predictions", []),
            },
            "fracture_type": fracture_type,
            "fractures": fractures,
            "count": len(fractures),
        }


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

    def _build_fracture(self, item, fracture_type):
        interpretation = item.get("interpretation", {})
        feature_assessment = item.get("feature_assessment", {})
        anatomy = item.get("anatomy", {}) or {}

        return {
            "body_part": item.get("body_part") or anatomy.get("body_part"),
            "bone": anatomy.get("bone"),
            "bbox": item["bbox"],
            "type": fracture_type.get("label"),
            "type_confidence": fracture_type.get("confidence"),
            "angle": feature_assessment.get("angle"),
            "rule_based_type_hint": feature_assessment.get("rule_type"),
            "comminuted": feature_assessment.get("comminuted"),
            "detector_confidence": item.get("confidence"),
            "analysis_confidence": interpretation.get("confidence"),
            "interpretation": interpretation,
            "features": item.get("features", {}),
            "detector": {
                "group": item.get("group"),
                "class_id": item.get("class_id"),
                "class_name": item.get("class_name"),
                "role": item.get("detector_role"),
                "model_path": item.get("model_path"),
                "router_confidence": item.get("router_confidence"),
            },
        }


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]