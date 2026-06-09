from ultralytics import YOLO
import os
import cv2

def test_model():
    # Chemin du modèle entraîné
    model_path = "models/kidney_stone_cpu/weights/best.pt"
    
    if not os.path.exists(model_path):
        print(f"❌ Modèle non trouvé: {model_path}")
        print("👉 L'entraînement n'est pas encore terminé")
        return
    
    print(f"✅ Chargement du modèle: {model_path}")
    model = YOLO(model_path)
    
    # Tester sur les images de test
    test_dir = "data/test/images"
    if os.path.exists(test_dir):
        images = os.listdir(test_dir)[:5]  # 5 premières images
        print(f"\n🔍 Test sur {len(images)} images...")
        
        for img_name in images:
            img_path = os.path.join(test_dir, img_name)
            results = model(img_path)
            
            # Afficher les détections
            if len(results[0].boxes) > 0:
                print(f"  ✅ {img_name}: {len(results[0].boxes)} pierre(s)")
            else:
                print(f"  ❌ {img_name}: Aucune détection")
    else:
        print("⚠️ Dossier de test non trouvé")

if __name__ == "__main__":
    test_model()