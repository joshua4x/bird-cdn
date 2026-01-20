#!/bin/bash
# Fix Frontend Routing

echo "🔧 Fixing Frontend Routing..."

# 1. nginx/conf.d/cdn-ssl.conf aktualisieren
if [ -f "nginx/conf.d/cdn-ssl.conf" ]; then
    echo "📝 Updating cdn-ssl.conf..."
    
    # Backup erstellen
    cp nginx/conf.d/cdn-ssl.conf nginx/conf.d/cdn-ssl.conf.backup
    
    # Frontend Assets hinzufügen
    sed -i '/# Admin UI/i\    # Frontend Assets (CSS, JS, etc.)\n    location /assets/ {\n        proxy_pass http://frontend;\n        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        expires 7d;\n        add_header Cache-Control "public, max-age=604800";\n    }\n' nginx/conf.d/cdn-ssl.conf
    
    # /admin/ zu /admin ändern (ohne trailing slash)
    sed -i 's|location /admin/ {|location /admin {|' nginx/conf.d/cdn-ssl.conf
    sed -i 's|proxy_pass http://frontend/;|proxy_pass http://frontend;|' nginx/conf.d/cdn-ssl.conf
    
    # Root location hinzufügen
    sed -i '/# Health Check/i\    # Root - Frontend\n    location = / {\n        proxy_pass http://frontend;\n        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n' nginx/conf.d/cdn-ssl.conf
    
    echo "✅ cdn-ssl.conf updated"
else
    echo "⚠️  cdn-ssl.conf nicht gefunden - erstelle von Template..."
    source .env
    sed "s/YOUR_DOMAIN_HERE/$CDN_DOMAIN/g" nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf
    echo "✅ cdn-ssl.conf erstellt"
fi

# 2. NGINX Config testen
echo "🧪 Testing NGINX config..."
docker-compose exec nginx-cdn nginx -t

if [ $? -eq 0 ]; then
    echo "✅ NGINX Config valid"
    
    # 3. NGINX neu starten
    echo "🔄 Restarting NGINX..."
    docker-compose restart nginx-cdn
    
    echo ""
    echo "✅ Frontend Routing fixed!"
    echo "🌐 Test: https://$CDN_DOMAIN"
    echo "🌐 Test: https://$CDN_DOMAIN/admin"
else
    echo "❌ NGINX Config invalid!"
    echo "Stelle Backup wieder her..."
    mv nginx/conf.d/cdn-ssl.conf.backup nginx/conf.d/cdn-ssl.conf
fi
