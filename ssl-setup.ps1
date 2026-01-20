# SSL Setup Script für Let's Encrypt mit Certbot (PowerShell)
# Dieses Script richtet automatisch SSL-Zertifikate ein

param(
    [switch]$Staging = $false
)

Write-Host "🔐 CDN SSL Setup mit Let's Encrypt" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob .env existiert
if (-not (Test-Path .env)) {
    Write-Host "❌ Fehler: .env Datei nicht gefunden!" -ForegroundColor Red
    Write-Host "Erstelle .env aus .env.example:" -ForegroundColor Yellow
    Write-Host "  Copy-Item .env.example .env" -ForegroundColor Gray
    exit 1
}

# Lade Environment-Variablen
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

$CDN_DOMAIN = $env:CDN_DOMAIN
$LETSENCRYPT_EMAIL = $env:LETSENCRYPT_EMAIL

# Prüfe ob CDN_DOMAIN gesetzt ist
if ([string]::IsNullOrWhiteSpace($CDN_DOMAIN) -or $CDN_DOMAIN -eq "localhost") {
    Write-Host "❌ Fehler: CDN_DOMAIN nicht korrekt konfiguriert!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte setze CDN_DOMAIN in der .env Datei:" -ForegroundColor Yellow
    Write-Host "  CDN_DOMAIN=cdn.yourdomain.com" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Email für Let's Encrypt abfragen
if ([string]::IsNullOrWhiteSpace($LETSENCRYPT_EMAIL)) {
    Write-Host ""
    Write-Host "📧 Bitte Email-Adresse für Let's Encrypt eingeben:" -ForegroundColor Yellow
    $LETSENCRYPT_EMAIL = Read-Host "Email"
    
    # Email zur .env hinzufügen
    if (-not (Select-String -Path .env -Pattern "LETSENCRYPT_EMAIL" -Quiet)) {
        Add-Content -Path .env -Value "`n# Let's Encrypt Email"
        Add-Content -Path .env -Value "LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL"
        Write-Host "✅ Email zur .env hinzugefügt" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📋 Konfiguration:" -ForegroundColor Blue
Write-Host "  Domain: $CDN_DOMAIN" -ForegroundColor Gray
Write-Host "  Email: $LETSENCRYPT_EMAIL" -ForegroundColor Gray
Write-Host ""

# Staging-Modus Option
if (-not $Staging) {
    $stagingInput = Read-Host "🧪 Staging-Modus verwenden? (Empfohlen für Tests) [Y/n]"
    if ([string]::IsNullOrWhiteSpace($stagingInput) -or $stagingInput -eq "Y" -or $stagingInput -eq "y") {
        $Staging = $true
    }
}

$STAGING_FLAG = ""
if ($Staging) {
    $STAGING_FLAG = "--staging"
    Write-Host "⚠️  Staging-Modus aktiviert (Test-Zertifikat)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Production-Modus aktiviert (Echtes Zertifikat)" -ForegroundColor Green
}

Write-Host ""
Write-Host "⚠️  Wichtig: Stelle sicher dass:" -ForegroundColor Yellow
Write-Host "  1. DNS A-Record für $CDN_DOMAIN auf Server-IP zeigt" -ForegroundColor Gray
Write-Host "  2. Port 80 ist erreichbar (Firewall/Security Group)" -ForegroundColor Gray
Write-Host "  3. Docker-Services laufen" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Fortfahren? [Y/n]"
if (-not ([string]::IsNullOrWhiteSpace($confirm) -or $confirm -eq "Y" -or $confirm -eq "y")) {
    Write-Host "Abgebrochen." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Starte SSL-Setup..." -ForegroundColor Blue

# Erstelle benötigte Verzeichnisse
Write-Host "📁 Erstelle Verzeichnisse..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path certbot\www, certbot\conf, certbot\logs, ssl | Out-Null

# Starte Docker-Services falls nicht laufen
Write-Host "🐳 Prüfe Docker-Services..." -ForegroundColor Blue
$nginxRunning = docker-compose ps | Select-String "cdn-edge.*Up"
if (-not $nginxRunning) {
    Write-Host "⚠️  NGINX läuft nicht, starte Services..." -ForegroundColor Yellow
    docker-compose up -d nginx-cdn
    Start-Sleep -Seconds 5
}

# DNS-Prüfung
Write-Host "🔍 Prüfe DNS-Auflösung..." -ForegroundColor Blue
try {
    $dnsResult = Resolve-DnsName $CDN_DOMAIN -ErrorAction Stop
    Write-Host "✅ DNS-Auflösung erfolgreich" -ForegroundColor Green
} catch {
    Write-Host "❌ DNS-Auflösung fehlgeschlagen!" -ForegroundColor Red
    Write-Host "⚠️  Stelle sicher dass DNS propagiert ist und versuche es später nochmal." -ForegroundColor Yellow
    exit 1
}

# Erreichbarkeit prüfen
Write-Host "🌐 Prüfe Erreichbarkeit über Port 80..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://$CDN_DOMAIN/health" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
} catch {
    Write-Host "⚠️  Server nicht erreichbar über http://$CDN_DOMAIN" -ForegroundColor Yellow
    Write-Host "    Dies könnte normal sein wenn Firewall/Redirect aktiv ist." -ForegroundColor Gray
}

# Zertifikat anfordern
Write-Host "📜 Fordere Zertifikat an..." -ForegroundColor Blue
$certbotCmd = "docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email $LETSENCRYPT_EMAIL --agree-tos --no-eff-email $STAGING_FLAG -d $CDN_DOMAIN"
Invoke-Expression $certbotCmd

# Prüfe ob Zertifikat erstellt wurde
if (-not (Test-Path "certbot\conf\live\$CDN_DOMAIN\fullchain.pem")) {
    Write-Host "❌ Zertifikat-Erstellung fehlgeschlagen!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Logs ansehen:" -ForegroundColor Yellow
    Write-Host "  docker-compose logs certbot" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Zertifikat erfolgreich erstellt!" -ForegroundColor Green

# SSL-Konfiguration aktivieren
Write-Host "⚙️  Aktiviere HTTPS-Konfiguration..." -ForegroundColor Blue

# Ersetze YOUR_DOMAIN_HERE in Template
$template = Get-Content nginx\conf.d\cdn-ssl.conf.template -Raw
$config = $template -replace 'YOUR_DOMAIN_HERE', $CDN_DOMAIN
Set-Content -Path nginx\conf.d\cdn-ssl.conf -Value $config

Write-Host "✅ HTTPS-Konfiguration erstellt" -ForegroundColor Green

# Update .env mit HTTPS
$envContent = Get-Content .env
$envContent = $envContent -replace '^CDN_PROTOCOL=.*', 'CDN_PROTOCOL=https'
Set-Content -Path .env -Value $envContent
Write-Host "✅ CDN_PROTOCOL auf https gesetzt" -ForegroundColor Green

# NGINX neu laden
Write-Host "🔄 Lade NGINX-Konfiguration neu..." -ForegroundColor Blue
docker-compose exec nginx-cdn nginx -t
if ($LASTEXITCODE -eq 0) {
    docker-compose restart nginx-cdn
    Write-Host "✅ NGINX neu gestartet" -ForegroundColor Green
} else {
    Write-Host "❌ NGINX-Konfiguration fehlerhaft!" -ForegroundColor Red
    exit 1
}

# Certbot Auto-Renewal starten
Write-Host "🔄 Starte Certbot Auto-Renewal Service..." -ForegroundColor Blue
docker-compose up -d certbot

Write-Host ""
Write-Host "🎉 SSL-Setup abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Nächste Schritte:" -ForegroundColor Cyan
Write-Host "  1. Teste HTTPS: https://$CDN_DOMAIN/health" -ForegroundColor Gray
Write-Host "  2. Backend neu starten für neue URLs:" -ForegroundColor Gray
Write-Host "     docker-compose restart backend-api" -ForegroundColor Gray
Write-Host ""

if ($Staging) {
    Write-Host "⚠️  STAGING-MODUS war aktiv!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Für Production-Zertifikat:" -ForegroundColor Yellow
    Write-Host "  1. Lösche Staging-Cert: Remove-Item -Recurse certbot\conf\live, certbot\conf\archive, certbot\conf\renewal" -ForegroundColor Gray
    Write-Host "  2. Führe Script nochmal aus: .\ssl-setup.ps1" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "📚 Weitere Infos:" -ForegroundColor Cyan
Write-Host "  - Zertifikat-Pfad: certbot\conf\live\$CDN_DOMAIN\" -ForegroundColor Gray
Write-Host "  - Auto-Renewal: Alle 12h automatisch" -ForegroundColor Gray
Write-Host "  - Logs: docker-compose logs certbot" -ForegroundColor Gray
Write-Host ""

Write-Host "✨ Viel Erfolg!" -ForegroundColor Green
