# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

import importlib.util
from pathlib import Path


class FeatureExtractor:
    """
    Extracts ROI-level fracture details using the configured enhanced feature module.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.patch_size = int(self.config.get("local_patch_size", 64))
        self.patch_overlap = float(self.config.get("local_patch_overlap", 0.5))
        self.feature_module = self._load_feature_module(self.config.get("enhanced_module"))

    def extract(self, rois):
        results = []

        for item in rois:
            roi = item["roi"]
            features = self.feature_module.extract_features_local(
                roi,
                patch_size=self.patch_size,
                overlap=self.patch_overlap,
            )
            assessment = self.feature_module.classify_fracture(roi, features)
            interpretation = self.feature_module.interpret(features)

            feature_assessment = {
                "rule_type": assessment.get("type"),
                "angle": assessment.get("angle"),
                "comminuted": "comminuted" in assessment.get("type", ""),

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

            }

            results.append(
                {
                    **item,
                    "features": features,
                    "feature_assessment": feature_assessment,
                    "interpretation": interpretation,
                }
            )

        return results

    def _load_feature_module(self, module_path):
        if not module_path:
            import features_ext_enhanced

            return features_ext_enhanced

        path = Path(module_path)
        if not path.exists():
            raise FileNotFoundError(f"Configured enhanced feature module does not exist: {module_path}")

        spec = importlib.util.spec_from_file_location("configured_features_ext_enhanced", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        for function_name in ("extract_features_local", "classify_fracture", "interpret"):
            if not hasattr(module, function_name):
                raise AttributeError(f"{module_path} must define {function_name}().")

        return module


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]