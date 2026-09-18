# ==============================================================================
# AI Job Assistant - Backend Dockerfile
# Optimized with Astral uv, multi-stage font support, and non-root security.
# ==============================================================================

FROM python:3.11-slim AS runtime

WORKDIR /app

# Install Debian open-source Chinese fonts to guarantee ReportLab PDF generation
# without UnicodeEncodeError or missing character rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy uv binary directly from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set uv environment variables for reproducible in-container installs
ENV UV_SYSTEM_PYTHON=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Copy dependency specifications first for optimal Docker layer caching
COPY backend/pyproject.toml backend/uv.lock ./

# Synchronize dependencies strictly from uv.lock (no dev dependencies)
RUN uv pip install --no-cache -r pyproject.toml

# Copy backend application source code
COPY backend/app ./app

# Create persistent storage directories
RUN mkdir -p /app/uploads /app/data

EXPOSE 8000

# Run FastAPI backend via Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
