# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

import numpy as np


class ROIExtractor:
    """
    Extracts Regions of Interest (ROIs) from detections.
    """

    def __init__(self, padding=10):
        self.padding = padding  # small padding around bbox

    def extract(self, image, detections):
        """
        Input:
            image → np.ndarray (512, 512)
            detections → list of dicts with bbox

        Output:
            List of ROIs with metadata
        """

        rois = []

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]


        h, w = image.shape[:2]

        for det in detections:
            x1, y1, x2, y2 = det["bbox"]

            # 🔥 Apply padding safely
            x1 = max(0, x1 - self.padding)
            y1 = max(0, y1 - self.padding)
            x2 = min(w, x2 + self.padding)
            y2 = min(h, y2 + self.padding)

            roi = image[y1:y2, x1:x2]

            rois.append({
                "roi": roi,
                "bbox": [x1, y1, x2, y2],
                "confidence": det["confidence"],
                "group": det["group"]
            })

        return rois


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]