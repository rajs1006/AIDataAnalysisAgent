FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    python3-dev \
    libmagic1 \
    libmagic-dev \
    python3-tk \
    tk-dev \
    tcl-dev \
    tcl8.6-dev \
    tk8.6-dev \
    tesseract-ocr \
    libtesseract-dev \
    # Additional dependencies that might be needed
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Create directory for GCS credentials
RUN mkdir -p /app/gcs-credentials

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
