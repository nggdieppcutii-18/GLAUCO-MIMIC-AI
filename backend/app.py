"""
GLAUCO-MIMIC AI - FastAPI Backend Inference Service
===================================================
Provides endpoints for:
1. Healthcheck & Model Verification (/api/v1/health)
2. Single Fundus Image Inference (/api/v1/predict/fundus)
3. Multimodal Case Submission (/api/v1/cases/analyze)

Security & Ethics Compliance:
- File validation: format (JPEG/PNG/WebP/BMP), size limit (max 25MB).
- Privacy Protection: Zero patient PII logging.
- Softmax Scores: Clarified as model softmax outputs, NOT clinical diagnosis probabilities.
- Model State: 'INFERENCE_READY' (not clinical verification).
- Access Control: Bound to localhost (127.0.0.1) for local research sandbox with rate limiting.
- 5-Class Notice: Binary ResNet-18 baseline only; 5-class multi-disease architecture remains pending.
"""

import io
import os
import sys
import time
import logging
from collections import defaultdict
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.model import get_engine, GlaucomaInferenceEngine

# Configure logger (Strictly Zero PII)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [InferenceAPI] %(message)s"
)
logger = logging.getLogger("glauco_api")

app = FastAPI(
    title="GLAUCO-MIMIC AI Inference API",
    description="Research & Academic AI Inference Backend for Glaucoma vs Non-Glaucoma Fundus Classification",
    version="1.0.0"
)

# Read CORS origins from environment variable or use safe local defaults
raw_cors = os.getenv(
    "CORS_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3000,http://localhost:3000"
)
ALLOWED_ORIGINS = [orig.strip() for orig in raw_cors.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Allowed image extensions and max size
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALLOWED_MIMETYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

# Simple In-Memory Rate Limiter for Demo Protection (Max 60 requests/minute per client IP)
RATE_LIMIT_REQUESTS = 60
RATE_LIMIT_WINDOW_SECONDS = 60
_request_records = defaultdict(list)


@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    # Only rate limit prediction endpoints
    if request.url.path.startswith("/api/v1/predict"):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        
        # Clean timestamps older than window
        _request_records[client_ip] = [
            ts for ts in _request_records[client_ip] if now - ts < RATE_LIMIT_WINDOW_SECONDS
        ]
        
        if len(_request_records[client_ip]) >= RATE_LIMIT_REQUESTS:
            logger.warning(f"Rate limit exceeded for client: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "status": "ERROR",
                    "detail": "Tần suất yêu cầu quá cao. Vui lòng đợi 1 phút trước khi tiếp tục suy luận."
                }
            )
            
        _request_records[client_ip].append(now)

    response = await call_next(request)
    return response


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing GLAUCO-MIMIC AI Inference Engine...")
    try:
        engine = get_engine()
        logger.info(f"Engine ready with model from: {engine.checkpoint_path}")
        logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")
    except Exception as e:
        logger.error(f"Failed to initialize inference engine: {e}")


@app.get("/")
async def root():
    return {
        "service": "GLAUCO-MIMIC AI Backend API",
        "status": "online",
        "engineState": "INFERENCE_READY",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


@app.get("/api/v1/health")
@app.get("/health")
async def health_check():
    """
    Returns the operational status of the inference backend and loaded model info.
    State is 'INFERENCE_READY' (strictly avoiding any claim of clinical verification).
    """
    try:
        engine = get_engine()
        return {
            "status": "ok",
            "connected": True,
            "modelVerified": True,  # Keep boolean for backwards compatibility
            "engineState": "INFERENCE_READY",
            "apiVersion": "v1.0.0-resnet18",
            "modelName": "ResNet-18 Glaucoma Screening Baseline",
            "modality": "fundus",
            "targetClasses": engine.classes,
            "checkpointPath": os.path.basename(engine.checkpoint_path),
            "disclaimer": engine.CLINICAL_DISCLAIMER,
            "fiveClassNotice": engine.FIVE_CLASS_SCAFFOLD_NOTICE,
            "message": "Kết nối thành công. Mô hình ResNet-18 Baseline đã nạp và sẵn sàng suy luận (INFERENCE_READY)."
        }
    except Exception as e:
        logger.error(f"Healthcheck error: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "connected": True,
                "modelVerified": False,
                "engineState": "AWAITING_MODEL_WEIGHTS",
                "apiVersion": "v1.0.0-resnet18",
                "message": f"Mô hình chưa sẵn sàng: {str(e)}"
            }
        )


