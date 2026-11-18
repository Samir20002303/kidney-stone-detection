from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from ..inference.model_loader import load_model
from ..config.settings import settings
from .routes import predict_router, health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print("🩺 NEPHROSCAN AI — Kidney Stone Detection")
    print("=" * 50)
    load_model()
    print(f"🎯 Seuil de confiance: {settings.CONFIDENCE_THRESHOLD * 100}%")
    print("=" * 50)
    yield
    print("👋 Fermeture de l'API")


def create_app() -> FastAPI:
    app = FastAPI(
        title="NephroScan AI",
        description="Démo de détection de calculs rénaux (YOLOv8). Non destiné à un usage clinique.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(predict_router, tags=["Prediction"])
    app.include_router(health_router, tags=["Health"])

    frontend_dir = Path(settings.FRONTEND_DIR)
    if frontend_dir.is_dir():
        app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    return app


app = create_app()
