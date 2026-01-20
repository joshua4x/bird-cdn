# Automatischer Start mit SSL-Setup (PowerShell)
# Verwendung: .\start-with-ssl.ps1

Write-Host "🚀 CDN mit automatischem SSL-Setup starten" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Lade .env
if (-not (Test-Path .env)) {
    Write-Host "❌ .env nicht gefunden!" -ForegroundColor Red
    Write-Host "Erstelle .env aus .env.example:" -ForegroundColor Yellow
    Write-Host "  Copy-Item .env.example .env" -ForegroundColor Gray
    exit 1
}

Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

$CDN_DOMAIN = $env:CDN_DOMAIN
$LETSENCRYPT_EMAIL = $env:LETSENCRYPT_EMAIL

# Prüfe ob SSL-Setup gewünscht
if ([string]::IsNullOrWhiteSpace($CDN_DOMAIN) -or $CDN_DOMAIN -eq "localhost") {
    Write-Host "ℹ️  CDN_DOMAIN ist localhost - kein SSL-Setup" -ForegroundColor Yellow
    Write-Host "🐳 Starte Services..." -ForegroundColor Blue
    docker-compose up -d
    exit 0
}

if ([string]::IsNullOrWhiteSpace($LETSENCRYPT_EMAIL)) {
    Write-Host "⚠️  LETSENCRYPT_EMAIL nicht gesetzt" -ForegroundColor Yellow
    Write-Host "🐳 Starte Services ohne SSL..." -ForegroundColor Blue
    docker-compose up -d
    exit 0
}

Write-Host "📋 Domain: $CDN_DOMAIN" -ForegroundColor Gray
Write-Host "📧 Email: $LETSENCRYPT_EMAIL" -ForegroundColor Gray
Write-Host ""

# Starte Services
Write-Host "🐳 Starte Docker Services..." -ForegroundColor Blue
docker-compose up -d
Write-Host "✅ Services gestartet" -ForegroundColor Green
Write-Host ""

# Prüfe ob Zertifikat schon existiert
$certPath = "certbot\conf\live\$CDN_DOMAIN\fullchain.pem"
if (Test-Path $certPath) {
    Write-Host "✅ Zertifikat existiert bereits" -ForegroundColor Green
    
    # Prüfe ob SSL-Config existiert
    if (-not (Test-Path "nginx\conf.d\cdn-ssl.conf")) {
        Write-Host "⚙️  SSL-Config fehlt, erstelle..." -ForegroundColor Blue
        $template = Get-Content nginx\conf.d\cdn-ssl.conf.template -Raw
        $config = $template -replace 'YOUR_DOMAIN_HERE', $CDN_DOMAIN
        Set-Content -Path nginx\conf.d\cdn-ssl.conf -Value $config
        
        # Update .env
        $envContent = Get-Content .env
        if ($envContent -match '^CDN_PROTOCOL=http') {
            $envContent = $envContent -replace '^CDN_PROTOCOL=http', 'CDN_PROTOCOL=https'
            Set-Content -Path .env -Value $envContent
        }
        
        Write-Host "🔄 NGINX neu starten..." -ForegroundColor Blue
        docker-compose restart nginx-cdn backend-api | Out-Null
    }
    
    Write-Host ""
    Write-Host "🎉 CDN läuft auf HTTPS!" -ForegroundColor Green
    Write-Host "   https://$CDN_DOMAIN" -ForegroundColor Gray
    exit 0
}

# Warte auf Zertifikat-Erstellung
Write-Host "⏳ Warte auf Zertifikat-Erstellung (max 2 Minuten)..." -ForegroundColor Yellow
Write-Host "   (Logs: docker-compose logs -f certbot)" -ForegroundColor Gray
Write-Host ""

# Warte bis zu 2 Minuten
for ($i = 1; $i -le 24; $i++) {
    Start-Sleep -Seconds 5
    
    if (Test-Path $certPath) {
        Write-Host ""
        Write-Host "✅ Zertifikat erfolgreich erstellt!" -ForegroundColor Green
        Write-Host ""
        
        # Aktiviere SSL automatisch
        Write-Host "⚙️  Aktiviere HTTPS..." -ForegroundColor Blue
        
        # Erstelle SSL-Config
        $template = Get-Content nginx\conf.d\cdn-ssl.conf.template -Raw
        $config = $template -replace 'YOUR_DOMAIN_HERE', $CDN_DOMAIN
        Set-Content -Path nginx\conf.d\cdn-ssl.conf -Value $config
        
        # Update .env
        $envContent = Get-Content .env
        $envContent = $envContent -replace '^CDN_PROTOCOL=.*', 'CDN_PROTOCOL=https'
        Set-Content -Path .env -Value $envContent
        
        # NGINX neu starten
        Write-Host "🔄 Teste NGINX-Config..." -ForegroundColor Blue
        $testResult = docker-compose exec -T nginx-cdn nginx -t 2>&1
        if ($testResult -match "successful") {
            Write-Host "✅ NGINX-Config OK" -ForegroundColor Green
            docker-compose restart nginx-cdn backend-api | Out-Null
        } else {
            Write-Host "❌ NGINX-Config fehlerhaft" -ForegroundColor Red
            docker-compose exec nginx-cdn nginx -t
            exit 1
        }
        
        Write-Host ""
        Write-Host "🎉 SSL erfolgreich aktiviert!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Dein CDN läuft jetzt auf:" -ForegroundColor Cyan
        Write-Host "   https://$CDN_DOMAIN" -ForegroundColor Gray
        Write-Host "   https://$CDN_DOMAIN/admin/" -ForegroundColor Gray
        Write-Host "   https://$CDN_DOMAIN/api/docs" -ForegroundColor Gray
        Write-Host ""
        
        exit 0
    }
    
    Write-Host "." -NoNewline -ForegroundColor Gray
}

Write-Host ""
Write-Host "⏱️  Timeout erreicht" -ForegroundColor Yellow
Write-Host "❌ Zertifikat wurde nicht innerhalb von 2 Minuten erstellt" -ForegroundColor Red
Write-Host ""
Write-Host "🔍 Logs prüfen:" -ForegroundColor Yellow
Write-Host "   docker-compose logs certbot" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Manuell aktivieren nach erfolgreicher Zertifikat-Erstellung:" -ForegroundColor Yellow
Write-Host "   .\activate-ssl.ps1" -ForegroundColor Gray
Write-Host ""

exit 1
