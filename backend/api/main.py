"""
FastAPI application entry point for the Loan Approval Prediction System.

Startup: trains the ML pipeline and stores the TrainedModel in app.state.model.
CORS origins are configurable via the ALLOWED_ORIGINS env var (JSON array string).
CSV path is configurable via the CSV_PATH env var (defaults to ../loan_dataset.csv
relative to the backend directory).
"""

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ml.pipeline import train
from api.routers import health, model_info, predict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_BACKEND_DIR = Path(__file__).resolve().parent.parent  # backend/

_DEFAULT_CSV_PATH = str(_BACKEND_DIR.parent / "loan_dataset.csv")
CSV_PATH: str = os.environ.get("CSV_PATH", _DEFAULT_CSV_PATH)

_raw_origins = os.environ.get("ALLOWED_ORIGINS", '["http://localhost:5173"]')
try:
    ALLOWED_ORIGINS: list[str] = json.loads(_raw_origins)
except json.JSONDecodeError:
    ALLOWED_ORIGINS = ["http://localhost:5173"]

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Train the model on startup and clean up on shutdown."""
    app.state.model = None
    try:
        logger.info("Training model from %s …", CSV_PATH)
        app.state.model = train(CSV_PATH)
        logger.info("Model ready (accuracy=%.4f)", app.state.model.accuracy)
    except Exception:
        logger.exception("Failed to train model — startup aborted")
        raise
    yield
    # Nothing to clean up for an in-memory model
    app.state.model = None


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Loan Approval Prediction API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 503 guard middleware
# ---------------------------------------------------------------------------


@app.middleware("http")
async def model_ready_guard(request: Request, call_next):
    """Return 503 for prediction/model-info routes when the model is not loaded."""
    guarded_prefixes = ("/predict", "/model-info")
    if any(request.url.path.startswith(p) for p in guarded_prefixes):
        if getattr(request.app.state, "model", None) is None:
            return JSONResponse(status_code=503, content={"detail": "Model not ready"})
    return await call_next(request)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(predict.router)
app.include_router(health.router)
app.include_router(model_info.router)
