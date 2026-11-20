
import io
import base64

import numpy as np
import torch
import torch.nn.functional as F

from PIL import Image


def generate_fold_gradcam(model, input_tensor, target_class):

    model.eval()
    model.zero_grad(set_to_none=True)

    captured = {}

    target_layer = model.stages[3].blocks[-1]

    def forward_hook(module, inputs, output):
        if not torch.is_tensor(output):
            raise TypeError("Unexpected PVTv2 block output")

        captured["activation"] = output
        output.retain_grad()

    handle = target_layer.register_forward_hook(
        forward_hook
    )

    try:
        with torch.enable_grad():

            logits = model(input_tensor)

            score = logits[0, target_class]

            score.backward()

            activation = captured["activation"]
            gradient = activation.grad

            if gradient is None:
                raise RuntimeError("Gradients unavailable")

            B, N, C = activation.shape
            H = W = int(N ** 0.5)

            if H * W != N:
                raise ValueError("Invalid token dimensions")

            activation = activation.detach().reshape(
                B, H, W, C
            ).permute(0, 3, 1, 2)

            gradient = gradient.detach().reshape(
                B, H, W, C
            ).permute(0, 3, 1, 2)

            weights = gradient.mean(
                dim=(2, 3),
                keepdim=True
            )

            cam = torch.relu(
                (weights * activation).sum(
                    dim=1, keepdim=True
                )
            )

            cam = F.interpolate(
                cam,
                size=(224, 224),
                mode="bilinear",
                align_corners=False
            )

            cam = cam[0, 0]

            cam = cam / (
                cam.max() + 1e-8
            )

            result = cam.detach().cpu().numpy()

            if not np.isfinite(result).all():
                raise RuntimeError("Invalid Grad-CAM values")

            return result

    finally:
        handle.remove()
        model.zero_grad(set_to_none=True)


def generate_ensemble_gradcam(
    models,
    input_tensor,
    target_class
):

    fold_maps = []

    for fold, model in enumerate(models):

        cam = generate_fold_gradcam(
            model,
            input_tensor,
            target_class
        )

        fold_maps.append(cam)

        print(f"[V4 Grad-CAM] Fold {fold}: PASS")

    ensemble_cam = np.mean(
        np.stack(fold_maps, axis=0),
        axis=0
    )

    ensemble_cam = ensemble_cam / (
        ensemble_cam.max() + 1e-8
    )

    return ensemble_cam


def create_gradcam_overlay(pil_image, cam):

    original = pil_image.convert("RGB").resize(
        (224, 224)
    )

    original_array = (
        np.asarray(original).astype(np.float32) / 255.0
    )

    import matplotlib

    heatmap = matplotlib.colormaps["jet"](
        cam
    )[..., :3]

    overlay = (
        0.55 * original_array +
        0.45 * heatmap
    )

    overlay = np.clip(
        overlay * 255,
        0,
        255
    ).astype(np.uint8)

    buffer = io.BytesIO()

    Image.fromarray(overlay).save(
        buffer,
        format="JPEG",
        quality=90
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

    return "data:image/jpeg;base64," + encoded
