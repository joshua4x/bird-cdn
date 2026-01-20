#!/bin/bash
# Automatische SSL-Aktivierung nach Zertifikat-Erstellung

set -e

echo "🔐 SSL-Aktivierung Script"
echo "========================"
echo ""

# Lade .env
if [ -f .env ]; then
    source .env
else
    echo "❌ .env nicht gefunden!"
    exit 1
fi

if [ -z "$CDN_DOMAIN" ] || [ "$CDN_DOMAIN" = "localhost" ]; then
    echo "❌ CDN_DOMAIN nicht gesetzt oder noch localhost"
    exit 1
fi

echo "📋 Domain: $CDN_DOMAIN"
echo ""

# Prüfe ob Zertifikat existiert
if [ ! -f "certbot/conf/live/$CDN_DOMAIN/fullchain.pem" ]; then
    echo "❌ Kein Zertifikat gefunden für $CDN_DOMAIN"
    echo "ℹ️  Warte auf Zertifikat-Erstellung..."
    echo ""
    echo "Logs ansehen: docker-compose logs -f certbot"
    exit 1
fi

echo "✅ Zertifikat gefunden!"
echo ""

# Erstelle SSL-Config
echo "⚙️  Erstelle SSL-Konfiguration..."
sed "s/YOUR_DOMAIN_HERE/$CDN_DOMAIN/g" nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf
echo "✅ nginx/conf.d/cdn-ssl.conf erstellt"

# Update .env
echo "⚙️  Setze CDN_PROTOCOL=https..."
if grep -q "^CDN_PROTOCOL=" .env; then
    sed -i.bak "s/^CDN_PROTOCOL=.*/CDN_PROTOCOL=https/" .env
else
    echo "CDN_PROTOCOL=https" >> .env
fi
echo "✅ .env aktualisiert"

# NGINX neu starten
echo "🔄 Teste NGINX-Konfiguration..."
if docker-compose exec -T nginx-cdn nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ NGINX-Config OK"
    echo "🔄 Starte NGINX neu..."
    docker-compose restart nginx-cdn
    echo "✅ NGINX neu gestartet"
else
    echo "❌ NGINX-Config fehlerhaft!"
    docker-compose exec nginx-cdn nginx -t
    exit 1
fi

# Backend neu starten
echo "🔄 Starte Backend neu..."
docker-compose restart backend-api
echo "✅ Backend neu gestartet"

echo ""
echo "🎉 SSL erfolgreich aktiviert!"
echo ""
echo "🧪 Testen:"
echo "   curl -I https://$CDN_DOMAIN/health"
echo ""
echo "🌐 URLs:"
echo "   CDN:      https://$CDN_DOMAIN"
echo "   Admin UI: https://$CDN_DOMAIN/admin/"
echo "   API Docs: https://$CDN_DOMAIN/api/docs"
echo ""
