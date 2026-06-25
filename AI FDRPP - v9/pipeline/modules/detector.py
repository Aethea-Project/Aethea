# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

import os

import numpy as np


class Detector:
    """
    Runs the body-part detector together with the global detector ensemble.

    Fallback behavior:
    - Runs the routed body-part model first.
    - Runs any configured companion detectors next.
    - Optionally runs the global ensemble beside those detectors.
    - If the configured pass returns no boxes, runs the five-model ensemble fallback.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.confidence_threshold = float(self.config.get("confidence_threshold", 0.32))
        self.iou_threshold = float(self.config.get("iou_threshold", 0.45))
        self.fallback_min_detections = int(self.config.get("fallback_min_detections", 1))
        self.group_configs = self.config.get("groups", {}) or {}
        self.global_ensemble_paths = self.config.get("ensemble", []) or []
        self.models = {}
        self._load_all_models()

    def detect(self, image, groups):
        detections = []

        for group_info in groups:
            group_name = group_info["group"]
            group_config = self.group_configs.get(group_name)
            if not group_config:
                continue

            group_detections = self._detect_group(image, group_name, group_config, group_info)
            detections.extend(group_detections)

        return self._nms(detections)

    def configured_groups(self):
        groups_with_models = [
            group_name
            for group_name, group_config in self.group_configs.items()
            if self._has_model_path(group_config)
        ]
        return groups_with_models or list(self.group_configs.keys())

    def _detect_group(self, image, group_name, group_config, group_info):
        main_detections = []
        main_key = (group_name, "main", 0)
        if main_key in self.models:
            main_detections = self._run_model(
                image,
                self.models[main_key],
                group_name,
                group_config,
                group_info,
                "body_part",
            )

        companion_detections = self._run_companions(image, group_name, group_config, group_info)
        combined_inputs = main_detections + companion_detections

        if group_config.get("use_ensemble_with_main", True):
            combined_inputs.extend(
                self._run_ensemble(image, group_name, group_config, group_info, "ensemble")
            )

        combined = self._nms(combined_inputs)

        if len(combined) >= self.fallback_min_detections:
            return combined

        fallback = self._run_ensemble(image, group_name, group_config, group_info, "fallback_ensemble")
        return self._nms(fallback)

    def _run_companions(self, image, group_name, group_config, group_info):
        detections = []
        for index, _ in enumerate(group_config.get("companions") or []):
            key = (group_name, "companion", index)
            if key not in self.models:
                continue
            detections.extend(
                self._run_model(
                    image,
                    self.models[key],
                    group_name,
                    group_config,
                    group_info,
                    "companion",
                )
            )
        return detections

    def _run_ensemble(self, image, group_name, group_config, group_info, detector_role):
        detections = []
        for index, _ in enumerate(self._ensemble_paths_for(group_config)):
            key = (group_name, "ensemble", index) if group_config.get("ensemble") else ("ensemble", index)
            if key not in self.models:
                continue
            detections.extend(
                self._run_model(
                    image,
                    self.models[key],
                    group_name,
                    group_config,
                    group_info,
                    detector_role,
                )
            )

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

        return detections

    def _run_model(self, image, model_entry, group_name, group_config, group_info, detector_role):
        model = model_entry["model"]
        model_path = model_entry["path"]
        result = model(image, conf=self.confidence_threshold, verbose=False)[0]

        if not getattr(result, "boxes", None) or result.boxes.xyxy is None:
            return []

        boxes = result.boxes.xyxy.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()
        class_ids = result.boxes.cls.cpu().numpy() if result.boxes.cls is not None else np.zeros(len(boxes))
        names = result.names or {}

        detections = []
        for bbox, confidence, class_id in zip(boxes, confidences, class_ids):
            x1, y1, x2, y2 = [int(round(v)) for v in bbox.tolist()]
            if x2 <= x1 or y2 <= y1:
                continue

            detections.append(
                {
                    "bbox": [x1, y1, x2, y2],
                    "confidence": float(confidence),
                    "group": group_name,
                    "body_part": group_info.get("part"),
                    "router_confidence": group_info.get("confidence"),
                    "class_id": int(class_id),
                    "class_name": str(names.get(int(class_id), int(class_id))),
                    "detector_role": detector_role,
                    "model_path": model_path,
                    "anatomy": group_config.get("anatomy", {}),
                }
            )

        return detections

    def _load_all_models(self):
        for index, ensemble_path in enumerate(self.global_ensemble_paths):
            if ensemble_path:
                self.models[("ensemble", index)] = self._load_model_entry(ensemble_path)

        for group_name, group_config in self.group_configs.items():
            main_path = group_config.get("main")
            if main_path and os.path.exists(main_path):
                self.models[(group_name, "main", 0)] = self._load_model_entry(main_path)

            for index, ensemble_path in enumerate(group_config.get("ensemble") or []):
                if ensemble_path:
                    self.models[(group_name, "ensemble", index)] = self._load_model_entry(ensemble_path)

            for index, companion_path in enumerate(group_config.get("companions") or []):
                if companion_path:
                    self.models[(group_name, "companion", index)] = self._load_model_entry(companion_path)

    def _load_model_entry(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Configured detector model path does not exist: {model_path}")

        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise ImportError("ultralytics is required for detector inference. Install it with: pip install ultralytics") from exc

        return {"path": model_path, "model": YOLO(model_path)}

    def _has_model_path(self, group_config):
        return bool(
            group_config.get("main")
            or any(group_config.get("companions") or [])
            or any(self._ensemble_paths_for(group_config))
        )

    def _ensemble_paths_for(self, group_config):
        return group_config.get("ensemble") or self.global_ensemble_paths

    def _nms(self, detections):
        if len(detections) <= 1:
            return detections

        boxes = np.array([det["bbox"] for det in detections], dtype=np.float32)
        scores = np.array([det["confidence"] for det in detections], dtype=np.float32)
        order = scores.argsort()[::-1]
        keep = []

        while order.size > 0:
            current = order[0]
            keep.append(current)

            if order.size == 1:
                break

            ious = self._iou(boxes[current], boxes[order[1:]])
            order = order[1:][ious <= self.iou_threshold]

        return [detections[index] for index in keep]

    def _iou(self, box, boxes):
        x1 = np.maximum(box[0], boxes[:, 0])
        y1 = np.maximum(box[1], boxes[:, 1])
        x2 = np.minimum(box[2], boxes[:, 2])
        y2 = np.minimum(box[3], boxes[:, 3])

        intersection = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
        box_area = max(0, box[2] - box[0]) * max(0, box[3] - box[1])
        boxes_area = np.maximum(0, boxes[:, 2] - boxes[:, 0]) * np.maximum(0, boxes[:, 3] - boxes[:, 1])
        union = box_area + boxes_area - intersection

        return np.divide(intersection, union, out=np.zeros_like(intersection), where=union > 0)


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]