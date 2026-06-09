from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
import io
import os
import base64
import colorsys
import random
import math
import numpy as np

from datetime import datetime

MODEL_PATH = r"C:\Users\ASUS\Documents\kidney-stone-detection\models\baseline\weights\best.pt"
model = None

# Seuil de confiance minimum (filtre les faux positifs)
CONFIDENCE_THRESHOLD = 0.35  # 50% - à ajuster

def get_color(index):
    """Génère des couleurs différentes pour chaque pierre"""
    hue = (index * 0.618033988749895) % 1.0
    r, g, b = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
    return (int(r * 255), int(g * 255), int(b * 255))

def get_size_category(area, width, height):
    """Catégorise la taille du calcul de façon plus précise"""
    # Conversion pixels → mm approximative (selon la résolution de l'image)
    # Une estimation basée sur la taille moyenne d'un rein (~100mm = 500px)
    size_mm = math.sqrt(area) * 0.2  # Approximation
    
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

def get_position(bbox, img_width, img_height):
    """Détermine la position précise dans le rein"""
    x1, y1, x2, y2 = bbox
    center_x = (x1 + x2) / 2 / img_width
    center_y = (y1 + y2) / 2 / img_height
    
    # Position horizontale
    if center_x < 0.33:
        h_position = "Gauche"
    elif center_x > 0.67:
        h_position = "Droite"
    else:
        h_position = "Centrale"
    
    # Position verticale
    if center_y < 0.33:
        v_position = "Pôle supérieur"
    elif center_y > 0.67:
        v_position = "Pôle inférieur"
    else:
        v_position = "Pôle moyen"
    
    return f"{h_position} - {v_position}"

def get_medical_advice(confidence, size_category, position):
    """Génère des conseils médicaux basés sur les caractéristiques"""
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





def get_risk_level(size_category, position, confidence):
    """Calcule un niveau de risque basé sur les caractéristiques"""
    risk_score = 0
    
    # Taille
    if "Très grande" in size_category or "Grande" in size_category:
        risk_score += 3
    elif "Moyenne" in size_category:
        risk_score += 2
    elif "Petite" in size_category:
        risk_score += 1
    
    # Position
    if "Pôle inférieur" in position:
        risk_score += 2  # Drainage difficile
    elif "Pôle supérieur" in position:
        risk_score += 1
    
    # Confiance (faible confiance = risque d'erreur)
    if confidence < 0.5:
        risk_score += 1
    
    if risk_score >= 4:
        return "Élevé ⚠️"
    elif risk_score >= 2:
        return "Modéré ⚠️"
    else:
        return "Faible ✓"

def get_recommendation(size_category, position, confidence):
    """Génère une recommandation personnalisée"""
    recommendations = []
    
    # Basé sur la taille
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
    
    # Basé sur la position
    if "Pôle inférieur" in position:
        recommendations.append("🔄 Drainage postural recommandé")
    
    # Basé sur la confiance
    if confidence < 0.6:
        recommendations.append("📷 Nouvelle imagerie recommandée pour confirmation")
    
    return recommendations

def get_stone_type_by_size(size_category):
    """Estimation du type de calcul basé sur la taille"""
    if "Très petite" in size_category or "Petite" in size_category:
        return "Calculs de petite taille (souvent oxalate de calcium)"
    elif "Moyenne" in size_category:
        return "Calculs de taille moyenne (oxalate ou phosphate)"
    else:
        return "Calculs volumineux (risque de staghorn)"

def get_follow_up_timing(size_category):
    """Temps recommandé avant le prochain contrôle"""
    if "Très petite" in size_category:
        return "6 mois"
    elif "Petite" in size_category:
        return "3 mois"
    elif "Moyenne" in size_category:
        return "1-2 mois"
    else:
        return "Immédiat / Urgent"

def get_estimated_passing_time(size_category):
    """Estimation du temps pour évacuer naturellement"""
    if "Très petite" in size_category:
        return "Quelques jours à 2 semaines"
    elif "Petite" in size_category:
        return "2-4 semaines"
    elif "Moyenne" in size_category:
        return "Peu probable sans traitement"
    else:
        return "Évacuation naturelle impossible"

def get_density_description(area):
    """Description de la densité du calcul (estimation)"""
    density = area / 100  # Approximation
    if density < 1:
        return "Faible densité"
    elif density < 2:
        return "Densité moyenne"
    else:
        return "Haute densité"

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("=" * 50)
    print("🩺 KIDNEY STONE DETECTION API")
    print("=" * 50)
    print("🚀 Chargement du modèle...")
    
    if os.path.exists(MODEL_PATH):
        model = YOLO(MODEL_PATH)
        print(f"✅ Modèle chargé: {MODEL_PATH}")
        
        # Afficher les infos du modèle
        if hasattr(model, 'model'):
            print(f"📊 Classes: {model.model.names if hasattr(model.model, 'names') else 'kidney_stone'}")
    else:
        print(f"⚠️ Modèle non trouvé: {MODEL_PATH}")
        print("📁 Utilisez le script d'entraînement pour générer le modèle")
    
    print(f"🎯 Seuil de confiance: {CONFIDENCE_THRESHOLD * 100}%")
    print("=" * 50)
    yield
    print("👋 Fermeture de l'API")

