#!/bin/bash
# SSL Setup Script für Let's Encrypt mit Certbot
# Dieses Script richtet automatisch SSL-Zertifikate ein

set -e

echo "🔐 CDN SSL Setup mit Let's Encrypt"
echo "===================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion für farbige Ausgabe
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    print_color $RED "❌ Fehler: .env Datei nicht gefunden!"
    echo "Erstelle .env aus .env.example:"
    echo "  cp .env.example .env"
    exit 1
fi

# Lade Environment-Variablen
source .env

# Prüfe ob CDN_DOMAIN gesetzt ist
if [ -z "$CDN_DOMAIN" ] || [ "$CDN_DOMAIN" = "localhost" ]; then
    print_color $RED "❌ Fehler: CDN_DOMAIN nicht korrekt konfiguriert!"
    echo ""
    echo "Bitte setze CDN_DOMAIN in der .env Datei:"
    echo "  CDN_DOMAIN=cdn.yourdomain.com"
    echo ""
    exit 1
fi

# Email für Let's Encrypt abfragen
if [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo ""
    print_color $YELLOW "📧 Bitte Email-Adresse für Let's Encrypt eingeben:"
    read -p "Email: " LETSENCRYPT_EMAIL
    
    # Email zur .env hinzufügen
    if ! grep -q "LETSENCRYPT_EMAIL" .env; then
        echo "" >> .env
        echo "# Let's Encrypt Email" >> .env
        echo "LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL" >> .env
        print_color $GREEN "✅ Email zur .env hinzugefügt"
    fi
fi

echo ""
print_color $BLUE "📋 Konfiguration:"
echo "  Domain: $CDN_DOMAIN"
echo "  Email: $LETSENCRYPT_EMAIL"
echo ""

# Staging-Modus Option
read -p "🧪 Staging-Modus verwenden? (Empfohlen für Tests) [Y/n]: " use_staging
use_staging=${use_staging:-Y}

STAGING_FLAG=""
if [[ "$use_staging" =~ ^[Yy]$ ]]; then
    STAGING_FLAG="--staging"
    print_color $YELLOW "⚠️  Staging-Modus aktiviert (Test-Zertifikat)"
else
    print_color $GREEN "✅ Production-Modus aktiviert (Echtes Zertifikat)"
fi

echo ""
print_color $YELLOW "⚠️  Wichtig: Stelle sicher dass:"
echo "  1. DNS A-Record für $CDN_DOMAIN auf Server-IP zeigt"
echo "  2. Port 80 ist erreichbar (Firewall/Security Group)"
echo "  3. Docker-Services laufen"
echo ""

read -p "Fortfahren? [Y/n]: " confirm
confirm=${confirm:-Y}
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_color $YELLOW "Abgebrochen."
    exit 0
fi

echo ""
print_color $BLUE "🚀 Starte SSL-Setup..."

# Erstelle benötigte Verzeichnisse
print_color $BLUE "📁 Erstelle Verzeichnisse..."
mkdir -p certbot/www certbot/conf certbot/logs ssl

# Starte Docker-Services falls nicht laufen
print_color $BLUE "🐳 Prüfe Docker-Services..."
if ! docker-compose ps | grep -q "cdn-edge.*Up"; then
    print_color $YELLOW "⚠️  NGINX läuft nicht, starte Services..."
    docker-compose up -d nginx-cdn
    sleep 5
fi

# DNS-Prüfung
print_color $BLUE "🔍 Prüfe DNS-Auflösung..."
if ! nslookup $CDN_DOMAIN > /dev/null 2>&1; then
    print_color $RED "❌ DNS-Auflösung fehlgeschlagen!"
    print_color $YELLOW "⚠️  Stelle sicher dass DNS propagiert ist und versuche es später nochmal."
    exit 1
fi
print_color $GREEN "✅ DNS-Auflösung erfolgreich"

# Erreichbarkeit prüfen
print_color $BLUE "🌐 Prüfe Erreichbarkeit über Port 80..."
if ! curl -sSf -I http://$CDN_DOMAIN/health > /dev/null 2>&1; then
    print_color $YELLOW "⚠️  Server nicht erreichbar über http://$CDN_DOMAIN"
    print_color $YELLOW "    Dies könnte normal sein wenn Firewall/Redirect aktiv ist."
fi

# Zertifikat anfordern
print_color $BLUE "📜 Fordere Zertifikat an..."
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $LETSENCRYPT_EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG \
    -d $CDN_DOMAIN

# Prüfe ob Zertifikat erstellt wurde
if [ ! -f "certbot/conf/live/$CDN_DOMAIN/fullchain.pem" ]; then
    print_color $RED "❌ Zertifikat-Erstellung fehlgeschlagen!"
    echo ""
    echo "Logs ansehen:"
    echo "  docker-compose logs certbot"
    exit 1
fi

print_color $GREEN "✅ Zertifikat erfolgreich erstellt!"

# SSL-Konfiguration aktivieren
print_color $BLUE "⚙️  Aktiviere HTTPS-Konfiguration..."

# Ersetze YOUR_DOMAIN_HERE in Template
sed "s/YOUR_DOMAIN_HERE/$CDN_DOMAIN/g" nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf

print_color $GREEN "✅ HTTPS-Konfiguration erstellt"

# Update .env mit HTTPS
if grep -q "^CDN_PROTOCOL=" .env; then
    sed -i.bak "s/^CDN_PROTOCOL=.*/CDN_PROTOCOL=https/" .env
    print_color $GREEN "✅ CDN_PROTOCOL auf https gesetzt"
else
    echo "CDN_PROTOCOL=https" >> .env
fi

# NGINX neu laden
print_color $BLUE "🔄 Lade NGINX-Konfiguration neu..."
docker-compose exec nginx-cdn nginx -t && docker-compose restart nginx-cdn

print_color $GREEN "✅ NGINX neu gestartet"

# Certbot Auto-Renewal starten
print_color $BLUE "🔄 Starte Certbot Auto-Renewal Service..."
docker-compose up -d certbot

echo ""
print_color $GREEN "🎉 SSL-Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "  1. Teste HTTPS: https://$CDN_DOMAIN/health"
echo "  2. Backend neu starten für neue URLs:"
echo "     docker-compose restart backend-api"
echo ""

if [[ "$use_staging" =~ ^[Yy]$ ]]; then
    print_color $YELLOW "⚠️  STAGING-MODUS war aktiv!"
    echo ""
    echo "Für Production-Zertifikat:"
    echo "  1. Lösche Staging-Cert: rm -rf certbot/conf/live certbot/conf/archive certbot/conf/renewal"
    echo "  2. Führe Script nochmal aus und wähle 'N' bei Staging"
    echo ""
fi

echo "📚 Weitere Infos:"
echo "  - Zertifikat-Pfad: certbot/conf/live/$CDN_DOMAIN/"
echo "  - Auto-Renewal: Alle 12h automatisch"
echo "  - Logs: docker-compose logs certbot"
echo ""

print_color $GREEN "✨ Viel Erfolg!"
