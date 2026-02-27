# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend assets from Stage 1 into backend/static
# Note: Ensure backend/static is where your FastAPI app looks for files
RUN mkdir -p static
COPY --from=frontend-builder /app/frontend/dist/ ./static/

# Expose the API port
EXPOSE 8000

# Start the application using Gunicorn
# Using 1 worker for free tier to minimize memory usage
CMD ["gunicorn", "main:app", "--workers", "1", "--timeout", "120", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
