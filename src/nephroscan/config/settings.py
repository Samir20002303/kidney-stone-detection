import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(encoding="utf-8-sig")
except ImportError:
    pass

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings:
    MODEL_PATH: str = os.getenv(
        "MODEL_PATH",
        str(PROJECT_ROOT / "models" / "production" / "best.pt"),
    )
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))
    DEVICE: str = os.getenv("DEVICE", "cpu")
    MAX_IMAGE_SIZE_MB: int = int(os.getenv("MAX_IMAGE_SIZE_MB", "10"))
    MAX_IMAGE_PIXELS: int = int(os.getenv("MAX_IMAGE_PIXELS", "25000000"))
    ENABLE_MEDICAL_ADVICE: bool = os.getenv("ENABLE_MEDICAL_ADVICE", "true").lower() == "true"
    FRONTEND_DIR: Path = PROJECT_ROOT / "frontend"


settings = Settings()
