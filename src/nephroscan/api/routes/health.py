from fastapi import APIRouter
from ...inference.model_loader import get_model
from ...config.settings import settings

router = APIRouter()


@router.get("/health")
def health():
    model = get_model()
    return {
        "status": "healthy" if model is not None else "degraded",
        "model_loaded": model is not None,
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
    }


@router.get("/config")
def get_config():
    return {
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "model_path": settings.MODEL_PATH,
        "model_loaded": get_model() is not None,
        "disclaimer": "Demo only — not for clinical use",
    }
