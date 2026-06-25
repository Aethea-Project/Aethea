# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from pipeline.modules.torch_ensemble import TorchClassificationEnsemble


class BodyPartRouter:
    """
    Routes the preprocessed X-ray to the matching detector group using
    the CheXNet + ResNet body-part classifier ensemble.
    """

    def __init__(self, config=None, available_groups=None):
        self.config = config or {}
        self.top_k = int(self.config.get("top_k", 1))
        self.confidence_threshold = float(self.config.get("confidence_threshold", 0.32))
        self.group_mapping = self.config.get("group_mapping", {}) or {}
        self.available_groups = list(available_groups or [])
        self.ensemble = TorchClassificationEnsemble(
            model_specs=self.config.get("classifier_models", {}),
            labels=self.config.get("labels", []),
            input_size=int(self.config.get("input_size", 224)),
        )

    def predict(self, image):
        prediction = self.ensemble.predict(image)
        sorted_scores = sorted(
            prediction["scores"].items(),
            key=lambda item: item[1],

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

            reverse=True,
        )

        routed_groups = []
        for part, confidence in sorted_scores:
            if len(routed_groups) >= self.top_k:
                break
            if confidence < self.confidence_threshold:
                continue

            group = self.group_mapping.get(part, part)
            if group not in self.available_groups:
                continue

            routed_groups.append(
                {
                    "group": group,
                    "part": part,
                    "confidence": float(confidence),
                    "source": "router_ensemble",
                    "scores": prediction["scores"],
                    "model_predictions": prediction["models"],
                }
            )

        return routed_groups


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]