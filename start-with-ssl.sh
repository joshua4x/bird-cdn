#!/bin/bash
# Automatischer Start mit SSL-Setup
# Verwendung: ./start-with-ssl.sh

set -e

echo "🚀 CDN mit automatischem SSL-Setup starten"
echo "==========================================="
echo ""

# Lade .env
if [ ! -f .env ]; then
    echo "❌ .env nicht gefunden!"
    echo "Erstelle .env aus .env.example:"
    echo "  cp .env.example .env"
    exit 1
fi

source .env

# Prüfe ob SSL-Setup gewünscht
if [ -z "$CDN_DOMAIN" ] || [ "$CDN_DOMAIN" = "localhost" ]; then
    echo "ℹ️  CDN_DOMAIN ist localhost - kein SSL-Setup"
    echo "🐳 Starte Services..."
    docker-compose up -d
    exit 0
fi

if [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo "⚠️  LETSENCRYPT_EMAIL nicht gesetzt"
    echo "🐳 Starte Services ohne SSL..."
    docker-compose up -d
    exit 0
fi

echo "📋 Domain: $CDN_DOMAIN"
echo "📧 Email: $LETSENCRYPT_EMAIL"
echo ""

# Starte Services
echo "🐳 Starte Docker Services..."
docker-compose up -d

echo "✅ Services gestartet"
echo ""

# Prüfe ob Zertifikat schon existiert
if [ -f "certbot/conf/live/$CDN_DOMAIN/fullchain.pem" ]; then
    echo "✅ Zertifikat existiert bereits"
    
    # Prüfe ob SSL-Config existiert
    if [ ! -f "nginx/conf.d/cdn-ssl.conf" ]; then
        echo "⚙️  SSL-Config fehlt, erstelle..."
        sed "s/YOUR_DOMAIN_HERE/$CDN_DOMAIN/g" nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf
        
        # Update .env
        if grep -q "^CDN_PROTOCOL=http" .env; then
            sed -i.bak "s/^CDN_PROTOCOL=http/CDN_PROTOCOL=https/" .env
        fi
        
        echo "🔄 NGINX neu starten..."
        docker-compose restart nginx-cdn backend-api
    fi
    
    echo ""
    echo "🎉 CDN läuft auf HTTPS!"
    echo "   https://$CDN_DOMAIN"
    exit 0
fi

# Warte auf Zertifikat-Erstellung
echo "⏳ Warte auf Zertifikat-Erstellung (max 2 Minuten)..."
echo "   (Logs: docker-compose logs -f certbot)"
echo ""

# Warte bis zu 2 Minuten
for i in {1..24}; do
    sleep 5
    
    if [ -f "certbot/conf/live/$CDN_DOMAIN/fullchain.pem" ]; then
        echo ""
        echo "✅ Zertifikat erfolgreich erstellt!"
        echo ""
        
        # Aktiviere SSL automatisch
        echo "⚙️  Aktiviere HTTPS..."
        
        # Erstelle SSL-Config
        sed "s/YOUR_DOMAIN_HERE/$CDN_DOMAIN/g" nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf
        
        # Update .env
        if grep -q "^CDN_PROTOCOL=" .env; then
            sed -i.bak "s/^CDN_PROTOCOL=.*/CDN_PROTOCOL=https/" .env
        else
            echo "CDN_PROTOCOL=https" >> .env
        fi
        
        # NGINX neu starten
        echo "🔄 Teste NGINX-Config..."
        if docker-compose exec -T nginx-cdn nginx -t 2>&1 | grep -q "successful"; then
            echo "✅ NGINX-Config OK"
            docker-compose restart nginx-cdn backend-api
        else
            echo "❌ NGINX-Config fehlerhaft"
            docker-compose exec nginx-cdn nginx -t
            exit 1
        fi
        
        echo ""
        echo "🎉 SSL erfolgreich aktiviert!"
        echo ""
        echo "🌐 Dein CDN läuft jetzt auf:"
        echo "   https://$CDN_DOMAIN"
        echo "   https://$CDN_DOMAIN/admin/"
        echo "   https://$CDN_DOMAIN/api/docs"
        echo ""
        
        exit 0
    fi
    
    echo -n "."
done

echo ""
echo "⏱️  Timeout erreicht"
echo "❌ Zertifikat wurde nicht innerhalb von 2 Minuten erstellt"
echo ""
echo "🔍 Logs prüfen:"
echo "   docker-compose logs certbot"
echo ""
echo "🔧 Manuell aktivieren nach erfolgreicher Zertifikat-Erstellung:"
echo "   ./activate-ssl.sh"
echo ""

exit 1
