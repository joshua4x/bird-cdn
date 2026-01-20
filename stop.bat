@echo off
echo 🛑 Stopping CDN System...
docker-compose down

echo.
echo ✅ All services stopped!
echo.
echo 🗑️  To remove all data:
echo    docker-compose down -v
pause
