#!/bin/sh
# Certbot Init Script - Erstellt automatisch Zertifikat beim ersten Start

set -e

echo "🔐 Certbot Init Script gestartet..."

# Prüfe ob Domain und Email gesetzt sind
if [ -z "$CERTBOT_DOMAIN" ]; then
    echo "❌ CERTBOT_DOMAIN nicht gesetzt! Überspringe SSL-Setup."
    echo "ℹ️  Setze CERTBOT_DOMAIN in .env für automatisches SSL-Setup"
    exit 0
fi

if [ -z "$CERTBOT_EMAIL" ]; then
    echo "❌ CERTBOT_EMAIL nicht gesetzt! Überspringe SSL-Setup."
    echo "ℹ️  Setze CERTBOT_EMAIL in .env für automatisches SSL-Setup"
    exit 0
fi

echo "📋 Konfiguration:"
echo "   Domain: $CERTBOT_DOMAIN"
echo "   Email: $CERTBOT_EMAIL"
echo "   Staging: ${CERTBOT_STAGING:-no}"

# Prüfe ob Zertifikat bereits existiert
if [ -f "/etc/letsencrypt/live/$CERTBOT_DOMAIN/fullchain.pem" ]; then
    echo "✅ Zertifikat existiert bereits für $CERTBOT_DOMAIN"
    echo "🔄 Starte Auto-Renewal Loop..."
    
    # Auto-Renewal Loop
    while :; do
        certbot renew --quiet --webroot -w /var/www/certbot
        sleep 12h
    done
else
    echo "📜 Kein Zertifikat gefunden, erstelle neues..."
    echo "⏳ Warte 10 Sekunden damit NGINX hochgefahren ist..."
    sleep 10
    
    # Staging-Flag setzen falls gewünscht
    STAGING_FLAG=""
    if [ "$CERTBOT_STAGING" = "true" ]; then
        STAGING_FLAG="--staging"
        echo "⚠️  Staging-Modus aktiviert"
    fi
    
    # Zertifikat erstellen
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        $STAGING_FLAG \
        -d "$CERTBOT_DOMAIN" || {
            echo "❌ Zertifikat-Erstellung fehlgeschlagen!"
            echo "ℹ️  Mögliche Ursachen:"
            echo "   - DNS zeigt nicht auf diesen Server"
            echo "   - Port 80 ist nicht erreichbar"
            echo "   - Domain ist nicht korrekt"
            echo ""
            echo "🔧 Manuell debuggen:"
            echo "   docker-compose logs nginx-cdn"
            echo "   docker-compose logs certbot"
            echo ""
            echo "📝 Oder manuell ausführen:"
            echo "   ./ssl-setup.sh (Linux/Mac)"
            echo "   ./ssl-setup.ps1 (Windows)"
            exit 1
        }
    
    echo "✅ Zertifikat erfolgreich erstellt!"
    echo ""
    echo "⚠️  WICHTIG: NGINX-Konfiguration aktualisieren!"
    echo "   1. Erstelle/Aktiviere HTTPS-Config:"
    
    # Erstelle SSL-Config automatisch
    if [ -f "/tmp/cdn-ssl.conf.template" ]; then
        sed "s/YOUR_DOMAIN_HERE/$CERTBOT_DOMAIN/g" /tmp/cdn-ssl.conf.template > /tmp/cdn-ssl.conf
        echo "   ✅ SSL-Config erstellt: /tmp/cdn-ssl.conf"
        echo "   📋 Kopiere diese nach nginx/conf.d/ und starte NGINX neu"
    else
        echo "   sed 's/YOUR_DOMAIN_HERE/$CERTBOT_DOMAIN/g' nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf"
    fi
    
    echo "   2. NGINX neu starten:"
    echo "   docker-compose restart nginx-cdn"
    echo ""
    echo "   3. Backend neu starten:"
    echo "   docker-compose restart backend-api"
    echo ""
    
    echo "🔄 Starte Auto-Renewal Loop..."
    
    # Auto-Renewal Loop
    while :; do
        certbot renew --quiet --webroot -w /var/www/certbot
        sleep 12h
    done
fi
