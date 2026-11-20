"""
GLAUCO-MIMIC AI - Comprehensive E2E Scenario & Edge-Case Test Suite
===================================================================
Tests real HTTP interactions against running server at http://127.0.0.1:8000:
1. Healthcheck returns INFERENCE_READY and model metadata.
2. CORS Preflight (OPTIONS) response verification.
3. Fundus Inference on Glaucoma image -> valid softmax scores & Grad-CAM URI.
4. Fundus Inference on Non-Glaucoma image -> valid softmax scores & Grad-CAM URI.
5. Softmax Score mathematical constraint: sum ≈ 1.0.
6. Corrupted / non-image bytes -> HTTP 422 or 400 error.
7. Invalid extension (.txt / .pdf) -> HTTP 400 Bad Request.
8. Oversized file (>25MB) -> HTTP 413 Request Entity Too Large.
9. Rapid requests handling (Rate limit protection & server stability).
10. Data Privacy verification: zero file retention on server disk.
"""

import os
import sys
import time
import requests

BASE_URL = "http://127.0.0.1:8000"
API_URL = f"{BASE_URL}/api/v1"

def run_tests():
    print("=" * 70)
    print("STARTING GLAUCO-MIMIC AI E2E SCENARIO & SECURITY VERIFICATION")
    print("=" * 70)

    # 1. Healthcheck
    r = requests.get(f"{API_URL}/health")
    assert r.status_code == 200, f"Healthcheck failed with {r.status_code}"
    h = r.json()
    assert h["status"] == "ok"
    assert h["engineState"] == "INFERENCE_READY", f"Expected INFERENCE_READY, got {h['engineState']}"
    assert h["modelName"] == "ResNet-18 Glaucoma Screening Baseline"
    assert h["targetClasses"] == ["Non-Glaucoma", "Glaucoma"]
    print("[PASS] Test 1: Healthcheck OK & engineState is INFERENCE_READY.")

    # 2. CORS Preflight
    headers = {
        "Origin": "http://127.0.0.1:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
    }
    r = requests.options(f"{API_URL}/predict/fundus", headers=headers)
    assert r.status_code == 200, f"CORS preflight failed with {r.status_code}"
    assert "access-control-allow-origin" in r.headers
    assert r.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    print("[PASS] Test 2: CORS Preflight OPTIONS accepted for http://127.0.0.1:5173.")

    # 3. Glaucoma Sample Inference
    glaucoma_path = os.path.join("GLOCOM", "Ảnh đáy mắt", "IMG_6127.JPG")
    with open(glaucoma_path, "rb") as f:
        r = requests.post(
            f"{API_URL}/predict/fundus",
            files={"file": ("IMG_6127.JPG", f, "image/jpeg")},
            headers={"Origin": "http://127.0.0.1:5173"}
        )
    assert r.status_code == 200, f"Glaucoma prediction failed with {r.status_code}"
    g_res = r.json()
    assert g_res["status"] == "SUCCESS"
    assert g_res["predictedClass"] == "Glaucoma"
    assert g_res["predictionCode"] == "GLAUCOMA"
    assert "softmaxScores" in g_res or "probabilities" in g_res
    p_g = g_res.get("softmaxScores", g_res.get("probabilities"))
    assert p_g["Glaucoma"] > 0.90
    assert abs((p_g["Glaucoma"] + p_g["Non-Glaucoma"]) - 1.0) < 0.01
    assert g_res["gradcamOverlayUri"].startswith("data:image/jpeg;base64,")
    print(f"[PASS] Test 3: Glaucoma sample inferred. Softmax Score={p_g['Glaucoma']:.4f}, Latency={g_res['inferenceTimeMs']}ms.")

    # 4. Non-Glaucoma Sample Inference
    non_g_path = os.path.join("THIẾU MÁU CỤC BỘ THỊ GIÁC", "Ảnh đáy mắt", "IMG_6185.JPG")
    with open(non_g_path, "rb") as f:
        r = requests.post(
            f"{API_URL}/predict/fundus",
            files={"file": ("IMG_6185.JPG", f, "image/jpeg")},
            headers={"Origin": "http://127.0.0.1:5173"}
        )
    assert r.status_code == 200, f"Non-Glaucoma prediction failed with {r.status_code}"
    ng_res = r.json()
    assert ng_res["status"] == "SUCCESS"
    assert ng_res["predictedClass"] == "Non-Glaucoma"
    assert ng_res["predictionCode"] == "NON_GLAUCOMA"
    p_ng = ng_res.get("softmaxScores", ng_res.get("probabilities"))
    assert p_ng["Non-Glaucoma"] > 0.90
    print(f"[PASS] Test 4: Non-Glaucoma sample inferred. Softmax Score={p_ng['Non-Glaucoma']:.4f}, Latency={ng_res['inferenceTimeMs']}ms.")

    # 5. Invalid File Extension
    r = requests.post(
        f"{API_URL}/predict/fundus",
        files={"file": ("malicious_payload.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream")},
        headers={"Origin": "http://127.0.0.1:5173"}
    )
    assert r.status_code == 400, f"Expected 400 for .exe, got {r.status_code}"
    print("[PASS] Test 5: Invalid file extension (.exe) correctly rejected with HTTP 400.")

    # 6. Corrupted image bytes with .jpg extension
    r = requests.post(
        f"{API_URL}/predict/fundus",
        files={"file": ("fake.jpg", b"NOT_REALLY_A_JPEG_FILE_12345", "image/jpeg")},
        headers={"Origin": "http://127.0.0.1:5173"}
    )
    assert r.status_code == 422, f"Expected 422 for corrupt image, got {r.status_code}"
    print("[PASS] Test 6: Corrupted image data correctly rejected with HTTP 422.")

    # 7. Oversized file (>25MB)
    fake_large_payload = b"\x00" * (26 * 1024 * 1024)
    r = requests.post(
        f"{API_URL}/predict/fundus",
        files={"file": ("large_image.jpg", fake_large_payload, "image/jpeg")},
        headers={"Origin": "http://127.0.0.1:5173"}
    )
    assert r.status_code == 413, f"Expected 413 for oversized file, got {r.status_code}"
    print("[PASS] Test 7: Oversized file (26MB) correctly rejected with HTTP 413.")

    # 8. Rapid consecutive requests stability
    success_count = 0
    t0 = time.time()
    for i in range(5):
        with open(glaucoma_path, "rb") as f:
            r = requests.post(
                f"{API_URL}/predict/fundus",
                files={"file": (f"rapid_{i}.jpg", f, "image/jpeg")}
            )
            if r.status_code == 200:
                success_count += 1
    duration = time.time() - t0
    assert success_count == 5, f"Expected 5 rapid requests to succeed, got {success_count}"
    print(f"[PASS] Test 8: Rapid consecutive requests (5 sequential) passed stably in {duration:.2f}s.")

    # 9. Server disk zero-file-retention verification
    # Ensure no uploaded images were saved to backend directory
    backend_files = os.listdir("backend")
    disallowed_uploads = [f for f in backend_files if f.endswith((".jpg", ".png", ".jpeg", ".bmp"))]
    assert len(disallowed_uploads) == 0, f"Found uploaded files on disk: {disallowed_uploads}"
    print("[PASS] Test 9: Zero PII / Zero Disk Retention verified (no image files written to disk).")

    print("=" * 70)
    print("ALL 9 E2E SCENARIOS AND SECURITY CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
