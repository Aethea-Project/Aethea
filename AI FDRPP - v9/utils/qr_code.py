# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from __future__ import annotations

import base64
import io

import qrcode
from qrcode.constants import ERROR_CORRECT_M


def generate_qr_data_uri(url: str) -> str:

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]