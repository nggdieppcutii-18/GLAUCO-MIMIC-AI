
import os
import time
import logging
import threading

from collections import defaultdict
from pathlib import Path
from typing import Optional

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    Form,
    HTTPException,
    Request,
    status
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from backend.v4_engine import PVTv2V4Engine


# =====================================================
# CONFIGURATION
# =====================================================

APP_VERSION = "2.0.0-v4"

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".bmp"
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

RATE_LIMIT_REQUESTS = 60
RATE_LIMIT_WINDOW = 60

raw_cors = os.getenv(
    "CORS_ORIGINS",
    "http://127.0.0.1:5173,"
    "http://localhost:5173,"
    "http://127.0.0.1:3000,"
    "http://localhost:3000"
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in raw_cors.split(",")
    if origin.strip()
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [GLAUCO-V4] %(message)s"
)

logger = logging.getLogger("glauco_v4")

engine: Optional[PVTv2V4Engine] = None

# Prevent concurrent CPU inference requests.
INFERENCE_SEMAPHORE = threading.Semaphore(1)

request_records = defaultdict(list)


# =====================================================
# FASTAPI APPLICATION
# =====================================================

app = FastAPI(
    title="GLAUCO-MIMIC AI - PVTv2-B2 V4",
    description=(
        "Experimental binary Glaucoma vs Normal "
        "research inference API."
    ),
    version=APP_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)


# =====================================================
# RATE LIMITING
# =====================================================

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):

    if request.url.path.startswith("/api/v1/predict"):
        client_ip = (
            request.client.host
            if request.client
            else "127.0.0.1"
        )

        now = time.time()

        request_records[client_ip] = [
            t for t in request_records[client_ip]
            if now - t < RATE_LIMIT_WINDOW
        ]

        if len(request_records[client_ip]) >= RATE_LIMIT_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={
                    "status": "ERROR",
                    "detail": "Too many inference requests."
                }
            )

        request_records[client_ip].append(now)

    return await call_next(request)


# =====================================================
# STARTUP
# =====================================================

@app.on_event("startup")
async def startup_event():

    global engine

    logger.info("Starting GLAUCO-MIMIC V4...")

    try:
        # Load all five models once.
        engine = PVTv2V4Engine()

        if len(engine.models) != 5:
            raise RuntimeError(
                "V4 requires exactly five checkpoints."
            )

        logger.info(
            "V4 READY | Architecture=PVTv2-B2 | Folds=5"
        )

    except Exception:
        engine = None
        logger.exception("V4 initialization failed.")


@app.on_event("shutdown")
async def shutdown_event():

    global engine

    if engine is not None:
        engine.models.clear()
        engine = None

    logger.info("V4 engine shutdown complete.")


# =====================================================
# HELPERS
# =====================================================

def get_engine():

    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="V4 model is not ready."
        )

    return engine


async def read_valid_image(file: UploadFile):

    filename = file.filename or "fundus.jpg"

    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format."
        )

    contents = await file.read(
        MAX_FILE_SIZE_BYTES + 1
    )

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Empty image file."
        )

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds 25 MB."
        )

    return contents, filename


def run_v4_inference(contents, filename):

    current_engine = get_engine()

    with INFERENCE_SEMAPHORE:
        return current_engine.predict_fundus(
            contents,
            filename=filename
        )


# =====================================================
# ROOT
# =====================================================

@app.get("/")
async def root():

    return {
        "service": "GLAUCO-MIMIC AI",
        "version": APP_VERSION,
        "architecture": "PVTv2-B2",
        "ensembleSize": 5,
        "health": "/api/v1/health",
        "docs": "/docs"
    }


# =====================================================
# HEALTHCHECK
# =====================================================

@app.get("/health")
@app.get("/api/v1/health")
async def health_check():

    if engine is None:

        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "connected": True,
                "modelVerified": False,
                "engineState": "AWAITING_MODEL_WEIGHTS",
                "apiVersion": APP_VERSION,
                "message": "PVTv2-B2 V4 is not ready."
            }
        )

    info = engine.health()

    return {
        "status": "ok",
        "connected": True,

        # Technical checkpoint verification only.
        # NOT clinical validation.
        "modelVerified": True,

        "engineState": "INFERENCE_READY",
        "apiVersion": APP_VERSION,

        "modelName": info["modelName"],
        "architecture": info["architecture"],
        "ensembleSize": info["ensembleSize"],
        "threshold": info["threshold"],
        "device": info["device"],

        "targetClasses": [
            "Non-Glaucoma",
            "Glaucoma"
        ],

        "clinicalValidation": "NOT_ESTABLISHED",

        "disclaimer": (
            "Experimental research model only. "
            "Not a clinical diagnostic device."
        ),

        "message": (
            "PVTv2-B2 V4 ensemble loaded successfully. "
            "Five checkpoints passed technical verification."
        ),

        "checkpoints": info["checkpoints"]
    }


# =====================================================
# FUNDUS INFERENCE
# =====================================================

@app.post("/api/v1/predict/fundus")
async def predict_fundus(file: UploadFile = File(...)):

    contents, filename = await read_valid_image(file)

    try:

        result = await run_in_threadpool(
            run_v4_inference,
            contents,
            filename
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=422,
            detail=str(exc)
        )

    except Exception:

        logger.exception("V4 fundus inference failed.")

        raise HTTPException(
            status_code=500,
            detail="V4 inference failed. Check backend logs."
        )


# =====================================================
# MULTIMODAL CASE ENDPOINT
# =====================================================

@app.post("/api/v1/cases/analyze")
async def analyze_multimodal_case(
    metadata: str = Form(...),
    file_fundus: Optional[UploadFile] = File(None),
    file_oct_rnfl: Optional[UploadFile] = File(None),
    file_oct_gcc: Optional[UploadFile] = File(None),
    file_visual_field: Optional[UploadFile] = File(None)
):

    fundus_result = None

    if file_fundus is not None:

        contents, filename = await read_valid_image(
            file_fundus
        )

        try:

            fundus_result = await run_in_threadpool(
                run_v4_inference,
                contents,
                filename
            )

        except Exception:

            logger.exception(
                "V4 multimodal fundus inference failed."
            )

            raise HTTPException(
                status_code=500,
                detail="Fundus inference failed."
            )

    return {

        "status": (
            "COMPLETED"
            if fundus_result
            else "PENDING_FUNDUS"
        ),

        "fundusAnalysis": fundus_result,

        "otherModalitiesStatus": {

            "oct_rnfl": (
                "AWAITING_VERIFIED_MODEL"
                if file_oct_rnfl
                else "NOT_PROVIDED"
            ),

            "oct_gcc": (
                "AWAITING_VERIFIED_MODEL"
                if file_oct_gcc
                else "NOT_PROVIDED"
            ),

            "visual_field": (
                "AWAITING_VERIFIED_MODEL"
                if file_visual_field
                else "NOT_PROVIDED"
            )
        },

        "fiveClassDifferential": {

            "status": "SCAFFOLD_ONLY_UNVERIFIED",

            "notice": (
                "The current PVTv2-B2 V4 model performs "
                "binary Glaucoma vs Normal classification only. "
                "It does not perform five-class diagnosis."
            )
        },

        "disclaimer": (
            "Experimental research only. "
            "Not a substitute for ophthalmologist diagnosis."
        )
    }
