"""
Comprehensive Automated Test Suite for GLAUCO-MIMIC AI Inference Engine & API
=============================================================================
Verifies:
1. Model checkpoint integrity and ResNet-18 architecture parameters.
2. Binary classification probability generation & sum-to-1 constraint.
3. Grad-CAM heatmap generation and base64 output.
4. Input validation (corrupted image, non-image bytes).
5. FastAPI endpoints (/api/v1/health, /api/v1/predict/fundus).
6. Disclaimers and research-only notifications.
"""

import os
import sys
import unittest
import torch
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.model import GlaucomaInferenceEngine, get_engine
from backend.app import app


class TestGlaucomaInference(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = get_engine()
        cls.client = TestClient(app)
        
        # Paths to sample images in dataset
        cls.glaucoma_sample = os.path.join("GLOCOM", "Ảnh đáy mắt", "IMG_6127.JPG")
        cls.non_glaucoma_sample = os.path.join("THIẾU MÁU CỤC BỘ THỊ GIÁC", "Ảnh đáy mắt", "IMG_6185.JPG")

    def test_01_checkpoint_parameters(self):
        """Verify model weights and classes match the Kaggle checkpoint specifications."""
        self.assertIsNotNone(self.engine.model)
        self.assertEqual(len(self.engine.classes), 2)
        self.assertEqual(self.engine.classes[0], "Non-Glaucoma")
        self.assertEqual(self.engine.classes[1], "Glaucoma")

        # Verify final layer shape is (2, 128)
        fc_layers = list(self.engine.model.fc.children())
        final_linear = fc_layers[-1]
        self.assertEqual(final_linear.out_features, 2)
        self.assertEqual(final_linear.in_features, 128)
        print("\n[TEST 1 PASSED] Checkpoint architecture and classes verified.")

    def test_02_inference_glaucoma_sample(self):
        """Verify prediction on a known glaucoma sample image."""
        if not os.path.exists(self.glaucoma_sample):
            self.skipTest(f"Sample {self.glaucoma_sample} not found")

        with open(self.glaucoma_sample, "rb") as f:
            img_bytes = f.read()

        result = self.engine.predict_fundus(img_bytes, filename="IMG_6127.JPG")

        self.assertEqual(result["status"], "SUCCESS")
        self.assertIn("probabilities", result)
        self.assertIn("Glaucoma", result["probabilities"])
        self.assertIn("Non-Glaucoma", result["probabilities"])

        prob_glaucoma = result["probabilities"]["Glaucoma"]
        prob_non_glaucoma = result["probabilities"]["Non-Glaucoma"]

        # Probabilities must sum to ~1.0
        self.assertAlmostEqual(prob_glaucoma + prob_non_glaucoma, 1.0, places=3)
        self.assertGreater(prob_glaucoma, 0.5)

        # Grad-CAM URI should be present and valid
        self.assertTrue(result["gradcamOverlayUri"].startswith("data:image/jpeg;base64,"))
        self.assertIn("disclaimer", result)
        self.assertIn("fiveClassScaffoldNotice", result)
        print(f"\n[TEST 2 PASSED] Glaucoma inference verified. P(Glaucoma)={prob_glaucoma:.4f}")

    def test_03_inference_non_glaucoma_sample(self):
        """Verify prediction executes on a non-glaucoma fundus image."""
        if not os.path.exists(self.non_glaucoma_sample):
            self.skipTest(f"Sample {self.non_glaucoma_sample} not found")

        with open(self.non_glaucoma_sample, "rb") as f:
            img_bytes = f.read()

        result = self.engine.predict_fundus(img_bytes, filename="IMG_6185.JPG")

        self.assertEqual(result["status"], "SUCCESS")
        self.assertIn("probabilities", result)
        self.assertTrue(result["gradcamOverlayUri"].startswith("data:image/jpeg;base64,"))
        print(f"\n[TEST 3 PASSED] Non-Glaucoma sample inference completed. P(Glaucoma)={result['probabilities']['Glaucoma']:.4f}")

    def test_04_corrupted_input_handling(self):
        """Verify engine gracefully rejects corrupted image data."""
        bad_bytes = b"NOT_A_VALID_IMAGE_DATA_123456"
        with self.assertRaises(ValueError):
            self.engine.predict_fundus(bad_bytes, filename="bad.jpg")
        print("\n[TEST 4 PASSED] Corrupted image bytes correctly rejected with ValueError.")

    def test_05_api_health_endpoint(self):
        """Verify FastAPI /api/v1/health returns online status and INFERENCE_READY model info."""
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["connected"])
        self.assertTrue(data["modelVerified"])
        self.assertEqual(data["engineState"], "INFERENCE_READY")
        self.assertEqual(data["targetClasses"], ["Non-Glaucoma", "Glaucoma"])
        print("\n[TEST 5 PASSED] FastAPI /api/v1/health endpoint verified with INFERENCE_READY.")

    def test_06_api_predict_endpoint(self):
        """Verify FastAPI /api/v1/predict/fundus accepts multipart upload and returns softmax scores."""
        if not os.path.exists(self.glaucoma_sample):
            self.skipTest(f"Sample {self.glaucoma_sample} not found")

        with open(self.glaucoma_sample, "rb") as f:
            files = {"file": ("test_fundus.jpg", f, "image/jpeg")}
            response = self.client.post("/api/v1/predict/fundus", files=files)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertIn("probabilities", data)
        self.assertIn("softmaxScores", data)
        self.assertIn("gradcamOverlayUri", data)
        print("\n[TEST 6 PASSED] FastAPI /api/v1/predict/fundus endpoint verified with softmax scores.")

    def test_07_api_invalid_file_extension(self):
        """Verify FastAPI rejects non-image file uploads."""
        files = {"file": ("report.pdf", b"%PDF-1.5...", "application/pdf")}
        response = self.client.post("/api/v1/predict/fundus", files=files)
        self.assertEqual(response.status_code, 400)
        print("\n[TEST 7 PASSED] Invalid file extension correctly rejected with 400 Bad Request.")


if __name__ == "__main__":
    unittest.main()
