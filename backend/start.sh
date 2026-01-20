#!/bin/bash
# Backend Startup Script
# 1. Setup cron for log aggregation
# 2. Start FastAPI application

set -e

echo "🚀 Starting Bird-CDN Backend..."

# Setup log aggregation cron job
if [ -f "/app/setup_tracking_cron.sh" ]; then
    echo "📊 Setting up tracking cron job..."
    bash /app/setup_tracking_cron.sh
else
    echo "⚠️  Cron setup script not found, skipping..."
fi

# Start FastAPI application
echo "🌐 Starting FastAPI server..."
# Increase limits for large file uploads:
# --limit-max-requests 0: No request limit (default: 0)
# --timeout-keep-alive 650: Keep-alive timeout for large uploads (10min+50s buffer)
# --limit-concurrency 1000: Max concurrent connections
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 \
  --timeout-keep-alive 650 \
  --limit-concurrency 1000
