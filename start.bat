@echo off
echo 🚀 Starting CDN System...

REM Check if .env exists
if not exist .env (
    echo 📝 Creating .env from example...
    copy .env.example .env
)

REM Create necessary directories
echo 📁 Creating directories...
if not exist nginx\cache mkdir nginx\cache
if not exist storage\data mkdir storage\data
if not exist ssl mkdir ssl

REM Build and start services
echo 🐳 Starting Docker containers...
docker-compose up -d

echo.
echo ✅ CDN System is starting!
echo.
echo 📊 Services will be available at:
echo    - CDN Edge:        http://localhost
echo    - Admin UI:        http://localhost:3000
echo    - Backend API:     http://localhost:8000
echo    - MinIO Console:   http://localhost:9011
echo    - Grafana:         http://localhost:3001
echo    - Prometheus:      http://localhost:9090
echo.
echo ⏳ Please wait 30-60 seconds for all services to be ready...
echo.
echo 📖 Check logs with: docker-compose logs -f
echo 🛑 Stop with: docker-compose down
pause
