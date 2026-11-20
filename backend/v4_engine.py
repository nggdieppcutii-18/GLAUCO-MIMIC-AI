
import io
import time
import threading
from pathlib import Path

import torch
import timm
from PIL import Image
from torchvision import transforms


class PVTv2V4Engine:

    MODEL_NAME = "PVTv2-B2 V4 Ensemble"
    ARCHITECTURE = "pvt_v2_b2"
    CLASSES = ["Non-Glaucoma", "Glaucoma"]
    THRESHOLD = 0.5
    ENSEMBLE_SIZE = 5
    INPUT_SIZE = 224

    def __init__(self):

        self.device = torch.device("cpu")
        self.lock = threading.RLock()

        self.models = []
        self.checkpoints_info = []

        self.checkpoint_dir = (
            Path(__file__).resolve().parent.parent
            / "models"
            / "v4"
        )

        self.transform = transforms.Compose([
            transforms.Resize(
                (self.INPUT_SIZE, self.INPUT_SIZE)
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        self._load_models()

    # =================================================
    # MODEL LOADING
    # =================================================

    def _load_models(self):

        print("[V4] Loading five PVTv2-B2 checkpoints...")

        self.models.clear()
        self.checkpoints_info.clear()

        for fold in range(self.ENSEMBLE_SIZE):

            path = (
                self.checkpoint_dir
                / f"v4_fold{fold}_best.pth"
            )

            if not path.is_file():
                raise FileNotFoundError(str(path))

            checkpoint = torch.load(
                path,
                map_location="cpu",
                weights_only=True
            )

            if checkpoint.get("model_name") != self.ARCHITECTURE:
                raise ValueError(
                    f"Invalid architecture: fold {fold}"
                )

            if int(checkpoint.get("fold", -1)) != fold:
                raise ValueError(
                    f"Fold metadata mismatch: {fold}"
                )

            model = timm.create_model(
                self.ARCHITECTURE,
                pretrained=False,
                num_classes=2
            )

            model.load_state_dict(
                checkpoint["model_state_dict"],
                strict=True
            )

            model.to(self.device)
            model.eval()

            self.models.append(model)

            self.checkpoints_info.append({
                "fold": fold,
                "epoch": int(checkpoint["epoch"]),
                "best_val_auc": float(
                    checkpoint["best_val_auc"]
                ),
                "filename": path.name
            })

            print(f"[V4] Fold {fold}: LOADED")

            del checkpoint

        if len(self.models) != self.ENSEMBLE_SIZE:
            raise RuntimeError(
                "Incomplete V4 ensemble"
            )

        print("[V4] ENSEMBLE READY")

    # =================================================
    # FIVE-FOLD INFERENCE
    # =================================================

    def predict_tensor(self, input_tensor):

        if len(self.models) != self.ENSEMBLE_SIZE:
            raise RuntimeError(
                "V4 ensemble not ready"
            )

        expected_shape = (
            1, 3,
            self.INPUT_SIZE,
            self.INPUT_SIZE
        )

        if tuple(input_tensor.shape) != expected_shape:
            raise ValueError(
                f"Invalid input tensor shape: "
                f"{tuple(input_tensor.shape)}"
            )

        if not torch.isfinite(input_tensor).all():
            raise ValueError(
                "Input tensor contains invalid values"
            )

        with self.lock:

            start = time.perf_counter()
            fold_probabilities = []

            with torch.inference_mode():

                for fold, model in enumerate(self.models):

                    logits = model(input_tensor)

                    probs = torch.softmax(
                        logits.float(),
                        dim=1
                    )[0]

                    if not torch.isfinite(probs).all():
                        raise RuntimeError(
                            f"Invalid output in fold {fold}"
                        )

                    fold_probabilities.append(
                        probs.cpu()
                    )

            stacked = torch.stack(
                fold_probabilities,
                dim=0
            )

            ensemble = stacked.mean(dim=0)

            p_normal = float(ensemble[0])
            p_glaucoma = float(ensemble[1])

            probability_sum = p_normal + p_glaucoma

            if abs(probability_sum - 1.0) > 1e-5:
                raise RuntimeError(
                    "Invalid probability sum"
                )

            predicted_idx = (
                1
                if p_glaucoma >= self.THRESHOLD
                else 0
            )

            elapsed = (
                time.perf_counter() - start
            ) * 1000

            return {
                "model": self.MODEL_NAME,

                "predictedClass": (
                    self.CLASSES[predicted_idx]
                ),

                "predictionCode": (
                    "GLAUCOMA"
                    if predicted_idx == 1
                    else "NON_GLAUCOMA"
                ),

                "softmaxScores": {
                    "Glaucoma": p_glaucoma,
                    "Non-Glaucoma": p_normal
                },

                "confidenceScore": max(
                    p_normal,
                    p_glaucoma
                ),

                "threshold": self.THRESHOLD,

                "inferenceTimeMs": round(
                    elapsed, 2
                ),

                "foldProbabilities": stacked.tolist()
            }

    # =================================================
    # FUNDUS INFERENCE + GRAD-CAM
    # =================================================

    def predict_fundus(
        self,
        image_bytes,
        filename="upload.jpg"
    ):

        from backend.v4_gradcam import (
            generate_ensemble_gradcam,
            create_gradcam_overlay
        )

        request_start = time.perf_counter()

        stage_times = {}

        # ---------------------------------------------
        # 1. IMAGE DECODING
        # ---------------------------------------------

        stage_start = time.perf_counter()

        try:

            image = Image.open(
                io.BytesIO(image_bytes)
            )

            image.verify()

            image = Image.open(
                io.BytesIO(image_bytes)
            ).convert("RGB")

        except Exception as exc:

            raise ValueError(
                f"Invalid fundus image: {exc}"
            ) from exc

        width, height = image.size

        stage_times["image_decode_ms"] = round(
            (time.perf_counter() - stage_start) * 1000,
            2
        )

        # ---------------------------------------------
        # 2. PREPROCESSING
        # ---------------------------------------------

        stage_start = time.perf_counter()

        tensor = self.transform(image).unsqueeze(0)

        tensor = tensor.to(self.device)

        stage_times["preprocessing_ms"] = round(
            (time.perf_counter() - stage_start) * 1000,
            2
        )

        # ---------------------------------------------
        # 3. FIVE-FOLD FORWARD INFERENCE
        # ---------------------------------------------

        result = self.predict_tensor(tensor)

        stage_times["ensemble_forward_ms"] = (
            result["inferenceTimeMs"]
        )

        # ---------------------------------------------
        # 4. DETERMINE TARGET CLASS
        # ---------------------------------------------

        target_class = (
            1
            if result["predictionCode"] == "GLAUCOMA"
            else 0
        )

        # ---------------------------------------------
        # 5. ENSEMBLE GRAD-CAM
        # ---------------------------------------------

        stage_start = time.perf_counter()

        with self.lock:

            cam = generate_ensemble_gradcam(
                self.models,
                tensor,
                target_class
            )

        stage_times["gradcam_ms"] = round(
            (time.perf_counter() - stage_start) * 1000,
            2
        )

        # ---------------------------------------------
        # 6. OVERLAY + JPEG + BASE64
        # ---------------------------------------------

        stage_start = time.perf_counter()

        overlay_uri = create_gradcam_overlay(
            image,
            cam
        )

        stage_times["overlay_and_base64_ms"] = round(
            (time.perf_counter() - stage_start) * 1000,
            2
        )

        # ---------------------------------------------
        # 7. TOTAL PIPELINE TIME
        # ---------------------------------------------

        total_pipeline_ms = round(
            (time.perf_counter() - request_start) * 1000,
            2
        )

        # ---------------------------------------------
        # 8. RESPONSE
        # ---------------------------------------------

        result.update({

            "status": "SUCCESS",

            "targetModality": "fundus",

            "probabilities": result["softmaxScores"],

            "imageMetadata": {
                "filename": filename,
                "originalWidth": width,
                "originalHeight": height,
                "processedSize": [
                    self.INPUT_SIZE,
                    self.INPUT_SIZE
                ]
            },

            "gradcamOverlayUri": overlay_uri,

            "disclaimer": (
                "CHỈ PHỤC VỤ NGHIÊN CỨU THỬ NGHIỆM. "
                "Kết quả không phải là chẩn đoán y khoa và "
                "không thay thế việc thăm khám, đánh giá "
                "của bác sĩ chuyên khoa Mắt."
            ),

            "fiveClassScaffoldNotice": (
                "MÔ HÌNH HIỆN CHỈ THỰC HIỆN PHÂN LOẠI NHỊ PHÂN "
                "GIỮA GLAUCOMA VÀ NHÓM ĐỐI CHỨNG (NORMAL). "
                "CHƯA ĐƯỢC THIẾT KẾ HOẶC THẨM ĐỊNH ĐỂ PHÂN LOẠI "
                "ĐỘC LẬP 5 NHÓM BỆNH MỤC TIÊU: GLAUCOMA, CON, "
                "NAION, VIÊM DÂY THẦN KINH THỊ GIÁC VÀ "
                "MẮT BÌNH THƯỜNG."
            ),

            "timingBreakdownMs": stage_times,

            "totalPipelineMs": total_pipeline_ms

        })

        print(
            "[V4 PROFILE] "
            f"Decode={stage_times['image_decode_ms']}ms | "
            f"Preprocess={stage_times['preprocessing_ms']}ms | "
            f"Forward={stage_times['ensemble_forward_ms']}ms | "
            f"GradCAM={stage_times['gradcam_ms']}ms | "
            f"Overlay/Base64={stage_times['overlay_and_base64_ms']}ms | "
            f"Total={total_pipeline_ms}ms"
        )

        return result

    # =================================================
    # HEALTH
    # =================================================

    def health(self):

        ready = (
            len(self.models) == self.ENSEMBLE_SIZE
            and len(self.checkpoints_info) == self.ENSEMBLE_SIZE
        )

        return {

            "status": (
                "ok" if ready else "error"
            ),

            "connected": True,

            # Technical checkpoint verification only.
            # Does not represent clinical validation.
            "modelVerified": ready,

            "engineState": (
                "INFERENCE_READY"
                if ready
                else "AWAITING_MODEL_WEIGHTS"
            ),

            "modelName": self.MODEL_NAME,

            "architecture": self.ARCHITECTURE,

            "ensembleSize": len(self.models),

            "threshold": self.THRESHOLD,

            "device": str(self.device),

            "checkpoints": self.checkpoints_info,

            "clinicalValidation": "NOT_ESTABLISHED"

        }
