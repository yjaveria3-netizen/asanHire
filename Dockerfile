FROM python:3.11-slim

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user and adjust ownership
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Copy backend application code
COPY --chown=appuser:appuser backend/ .

# Switch to non-root user
USER appuser

# Expose default port
EXPOSE 8000

# Start Uvicorn bound to host and dynamic platform port
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
