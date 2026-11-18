import asyncio
from fastapi import APIRouter, File, Response, UploadFile
from ...inference.model_loader import get_model
from ...inference.predictor import predict_image
from ...utils.image_utils import resize_image, encode_image_base64, validate_upload
from ...config.settings import settings

router = APIRouter()


@router.post("/predict")
async def predict(response: Response, file: UploadFile = File(...)):
    response.headers["X-Medical-Disclaimer"] = "Demo only - Not for clinical use"
    model = get_model()
    if model is None:
        return {"error": "Model not loaded yet", "success": False}

    contents = await file.read()
    image = validate_upload(contents, file.content_type, file.filename)
    original_size = image.size

    try:
        detections, yolo_result = await asyncio.to_thread(predict_image, model, image)
        annotated_array = yolo_result.plot()
        from PIL import Image

        annotated_image = Image.fromarray(annotated_array)
        annotated_image = resize_image(annotated_image, max_size=800)
        img_base64 = encode_image_base64(annotated_image)
        avg_confidence = (
            sum(d.confidence for d in detections) / len(detections) if detections else 0
        )
        return {
            "success": True,
            "disclaimer": "Outil de démonstration. Ne pas utiliser pour un diagnostic médical.",
            "detections": [d.to_dict() for d in detections],
            "count": len(detections),
            "image": f"data:image/png;base64,{img_base64}",
            "original_size": {"width": original_size[0], "height": original_size[1]},
            "statistics": {
                "avg_confidence": f"{avg_confidence * 100:.1f}%",
                "threshold_used": f"{settings.CONFIDENCE_THRESHOLD * 100}%",
            },
        }
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e), "count": 0, "detections": []}
