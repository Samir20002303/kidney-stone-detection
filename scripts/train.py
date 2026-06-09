from ultralytics import YOLO
import os
import time

def main():
    start_time = time.time()
    print("=" * 50)
    print("🚀 KIDNEY STONE DETECTION - CPU OPTIMIZED")
    print("=" * 50)
    
    # Vérifier les données
    data_yaml = "data/data.yaml"
    if not os.path.exists(data_yaml):
        print(f"❌ Fichier non trouvé: {data_yaml}")
        return
    
    print(f"📁 Dataset config: {data_yaml}")
    print(f"📊 Train: {len(os.listdir('data/train/images'))} images")
    print(f"📊 Valid: {len(os.listdir('data/valid/images'))} images")
    print(f"📊 Test: {len(os.listdir('data/test/images'))} images")
    
    # Modèle YOLOv8 nano
    model = YOLO('yolov8n.pt')
    
    # Entraînement RAPIDE pour CPU
    results = model.train(
        data=data_yaml,
        epochs=15,           # 15 au lieu de 50 pour test rapide
        imgsz=416,           # 416 au lieu de 640 (plus rapide)
        batch=8,             # Batch plus petit pour CPU
        device='cpu',
        patience=10,         # Stop plus tôt si pas d'amélioration
        workers=0,           # Évite les problèmes sur Windows
        project='models',
        name='kidney_stone_cpu',
        exist_ok=True,
        verbose=True
    )
    
    end_time = time.time()
    
    minutes = int((end_time - start_time) / 60)
    seconds = int((end_time - start_time) % 60)
    
    print(f"\n⏱️ Temps d'entraînement: {minutes}m {seconds}s")
    print("\n" + "=" * 50)
    print("✅ ENTRAÎNEMENT TERMINÉ !")
    print("=" * 50)
    print(f"📁 Modèle: models/kidney_stone_cpu/weights/best.pt")
    
    # Optionnel: tester le modèle
    print("\n🔍 Test du modèle sur une image...")
    test_images = os.listdir('data/test/images')
    if test_images:
        test_path = f'data/test/images/{test_images[0]}'
        results = model(test_path)
        print(f"✅ Test réussi sur: {test_images[0]}")
        if len(results[0].boxes) > 0:
            print(f"🎯 Détections: {len(results[0].boxes)} pierre(s) trouvée(s)")
        else:
            print("📷 Aucune pierre détectée sur cette image de test")
    
    # Export pour déploiement (optionnel)
    # print("\n📤 Export du modèle en format ONNX...")
    # model.export(format='onnx')
    # print("✅ Export terminé !")

if __name__ == "__main__":
    main()