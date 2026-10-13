FROM python:3.12-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ backend/

# Copy pre-compiled frontend assets
COPY frontend/dist/ frontend/dist/

# Configuration
ENV PORT=8080
ENV LIFEPILOT_DB_PATH=/app/lifepilot.db
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