app = FastAPI(title="Kidney Stone Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Kidney Stone Detection API",
        "status": "ready",
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "model_loaded": model is not None
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        return {"error": "Model not loaded yet", "success": False}
    
    try:
        # Lire l'image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        original_size = image.size
        
        # Prédiction avec seuil de confiance
        results = model(image, conf=CONFIDENCE_THRESHOLD)
        
        # Extraire les détections
        detections = []
        if len(results[0].boxes) > 0:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                bbox = boxes.xyxy[i].tolist()
                confidence = float(boxes.conf[i])
                
                # Calculer les dimensions
                x1, y1, x2, y2 = bbox
                width = int(x2 - x1)
                height = int(y2 - y1)
                area = width * height
                
                # Calculer le diamètre estimé (en supposant une forme circulaire)
                diameter = math.sqrt(area / math.pi)
                
                # Catégories
                size_category = get_size_category(area, width, height)
                position = get_position(bbox, original_size[0], original_size[1])
                
                # Conseils médicaux
                medical_advice = get_medical_advice(confidence, size_category, position)

                risk_level = get_risk_level(size_category, position, confidence)
                recommendations = get_recommendation(size_category, position, confidence)
                stone_type = get_stone_type_by_size(size_category)
                follow_up = get_follow_up_timing(size_category)
                passing_time = get_estimated_passing_time(size_category)
                density_desc = get_density_description(area)
                
                detection = {
                    "id": i,
                    "bbox": bbox,
                    "confidence": confidence,
                    "confidence_percent": f"{confidence * 100:.1f}%",
                    "confidence_level": "Élevée" if confidence > 0.7 else "Moyenne" if confidence > 0.5 else "Faible",
                    "width": width,
                    "height": height,
                    "area": area,
                    "diameter_estimate_mm": round(diameter * 0.2, 1),  # Approximation
                    "size_category": size_category,
                    "position": position,
                    "position_simple": "Périphérique" if "Périphérique" in position or "Centrale" in position else position,
                    "color": get_color(i),
                    "risk_level": risk_level,
                    "recommendations": recommendations,
                    "stone_type": stone_type,
                    "follow_up_timing": follow_up,
                    "estimated_passing_time": passing_time,
                    "density_description": density_desc,
                    "analysis_date": datetime.now().strftime("%d/%m/%Y %H:%M"),
                    "stone_id_formatted": f"KSN-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}",
                    "medical_advice": medical_advice
                }
                detections.append(detection)


        
        # Trier par confiance décroissante
        detections.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Re-numéroter après tri
        for i, det in enumerate(detections):
            det['id'] = i
            # Mettre à jour la couleur après renumérotation
            det['color'] = get_color(i)
        
        # Générer l'image annotée avec YOLO
        annotated_image = results[0].plot()
        annotated_image_pil = Image.fromarray(annotated_image)
        
        # Redimensionner pour l'affichage (max 800px)
        max_size = 800
        if max(annotated_image_pil.size) > max_size:
            ratio = max_size / max(annotated_image_pil.size)
            new_size = (int(annotated_image_pil.size[0] * ratio), 
                       int(annotated_image_pil.size[1] * ratio))
            annotated_image_pil = annotated_image_pil.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convertir en base64
        buffered = io.BytesIO()
        annotated_image_pil.save(buffered, format="PNG", optimize=True)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Statistiques
        avg_confidence = sum(d['confidence'] for d in detections) / len(detections) if detections else 0
        
        return {
            "success": True,
            "detections": detections,
            "count": len(detections),
            "image": f"data:image/png;base64,{img_base64}",
            "original_size": {"width": original_size[0], "height": original_size[1]},
            "statistics": {
                "avg_confidence": f"{avg_confidence * 100:.1f}%",
                "threshold_used": f"{CONFIDENCE_THRESHOLD * 100}%"
            }
        }
        
    except Exception as e:
        print(f"Erreur: {e}")
        return {
            "success": False,
            "error": str(e),
            "count": 0,
            "detections": []
        }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "confidence_threshold": CONFIDENCE_THRESHOLD
    }

@app.get("/config")
def get_config():
    """Retourne la configuration actuelle"""
    return {
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "model_path": MODEL_PATH,
        "model_loaded": model is not None
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Démarrage du serveur API...")
    print("📍 http://localhost:8000")
    print("📋 Documentation: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")