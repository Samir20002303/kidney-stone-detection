FROM python:3.10-slim

RUN useradd -m -u 1000 user

RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir \
        torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=user src/ src/
COPY --chown=user frontend/ frontend/
COPY --chown=user models/production/best.pt models/production/best.pt

USER user
ENV HOME=/home/user
ENV PATH=/home/user/.local/bin:$PATH
ENV PYTHONPATH=/home/user/app/src
ENV MODEL_PATH=/home/user/app/models/production/best.pt
ENV DEVICE=cpu
ENV CONFIDENCE_THRESHOLD=0.35
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["sh", "-c", "uvicorn nephroscan.api.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
