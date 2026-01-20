#!/bin/bash

echo "🚀 Starting CDN System..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from example..."
    cp .env.example .env
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p nginx/cache
mkdir -p storage/data
mkdir -p ssl

# Build and start services
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "✅ CDN System is starting!"
echo ""
echo "📊 Services will be available at:"
echo "   - CDN Edge:        http://localhost"
echo "   - Admin UI:        http://localhost:3000"
echo "   - Backend API:     http://localhost:8000"
echo "   - MinIO Console:   http://localhost:9011"
echo "   - Grafana:         http://localhost:3001"
echo "   - Prometheus:      http://localhost:9090"
echo ""
echo "⏳ Please wait 30-60 seconds for all services to be ready..."
echo ""
echo "📖 Check logs with: docker-compose logs -f"
echo "🛑 Stop with: docker-compose down"
