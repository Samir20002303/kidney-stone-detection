---
title: NephroScan AI
emoji: 🩺
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# NephroScan AI — Kidney Stone Detection

Démo d'un pipeline de **computer vision** : détection de calculs rénaux sur images médicales avec **YOLOv8n** (Ultralytics) et une API **FastAPI**.

> Outil de démonstration technique. **Pas un dispositif médical.** Les tailles en mm, le type de calcul et les recommandations sont des heuristiques, pas un diagnostic.

## Tester la démo

1. Ouvrez l'application.
2. Téléchargez une image d'exemple (`Image test 1` / `Image test 2`) ou importez un PNG/JPG.
3. Cliquez sur **Lancer l'analyse**.

Health check : [`/health`](/health)

## Stack

- **Modèle** : YOLOv8n fine-tuné (classe unique `Tas_Var`)
- **API** : FastAPI + Uvicorn
- **Frontend** : HTML/CSS/JS (servi par la même app)
- **Inférence** : CPU (Docker)

## Lancer en local

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
set PYTHONPATH=src              # Windows PowerShell: $env:PYTHONPATH="src"
uvicorn nephroscan.api.main:app --reload --port 8000
```

Ouvrir http://localhost:8000

## Déploiement (Hugging Face Spaces)

Le moyen le plus simple pour une démo recruteur (RAM suffisante pour PyTorch) :

1. Créez un Space **Docker** : https://huggingface.co/new-space
2. SDK = **Docker**, hardware = **CPU basic**
3. Poussez ce dépôt vers le Space (ou connectez le repo GitHub)

```bash
git remote add space https://huggingface.co/spaces/VOTRE-USER/nephroscan-ai
git push space main
```

L'URL publique ressemble à : `https://huggingface.co/spaces/VOTRE-USER/nephroscan-ai`

## Architecture

```
src/nephroscan/     API, inférence, règles métier
frontend/           Interface de démo + images d'exemple
models/production/  Poids YOLOv8 (best.pt)
```
