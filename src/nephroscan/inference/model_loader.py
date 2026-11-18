import os
import numpy as np
from ultralytics import YOLO
from ..config.settings import settings

_model = None


def get_model():
    return _model


def load_model():
    global _model
    model_path = settings.MODEL_PATH
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Modèle introuvable: {model_path}. "
            "Placez best.pt dans models/production/ ou définissez MODEL_PATH."
        )
    _model = YOLO(model_path)
    print(f"✅ Modèle chargé: {model_path}")
    names = getattr(getattr(_model, "model", None), "names", None)
    if names:
        print(f"📊 Classes: {names}")
    dummy = np.zeros((416, 416, 3), dtype=np.uint8)
    _model.predict(dummy, imgsz=416, verbose=False, device=settings.DEVICE)
    print("🔥 Warm-up inférence terminé")
    return _model
