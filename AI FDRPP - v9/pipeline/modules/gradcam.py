# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

"""
Simple Grad-CAM implementation that works with torchvision/timm models.

It expects a `TorchClassificationEnsemble`-like object (has `models`,
`_preprocess`, and `labels`). We compute Grad-CAM from the first model
in the ensemble as a representative explanation.
"""
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn


def _find_target_layer(model: nn.Module) -> Optional[nn.Module]:
    # Find the last Conv2d layer by walking modules in reverse
    for module in reversed(list(model.modules())):
        if isinstance(module, nn.Conv2d):
            return module
    return None


def generate_gradcam(ensemble, image: np.ndarray, target_index: Optional[int] = None):
    """
    Generate a Grad-CAM overlay (BGR uint8 image) for the given image.

    ensemble: TorchClassificationEnsemble instance
    image: HxW[BGR] numpy array
    target_index: optional integer index of target class. If None, use
                  ensemble.predict(image)['label'] to determine index.
    """
    if not getattr(ensemble, "models", None):
        raise RuntimeError("Ensemble has no loaded models for Grad-CAM")

    model = ensemble.models[0]
    device = ensemble.device

    # Preprocess and move to device
    tensor = ensemble._preprocess(image).to(device)

    # Determine target index
    if target_index is None:
        pred = ensemble.predict(image)
        labels = ensemble.labels
        try:
            target_index = labels.index(pred.get("label"))
        except Exception:
            target_index = int(np.argmax(list(pred.get("scores", {}).values()) or [0]))

    activations = None
    gradients = None

    def forward_hook(module, input, output):
        nonlocal activations
        activations = output.detach()

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]


    def backward_hook(module, grad_in, grad_out):
        nonlocal gradients
        # grad_out is a tuple
        gradients = grad_out[0].detach()

    target_layer = _find_target_layer(model)
    if target_layer is None:
        raise RuntimeError("No convolutional layer found in model for Grad-CAM")

    fh = target_layer.register_forward_hook(forward_hook)
    bh = target_layer.register_full_backward_hook(backward_hook)

    model.zero_grad()
    tensor.requires_grad = True

    output = model(tensor)
    if isinstance(output, (tuple, list)):
        output = output[0]

    score = output[0, target_index]
    score.backward(retain_graph=False)

    fh.remove()
    bh.remove()

    if activations is None or gradients is None:
        raise RuntimeError("Failed to capture activations or gradients for Grad-CAM")

    # Compute weights: global average pooling of gradients
    weights = torch.mean(gradients, dim=(2, 3), keepdim=True)  # shape [N, C, 1, 1]
    cam = torch.relu(torch.sum(weights * activations, dim=1, keepdim=True))  # [N,1,H,W]
    cam = cam.squeeze(0).squeeze(0).cpu().numpy()

    # Normalize cam to 0..1
    cam = cam - cam.min()
    if cam.max() > 0:
        cam = cam / cam.max()

    # Resize to model input size
    input_size = ensemble.input_size
    heatmap = cv2.resize((cam * 255).astype('uint8'), (input_size, input_size))
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

    # Prepare base image (RGB expected) from ensemble preprocessing
    # Recreate resized RGB image
    if image.ndim == 2:
        base = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    else:
        base = image.copy()

    base = cv2.resize(base, (input_size, input_size))

    overlay = cv2.addWeighted(heatmap, 0.5, base, 0.5, 0)

    return overlay


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]