# CDN Deployment Debug Script

Write-Host "=== CDN Deployment Debug ===" -ForegroundColor Cyan
Write-Host ""

# 1. Container Status
Write-Host "1. Container Status:" -ForegroundColor Yellow
docker-compose ps
Write-Host ""

# 2. Check welche Ports exposed sind
Write-Host "2. Exposed Ports:" -ForegroundColor Yellow
docker-compose ps | Select-String -Pattern "80|443|3000|8000"
Write-Host ""

# 3. NGINX Config Status
Write-Host "3. NGINX SSL Config:" -ForegroundColor Yellow
if (Test-Path "nginx/conf.d/cdn-ssl.conf") {
    Write-Host "✅ cdn-ssl.conf existiert" -ForegroundColor Green
    Get-Content "nginx/conf.d/cdn-ssl.conf" | Select-String -Pattern "listen 443|ssl_certificate|server_name"
} else {
    Write-Host "❌ cdn-ssl.conf FEHLT - SSL nicht aktiviert!" -ForegroundColor Red
}
Write-Host ""

# 4. Certbot Status
Write-Host "4. Certbot Zertifikat:" -ForegroundColor Yellow
docker-compose exec certbot ls -la /etc/letsencrypt/live/ 2>$null
Write-Host ""

# 5. Frontend Container Logs
Write-Host "5. Frontend Logs (letzte 20 Zeilen):" -ForegroundColor Yellow
docker-compose logs --tail=20 frontend
Write-Host ""

# 6. NGINX Error Logs
Write-Host "6. NGINX Error Logs (letzte 20 Zeilen):" -ForegroundColor Yellow
docker-compose logs --tail=20 nginx-cdn | Select-String -Pattern "error|Error|fail|Fail"
Write-Host ""

# 7. Backend API Status
Write-Host "7. Backend API Health:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "✅ Backend erreichbar: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend nicht erreichbar: $_" -ForegroundColor Red
}
Write-Host ""

# 8. NGINX Access Logs für Frontend-Requests
Write-Host "8. NGINX Access Logs (Frontend-Requests):" -ForegroundColor Yellow
docker-compose logs --tail=30 nginx-cdn | Select-String -Pattern "GET / |GET /admin|GET /assets"
Write-Host ""

# 9. Test HTTP und HTTPS Ports
Write-Host "9. Port Connectivity:" -ForegroundColor Yellow
Write-Host "Testing localhost:80..."
try {
    $http = Invoke-WebRequest -Uri "http://localhost/" -TimeoutSec 3 -UseBasicParsing
    Write-Host "✅ HTTP Port 80: $($http.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ HTTP Port 80: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Testing localhost:443..."
try {
    $https = Invoke-WebRequest -Uri "https://localhost/" -TimeoutSec 3 -SkipCertificateCheck -UseBasicParsing
    Write-Host "✅ HTTPS Port 443: $($https.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ HTTPS Port 443: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 10. Frontend Container Details
Write-Host "10. Frontend Container Inspect:" -ForegroundColor Yellow
docker-compose exec frontend ls -la /usr/share/nginx/html/ 2>$null
Write-Host ""

Write-Host "=== Debug Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nächste Schritte:" -ForegroundColor Yellow
Write-Host "- Wenn cdn-ssl.conf fehlt: ./activate-ssl.ps1 ausführen"
Write-Host "- Wenn Frontend leer: docker-compose restart frontend"
Write-Host "- Logs anschauen: docker-compose logs -f nginx-cdn frontend"
