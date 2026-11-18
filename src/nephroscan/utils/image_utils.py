import io
import base64
from PIL import Image, UnidentifiedImageError
from fastapi import HTTPException
from ..config.settings import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "application/octet-stream",
}

def validate_upload(contents: bytes, content_type=None, filename=None) -> Image.Image:
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    if not contents:
        raise HTTPException(status_code=400, detail="Fichier vide.")
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image trop volumineuse (max {settings.MAX_IMAGE_SIZE_MB} MB).",
        )
    if content_type and content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Format non supporté. Utilisez PNG, JPG ou JPEG.")
    Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except UnidentifiedImageError:
        raise HTTPException(status_code=415, detail="Fichier image invalide.")
    except Image.DecompressionBombError:
        raise HTTPException(status_code=413, detail="Image trop grande (protection decompression bomb).")
    if min(image.size) < 16:
        raise HTTPException(status_code=400, detail="Résolution trop faible (minimum 16x16).")
    return image.convert("RGB")

def resize_image(image: Image.Image, max_size: int = 800) -> Image.Image:
    if max(image.size) > max_size:
        ratio = max_size / max(image.size)
        new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
        return image.resize(new_size, Image.Resampling.LANCZOS)
    return image

def encode_image_base64(image: Image.Image, format: str = "PNG") -> str:
    buffered = io.BytesIO()
    image.save(buffered, format=format, optimize=True)
    return base64.b64encode(buffered.getvalue()).decode()
