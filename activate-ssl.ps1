# Automatische SSL-Aktivierung nach Zertifikat-Erstellung (PowerShell)

Write-Host "🔐 SSL-Aktivierung Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Lade .env
if (-not (Test-Path .env)) {
    Write-Host "❌ .env nicht gefunden!" -ForegroundColor Red
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

if ([string]::IsNullOrWhiteSpace($CDN_DOMAIN) -or $CDN_DOMAIN -eq "localhost") {
    Write-Host "❌ CDN_DOMAIN nicht gesetzt oder noch localhost" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Domain: $CDN_DOMAIN" -ForegroundColor Gray
Write-Host ""

# Prüfe ob Zertifikat existiert
$certPath = "certbot\conf\live\$CDN_DOMAIN\fullchain.pem"
if (-not (Test-Path $certPath)) {
    Write-Host "❌ Kein Zertifikat gefunden für $CDN_DOMAIN" -ForegroundColor Red
    Write-Host "ℹ️  Warte auf Zertifikat-Erstellung..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Logs ansehen: docker-compose logs -f certbot" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Zertifikat gefunden!" -ForegroundColor Green
Write-Host ""

# Erstelle SSL-Config
Write-Host "⚙️  Erstelle SSL-Konfiguration..." -ForegroundColor Blue
$template = Get-Content nginx\conf.d\cdn-ssl.conf.template -Raw
$config = $template -replace 'YOUR_DOMAIN_HERE', $CDN_DOMAIN
Set-Content -Path nginx\conf.d\cdn-ssl.conf -Value $config
Write-Host "✅ nginx\conf.d\cdn-ssl.conf erstellt" -ForegroundColor Green

# Update .env
Write-Host "⚙️  Setze CDN_PROTOCOL=https..." -ForegroundColor Blue
$envContent = Get-Content .env
$envContent = $envContent -replace '^CDN_PROTOCOL=.*', 'CDN_PROTOCOL=https'
Set-Content -Path .env -Value $envContent
Write-Host "✅ .env aktualisiert" -ForegroundColor Green

# NGINX neu starten
Write-Host "🔄 Teste NGINX-Konfiguration..." -ForegroundColor Blue
$testResult = docker-compose exec -T nginx-cdn nginx -t 2>&1
if ($testResult -match "successful") {
    Write-Host "✅ NGINX-Config OK" -ForegroundColor Green
    Write-Host "🔄 Starte NGINX neu..." -ForegroundColor Blue
    docker-compose restart nginx-cdn | Out-Null
    Write-Host "✅ NGINX neu gestartet" -ForegroundColor Green
} else {
    Write-Host "❌ NGINX-Config fehlerhaft!" -ForegroundColor Red
    docker-compose exec nginx-cdn nginx -t
    exit 1
}

# Backend neu starten
Write-Host "🔄 Starte Backend neu..." -ForegroundColor Blue
docker-compose restart backend-api | Out-Null
Write-Host "✅ Backend neu gestartet" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 SSL erfolgreich aktiviert!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Testen:" -ForegroundColor Cyan
Write-Host "   curl -I https://$CDN_DOMAIN/health" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   CDN:      https://$CDN_DOMAIN" -ForegroundColor Gray
Write-Host "   Admin UI: https://$CDN_DOMAIN/admin/" -ForegroundColor Gray
Write-Host "   API Docs: https://$CDN_DOMAIN/api/docs" -ForegroundColor Gray
Write-Host ""
