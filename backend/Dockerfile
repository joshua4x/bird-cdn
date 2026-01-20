FROM python:3.12-slim

WORKDIR /app

# System Dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    git \
    docker.io \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application Code
COPY . .

# Make scripts executable (force with -v for verbose output)
RUN chmod -v +x /app/cron_aggregate_logs.py && \
    chmod -v +x /app/setup_tracking_cron.sh && \
    chmod -v +x /app/start.sh && \
    ls -la /app/*.sh /app/cron_aggregate_logs.py

# Create cache and log directories
RUN mkdir -p /var/cache/nginx /var/log

# Expose Port
EXPOSE 8000

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run Application via bash (ensures script execution even if permissions fail)
CMD ["bash", "/app/start.sh"]
