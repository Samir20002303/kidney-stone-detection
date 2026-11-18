import colorsys
import math
from typing import List, Tuple

def get_color(index: int) -> Tuple[int, int, int]:
    hue = (index * 0.618033988749895) % 1.0
    r, g, b = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
    return (int(r * 255), int(g * 255), int(b * 255))

def get_size_category(area: int, width: int, height: int) -> str:
    size_mm = math.sqrt(area) * 0.2
    if size_mm < 3:
        return "Très petite (<3mm)"
    elif size_mm < 5:
        return "Petite (3-5mm)"
    elif size_mm < 10:
        return "Moyenne (5-10mm)"
    elif size_mm < 15:
        return "Grande (10-15mm)"
    else:
        return "Très grande (>15mm)"

def get_position(bbox: List[float], img_width: int, img_height: int) -> str:
    x1, y1, x2, y2 = bbox
    center_x = (x1 + x2) / 2 / img_width
    center_y = (y1 + y2) / 2 / img_height
    if center_x < 0.33:
        h_position = "Gauche"
    elif center_x > 0.67:
        h_position = "Droite"
    else:
        h_position = "Centrale"
    if center_y < 0.33:
        v_position = "Pôle supérieur"
    elif center_y > 0.67:
        v_position = "Pôle inférieur"
    else:
        v_position = "Pôle moyen"
    return f"{h_position} - {v_position}"

def get_medical_advice(confidence: float, size_category: str, position: str) -> List[str]:
    advices = []
    if confidence < 0.5:
        advices.append("⚠️ Confiance faible - Vérification manuelle recommandée")
    if "Très petite" in size_category or "Petite" in size_category:
        advices.append("💧 Petits calculs : Hydratation abondante recommandée")
    elif "Moyenne" in size_category:
        advices.append("🏥 Calcul de taille moyenne : Consultation urologique conseillée")
    elif "Grande" in size_category or "Très grande" in size_category:
        advices.append("⚠️ Calcul volumineux : Traitement médical nécessaire")
    if "Pôle inférieur" in position:
        advices.append("📍 Position basse : Drainage naturel difficile")
    return advices

def get_risk_level(size_category: str, position: str, confidence: float) -> str:
    risk_score = 0
    if "Très grande" in size_category or "Grande" in size_category:
        risk_score += 3
    elif "Moyenne" in size_category:
        risk_score += 2
    elif "Petite" in size_category:
        risk_score += 1
    if "Pôle inférieur" in position:
        risk_score += 2
    elif "Pôle supérieur" in position:
        risk_score += 1
    if confidence < 0.5:
        risk_score += 1
    if risk_score >= 4:
        return "Élevé ⚠️"
    elif risk_score >= 2:
        return "Modéré ⚠️"
    else:
        return "Faible ✓"

def get_recommendation(size_category: str, position: str, confidence: float) -> List[str]:
    recommendations = []
    if "Très petite" in size_category:
        recommendations.append("💧 Hydratation abondante (2-3L/jour)")
        recommendations.append("🏃 Activité physique modérée")
    elif "Petite" in size_category:
        recommendations.append("💧 Hydratation ++ (2.5-3L/jour)")
        recommendations.append("🩺 Contrôle dans 3 mois")
    elif "Moyenne" in size_category:
        recommendations.append("🏥 Consultation urologique")
        recommendations.append("🔬 Analyse sanguine et urinaire")
    elif "Grande" in size_category or "Très grande" in size_category:
        recommendations.append("⚠️ Traitement médical nécessaire")
        recommendations.append("🏥 Consultation urgente")
    if "Pôle inférieur" in position:
        recommendations.append("🔄 Drainage postural recommandé")
    if confidence < 0.6:
        recommendations.append("📷 Nouvelle imagerie recommandée pour confirmation")
    return recommendations

def get_stone_type_by_size(size_category: str) -> str:
    if "Très petite" in size_category or "Petite" in size_category:
        return "Calculs de petite taille (souvent oxalate de calcium)"
    elif "Moyenne" in size_category:
        return "Calculs de taille moyenne (oxalate ou phosphate)"
    else:
        return "Calculs volumineux (risque de staghorn)"

def get_follow_up_timing(size_category: str) -> str:
    if "Très petite" in size_category:
        return "6 mois"
    elif "Petite" in size_category:
        return "3 mois"
    elif "Moyenne" in size_category:
        return "1-2 mois"
    else:
        return "Immédiat / Urgent"

def get_estimated_passing_time(size_category: str) -> str:
    if "Très petite" in size_category:
        return "Quelques jours à 2 semaines"
    elif "Petite" in size_category:
        return "2-4 semaines"
    elif "Moyenne" in size_category:
        return "Peu probable sans traitement"
    else:
        return "Évacuation naturelle impossible"

def get_density_description(area: int) -> str:
    density = area / 100
    if density < 1:
        return "Faible densité"
    elif density < 2:
        return "Densité moyenne"
    else:
        return "Haute densité"
