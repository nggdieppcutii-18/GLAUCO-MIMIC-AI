import os
import io
import time
import base64
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np

# Path resolution for checkpoint
POSSIBLE_CHECKPOINT_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "glauco_resnet18_baseline.pth"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "model", "glauco_resnet18_baseline.pth"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "GLAUCO_MIMIC_MODEL", "glauco_resnet18_baseline.pth"),
    "glauco_resnet18_baseline.pth"
]

class GlaucomaInferenceEngine:
    CLINICAL_DISCLAIMER = (
        "MÔ HÌNH NGHIÊN CỨU LÂM SÀNG (EXPERIMENTAL ONLY): Điểm số đầu ra là giá trị hàm Softmax "
        "từ mô hình ResNet-18 thử nghiệm học máy, KHÔNG PHẢI xác suất chẩn đoán bệnh học lâm sàng. "
        "Kết quả chỉ phục vụ nghiên cứu & trình diễn thuật toán, tuyệt đối không thay thế kết luận y khoa của bác sĩ chuyên khoa Mắt."
    )
    FIVE_CLASS_SCAFFOLD_NOTICE = (
        "LƯU Ý 5 NHÓM BỆNH: Mô hình hiện tại chỉ đánh giá phân loại nhị phân Glocom vs Đối chứng (Fundus N=61). "
        "Các bệnh lý thần kinh thị giác CON, NAION, ON và Mắt bình thường chưa có đủ mẫu để phân loại 5 lớp độc lập."
    )

    def __init__(self, checkpoint_path: str = None):
        self.device = torch.device("cpu") # CPU inference for reliable local hosting
        self.model = None
        self.classes = ['Non-Glaucoma', 'Glaucoma']
        self.target_modality = 'fundus'
        self.checkpoint_info = {}
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Resolve checkpoint path
        self.checkpoint_path = checkpoint_path or self._find_checkpoint()
        self._load_model()

    def _find_checkpoint(self) -> str:
        for p in POSSIBLE_CHECKPOINT_PATHS:
            if os.path.exists(p):
                return p
        return POSSIBLE_CHECKPOINT_PATHS[0]

    def _load_model(self):
        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(f"Checkpoint not found at: {self.checkpoint_path}")
            
        print(f"[ModelEngine] Loading weights from: {self.checkpoint_path}")
        checkpoint = torch.load(self.checkpoint_path, map_location=self.device)
        
        # Verify metadata
        self.classes = checkpoint.get('classes', ['Non-Glaucoma', 'Glaucoma'])
        self.target_modality = checkpoint.get('target_modality', 'fundus')
        self.checkpoint_info = {
            'val_fold': checkpoint.get('val_fold', 0),
            'target_modality': self.target_modality,
            'classes': self.classes,
            'checkpoint_file': os.path.basename(self.checkpoint_path)
        }
        
        # Build ResNet-18 matching exact training head
        base_model = models.resnet18(weights=None)
        in_features = base_model.fc.in_features
        base_model.fc = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.2),
            nn.Linear(128, len(self.classes))
        )
        
        base_model.load_state_dict(checkpoint['model_state_dict'])
        base_model.eval()
        self.model = base_model
        print("[ModelEngine] ResNet-18 Baseline loaded and set to eval mode.")

    def generate_gradcam_heatmap(self, pil_image: Image.Image, target_class: int) -> str:
        """
        Computes genuine mathematical Grad-CAM from layer4[1].conv2
        and returns base64 data URI of the colored heatmap overlay.
        """
        try:
            target_layer = self.model.layer4[1].conv2
            activations = None
            gradients = None

            def fwd_hook(module, inp, outp):
                nonlocal activations
                activations = outp.detach()

            def bwd_hook(module, grad_in, grad_out):
                nonlocal gradients
                gradients = grad_out[0].detach()

            h1 = target_layer.register_forward_hook(fwd_hook)
            h2 = target_layer.register_full_backward_hook(bwd_hook)

            input_t = self.transform(pil_image).unsqueeze(0).to(self.device)
            self.model.eval()
            output = self.model(input_t)

            self.model.zero_grad()
            score = output[0, target_class]
            score.backward()

            h1.remove()
            h2.remove()

            # Weight activations by pooled gradients
            weights = gradients.mean(dim=(2, 3), keepdim=True)
            cam = (weights * activations).sum(dim=1, keepdim=True)
            cam = torch.clamp(cam, min=0)
            cam = nn.functional.interpolate(cam, size=(224, 224), mode='bilinear', align_corners=False)
            cam = cam.squeeze().cpu().numpy()
            cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

            # Generate pseudo-color overlay without needing cv2
            orig_resized = pil_image.resize((224, 224)).convert('RGB')
            orig_arr = np.array(orig_resized, dtype=np.float32) / 255.0

            # Simple jet colormap approximation in numpy:
            # Blue (0) -> Cyan -> Green -> Yellow -> Red (1)
            jet_r = np.clip(1.5 - np.abs(4.0 * cam - 3.0), 0.0, 1.0)
            jet_g = np.clip(1.5 - np.abs(4.0 * cam - 2.0), 0.0, 1.0)
            jet_b = np.clip(1.5 - np.abs(4.0 * cam - 1.0), 0.0, 1.0)
            heatmap_rgb = np.stack([jet_r, jet_g, jet_b], axis=-1)

            overlay = 0.55 * orig_arr + 0.45 * heatmap_rgb
            overlay = np.clip(overlay * 255.0, 0, 255).astype(np.uint8)

            buf = io.BytesIO()
            Image.fromarray(overlay).save(buf, format='JPEG', quality=85)
            b64_str = base64.b64encode(buf.getvalue()).decode('utf-8')
            return f"data:image/jpeg;base64,{b64_str}"
        except Exception as e:
            print(f"[ModelEngine] Grad-CAM generation warning: {e}")
            return ""

    def predict_fundus(self, image_bytes: bytes, filename: str = "upload.jpg") -> dict:
        start_time = time.time()
        
        # Load & validate PIL image
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify() # Verify file header integrity
            # Reopen after verify
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Định dạng tệp ảnh không hợp lệ hoặc dữ liệu bị lỗi: {str(e)}")

        orig_w, orig_h = image.size
        
        # Preprocessing
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # Inference
        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1)[0]
            
        prob_non_glaucoma = float(probs[0].item())
        prob_glaucoma = float(probs[1].item())
        predicted_idx = 1 if prob_glaucoma >= 0.5 else 0
        predicted_class = self.classes[predicted_idx]
        
        inference_time_ms = round((time.time() - start_time) * 1000, 2)
        
        # Grad-CAM heatmap overlay for explainability
        gradcam_overlay_uri = self.generate_gradcam_heatmap(image, predicted_idx)
        
        return {
            "status": "SUCCESS",
            "model": "ResNet-18 Glaucoma Screening Baseline",
            "targetModality": "fundus",
            "predictedClass": predicted_class,
            "predictionCode": "GLAUCOMA" if predicted_idx == 1 else "NON_GLAUCOMA",
            "softmaxScores": {
                "Glaucoma": round(prob_glaucoma, 4),
                "Non-Glaucoma": round(prob_non_glaucoma, 4)
            },
            "probabilities": {
                "Glaucoma": round(prob_glaucoma, 4),
                "Non-Glaucoma": round(prob_non_glaucoma, 4)
            },
            "confidenceScore": round(max(prob_glaucoma, prob_non_glaucoma), 4),
            "inferenceTimeMs": inference_time_ms,
            "imageMetadata": {
                "filename": filename,
                "originalWidth": orig_w,
                "originalHeight": orig_h,
                "processedSize": [224, 224]
            },
            "gradcamOverlayUri": gradcam_overlay_uri,
            "disclaimer": self.CLINICAL_DISCLAIMER,
            "fiveClassScaffoldNotice": self.FIVE_CLASS_SCAFFOLD_NOTICE
        }

# Global singleton engine
_global_engine = None

def get_engine() -> GlaucomaInferenceEngine:
    global _global_engine
    if _global_engine is None:
        _global_engine = GlaucomaInferenceEngine()
    return _global_engine
