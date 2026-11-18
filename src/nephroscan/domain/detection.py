from typing import List, Tuple
from datetime import datetime

class Detection:
    def __init__(self, id: int, bbox: List[float], confidence: float, width: int, height: int, area: int,
                 diameter_estimate_mm: float, size_category: str, position: str, color: Tuple[int, int, int],
                 risk_level: str, recommendations: List[str], stone_type: str, follow_up_timing: str,
                 estimated_passing_time: str, density_description: str, medical_advice: List[str]):
        self.id = id
        self.bbox = bbox
        self.confidence = confidence
        self.confidence_percent = f"{confidence * 100:.1f}%"
        self.confidence_level = "Élevée" if confidence > 0.7 else "Moyenne" if confidence > 0.5 else "Faible"
        self.width = width
        self.height = height
        self.area = area
        self.diameter_estimate_mm = diameter_estimate_mm
        self.size_category = size_category
        self.position = position
        self.position_simple = "Périphérique" if "Périphérique" in position or "Centrale" in position else position
        self.color = color
        self.risk_level = risk_level
        self.recommendations = recommendations
        self.stone_type = stone_type
        self.follow_up_timing = follow_up_timing
        self.estimated_passing_time = estimated_passing_time
        self.density_description = density_description
        self.analysis_date = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.stone_id_formatted = f"KSN-{datetime.now().strftime('%Y%m%d')}-{id+1:03d}"
        self.medical_advice = medical_advice

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "bbox": self.bbox,
            "confidence": self.confidence,
            "confidence_percent": self.confidence_percent,
            "confidence_level": self.confidence_level,
            "width": self.width,
            "height": self.height,
            "area": self.area,
            "diameter_estimate_mm": self.diameter_estimate_mm,
            "size_category": self.size_category,
            "position": self.position,
            "position_simple": self.position_simple,
            "color": self.color,
            "risk_level": self.risk_level,
            "recommendations": self.recommendations,
            "stone_type": self.stone_type,
            "follow_up_timing": self.follow_up_timing,
            "estimated_passing_time": self.estimated_passing_time,
            "density_description": self.density_description,
            "analysis_date": self.analysis_date,
            "stone_id_formatted": self.stone_id_formatted,
            "medical_advice": self.medical_advice,
        }
