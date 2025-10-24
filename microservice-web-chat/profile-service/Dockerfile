# Multi-stage build
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appuser . .
RUN mkdir -p uploads/profiles && chown -R appuser:appuser uploads
USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081", "--workers", "1"]
