# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from pipeline.modules.torch_ensemble import TorchClassificationEnsemble


class Classifier:
    """
    Predicts fracture type from the preprocessed full image using the
    ConvNeXt + EfficientNet classifier ensemble.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.confidence_threshold = float(self.config.get("confidence_threshold", 0.32))

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

        self.ensemble = TorchClassificationEnsemble(
            model_specs=self.config.get("classifier_models", {}),
            labels=self.config.get("fracture_type_labels", []),
            input_size=int(self.config.get("classifier_input_size", 224)),
        )

    def predict(self, image):
        result = self.ensemble.predict(image)
        if result["confidence"] < self.confidence_threshold:
            result["label"] = "Unknown"
        return result


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]