@app.post("/api/v1/predict/fundus")
async def predict_fundus(file: UploadFile = File(...)):
    """
    Inference endpoint for a single Fundus photograph.
    Accepts: JPG, JPEG, PNG, WebP, BMP (max 25MB).
    Returns: Glaucoma / Non-Glaucoma softmax scores, predicted class, and Grad-CAM visualization.
    """
    # 1. Validate file extension
    filename = file.filename or "unknown.jpg"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng tệp không được hỗ trợ ({ext}). Vui lòng tải lên định dạng JPG, PNG, WebP hoặc BMP."
        )

    # 2. Read and validate file size
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp rỗng (0 bytes). Vui lòng chọn tệp ảnh hợp lệ."
        )
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng tệp ({len(contents) / (1024*1024):.1f}MB) vượt quá giới hạn cho phép (25MB)."
        )

    # 3. Execute inference with strict privacy protection (no PII in logs)
    logger.info(f"Executing fundus inference (payload: {len(contents)} bytes, ext: {ext})")
    try:
        engine = get_engine()
        result = engine.predict_fundus(contents, filename=filename)
        return result
    except ValueError as ve:
        logger.warning(f"Validation error during processing: {ve}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Không thể xử lý hình ảnh: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Inference execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi trong quá trình suy luận mô hình AI: {str(e)}"
        )


@app.post("/api/v1/cases/analyze")
async def analyze_multimodal_case(
    metadata: str = Form(...),
    file_fundus: Optional[UploadFile] = File(None),
    file_oct_rnfl: Optional[UploadFile] = File(None),
    file_oct_gcc: Optional[UploadFile] = File(None),
    file_visual_field: Optional[UploadFile] = File(None)
):
    """
    Multimodal clinical case analysis endpoint.
    If fundus file is provided, executes loaded ResNet-18 fundus screening.
    Other modalities (OCT, Visual Field) are acknowledged, and 5-class disease
    differential diagnosis is marked as awaiting multi-center validated training.
    """
    engine = get_engine()
    fundus_result = None

    if file_fundus is not None:
        filename = file_fundus.filename or "fundus.jpg"
        ext = os.path.splitext(filename)[1].lower()
        if ext in ALLOWED_EXTENSIONS:
            contents = await file_fundus.read()
            if 0 < len(contents) <= MAX_FILE_SIZE_BYTES:
                try:
                    fundus_result = engine.predict_fundus(contents, filename=filename)
                except Exception as e:
                    logger.warning(f"Fundus inference within case failed: {e}")

    return {
        "status": "COMPLETED" if fundus_result else "PENDING_FUNDUS",
        "fundusAnalysis": fundus_result,
        "otherModalitiesStatus": {
            "oct_rnfl": "AWAITING_VERIFIED_MODEL" if file_oct_rnfl else "NOT_PROVIDED",
            "oct_gcc": "AWAITING_VERIFIED_MODEL" if file_oct_gcc else "NOT_PROVIDED",
            "visual_field": "AWAITING_VERIFIED_MODEL" if file_visual_field else "NOT_PROVIDED"
        },
        "fiveClassDifferential": {
            "status": "SCAFFOLD_ONLY_UNVERIFIED",
            "notice": engine.FIVE_CLASS_SCAFFOLD_NOTICE
        },
        "disclaimer": engine.CLINICAL_DISCLAIMER
    }
