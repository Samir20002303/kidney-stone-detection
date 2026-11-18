import math
from PIL import Image
from ultralytics import YOLO
from ..domain.detection import Detection
from ..domain.medical_rules import (
    get_size_category, get_position, get_medical_advice,
    get_risk_level, get_recommendation, get_stone_type_by_size,
    get_follow_up_timing, get_estimated_passing_time, get_density_description,
    get_color
)
from ..config.settings import settings

def predict_image(model: YOLO, image: Image.Image):
    original_size = image.size
    results = model(image, conf=settings.CONFIDENCE_THRESHOLD, device=settings.DEVICE)
    detections = []
    if len(results[0].boxes) > 0:
        boxes = results[0].boxes
        for i in range(len(boxes)):
            bbox = boxes.xyxy[i].tolist()
            confidence = float(boxes.conf[i])
            x1, y1, x2, y2 = bbox
            width = int(x2 - x1)
            height = int(y2 - y1)
            area = width * height
            diameter = math.sqrt(area / math.pi)
            size_category = get_size_category(area, width, height)
            position = get_position(bbox, original_size[0], original_size[1])
            medical_advice = get_medical_advice(confidence, size_category, position)
            risk_level = get_risk_level(size_category, position, confidence)
            recommendations = get_recommendation(size_category, position, confidence)
            stone_type = get_stone_type_by_size(size_category)
            follow_up = get_follow_up_timing(size_category)
            passing_time = get_estimated_passing_time(size_category)
            density_desc = get_density_description(area)
            detection = Detection(
                id=i,
                bbox=bbox,
                confidence=confidence,
                width=width,
                height=height,
                area=area,
                diameter_estimate_mm=round(diameter * 0.2, 1),
                size_category=size_category,
                position=position,
                color=get_color(i),
                risk_level=risk_level,
                recommendations=recommendations,
                stone_type=stone_type,
                follow_up_timing=follow_up,
                estimated_passing_time=passing_time,
                density_description=density_desc,
                medical_advice=medical_advice,
            )
            detections.append(detection)
    # Trier par confiance
    detections.sort(key=lambda x: x.confidence, reverse=True)
    for idx, det in enumerate(detections):
        det.id = idx
        det.color = get_color(idx)
        det.stone_id_formatted = f"KSN-{det.analysis_date.split()[0].replace('/', '')}-{idx+1:03d}"
    return detections, results[0]
