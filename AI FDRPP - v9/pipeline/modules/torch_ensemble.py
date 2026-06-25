# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

import os

import cv2
import numpy as np
import torch
import torch.nn as nn


class TorchClassificationEnsemble:
    """
    Loads multiple PyTorch classification models and averages their probabilities.
    """

    def __init__(self, model_specs, labels, input_size=224, device=None):
        self.labels = list(labels or [])
        if not self.labels:
            raise ValueError("Classification ensemble needs labels in config.yaml.")

        self.input_size = int(input_size)
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model_specs = self._normalize_specs(model_specs)
        if not self.model_specs:
            raise ValueError("Classification ensemble needs at least one model path.")

        self.models = [self._load_model(spec) for spec in self.model_specs]

    def predict(self, image):
        tensor = self._preprocess(image).to(self.device)
        model_outputs = []

        with torch.inference_mode():
            for spec, model in zip(self.model_specs, self.models):
                logits = model(tensor)
                if isinstance(logits, (tuple, list)):
                    logits = logits[0]

                probs = torch.softmax(logits, dim=1).detach().cpu().numpy()[0]
                model_outputs.append(
                    {
                        "name": spec["name"],
                        "path": spec["path"],
                        "probabilities": probs,
                        "label": self.labels[int(np.argmax(probs))],
                        "confidence": float(np.max(probs)),
                    }
                )

        averaged = np.mean([output["probabilities"] for output in model_outputs], axis=0)
        label_index = int(np.argmax(averaged))

        return {
            "label": self.labels[label_index],
            "confidence": float(averaged[label_index]),
            "scores": {
                label: float(score)
                for label, score in zip(self.labels, averaged)
            },
            "models": [
                {
                    "name": output["name"],
                    "path": output["path"],
                    "label": output["label"],
                    "confidence": output["confidence"],
                }
                for output in model_outputs
            ],
        }

    def _normalize_specs(self, model_specs):
        normalized = []

        if isinstance(model_specs, dict):
            items = model_specs.items()
        else:
            items = [(f"model_{index}", spec) for index, spec in enumerate(model_specs or [])]

        for name, spec in items:
            if isinstance(spec, str):
                spec = {"path": spec}
            spec = dict(spec)
            spec["name"] = spec.get("name") or str(name)
            spec["architecture"] = spec.get("architecture") or self._infer_architecture(spec["name"], spec["path"])
            normalized.append(spec)

        return normalized

    def _infer_architecture(self, name, path):
        text = f"{name} {path}".lower()
        if "resnet" in text:
            return "resnet50"
        if "chexnet" in text or "densenet" in text:

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

            return "densenet121"
        if "convnext" in text:
            return "convnext_tiny"
        if "effnet" in text or "efficientnet" in text:
            return "efficientnet_b1"
        raise ValueError(f"Cannot infer model architecture for {name}. Add architecture in config.yaml.")

    def _load_model(self, spec):
        path = spec["path"]
        if not os.path.exists(path):
            raise FileNotFoundError(f"Configured classifier model path does not exist: {path}")

        checkpoint = self._load_checkpoint(path)
        if isinstance(checkpoint, nn.Module):
            model = checkpoint
        else:
            state_dict = self._extract_state_dict(checkpoint)
            model = self._build_model(spec["architecture"], len(self.labels))
            model.load_state_dict(self._clean_state_dict(state_dict), strict=True)

        model.to(self.device)
        model.eval()
        return model

    def _load_checkpoint(self, path):
        try:
            return torch.load(path, map_location=self.device, weights_only=True)
        except TypeError:
            return torch.load(path, map_location=self.device)
        except Exception:
            return torch.load(path, map_location=self.device, weights_only=False)

    def _extract_state_dict(self, checkpoint):
        if not isinstance(checkpoint, dict):
            raise TypeError("Checkpoint must be a state dict or a saved torch.nn.Module.")

        for key in ("state_dict", "model_state_dict", "net_state_dict"):
            value = checkpoint.get(key)
            if isinstance(value, dict):
                return value

        return checkpoint

    def _clean_state_dict(self, state_dict):
        cleaned = {}
        for key, value in state_dict.items():
            clean_key = key
            for prefix in ("module.", "model."):
                if clean_key.startswith(prefix):
                    clean_key = clean_key[len(prefix) :]
            cleaned[clean_key] = value
        return cleaned

    def _build_model(self, architecture, num_classes):
        architecture = architecture.lower()

        if architecture == "resnet50":
            from torchvision import models

            model = models.resnet50(weights=None)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
            return model

        if architecture in {"densenet121", "chexnet"}:
            from torchvision import models

            model = models.densenet121(weights=None)
            model.classifier = nn.Linear(model.classifier.in_features, num_classes)
            return model

        try:
            import timm
        except ImportError as exc:
            raise ImportError("timm is required for ConvNeXt/EfficientNet classifiers. Install it with: pip install timm") from exc

        return timm.create_model(architecture, pretrained=False, num_classes=num_classes)

    def _preprocess(self, image):
        if image.ndim == 2:
            rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        rgb = cv2.resize(rgb, (self.input_size, self.input_size))
        rgb = rgb.astype(np.float32) / 255.0

        tensor = torch.from_numpy(rgb).permute(2, 0, 1).float()
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        tensor = (tensor - mean) / std
        return tensor.unsqueeze(0)


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]