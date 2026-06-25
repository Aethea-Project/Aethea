# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

import numpy as np
import cv2


class Preprocessor:
    """
    Handles:
    - Reading image bytes
    - Converting to grayscale
    - Resizing
    - Normalization
    - Basic validation
    """

    def __init__(self, img_size=512):
        self.img_size = img_size

    def process(self, image_bytes):
        """
        Main pipeline method
        """
        image = self._read_image(image_bytes)

        if image is None:
            raise ValueError("Invalid image input")

        resized_bgr = self._resize(image)
        gray = self._to_grayscale(resized_bgr)
        enhanced_gray = self._enhance_contrast(gray)
        normalized_gray = self._normalize(enhanced_gray).astype(np.float32)

        return {
            "bgr": resized_bgr,
            "gray": normalized_gray,
            "height": resized_bgr.shape[0],
            "width": resized_bgr.shape[1],
        }

    # -------------------------
    # Internal helper methods
    # -------------------------

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]


    def _read_image(self, image_bytes):
        """
        Converts raw bytes → OpenCV image
        """
        try:
            file_bytes = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            return image
        except Exception:
            return None

    def _to_grayscale(self, image):
        """
        Convert BGR → Grayscale
        """
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    def _resize(self, image):
        """
        Resize to fixed size
        """
        return cv2.resize(image, (self.img_size, self.img_size))

    def _normalize(self, image):
        """
        Normalize pixel values to [0, 1]
        """
        image = image / 255.0
        return image
    
    def _enhance_contrast(self, image):
        """
        Apply CLAHE for better X-ray contrast
        """
        clahe = cv2.createCLAHE(
            clipLimit=2.7,        # increase contrast strength
            tileGridSize=(8, 8)   # local regions
        )
        return clahe.apply(image)


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]