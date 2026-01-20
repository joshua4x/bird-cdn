#!/bin/bash
# Debug Script für Cloud Server

echo "=== CDN Server Debug ==="
echo ""

# 1. Container Status
echo "1. Laufende Container:"
docker-compose ps
echo ""

# 2. SSL Config Check
echo "2. SSL Konfiguration:"
if [ -f "nginx/conf.d/cdn-ssl.conf" ]; then
    echo "✅ cdn-ssl.conf existiert"
    grep -E "listen 443|ssl_certificate|server_name" nginx/conf.d/cdn-ssl.conf
else
    echo "❌ cdn-ssl.conf FEHLT - SSL NICHT AKTIVIERT!"
    echo "   Lösung: ./activate-ssl.sh ausführen"
fi
echo ""

# 3. Zertifikat Check
echo "3. Let's Encrypt Zertifikat:"
docker-compose exec -T certbot ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "Certbot Container nicht erreichbar"
echo ""

# 4. Frontend Files Check
echo "4. Frontend Dateien:"
docker-compose exec -T nginx-cdn ls -la /usr/share/nginx/html/ 2>/dev/null | head -20
echo ""

# 5. NGINX Config Test
echo "5. NGINX Config Test:"
docker-compose exec -T nginx-cdn nginx -t
echo ""

# 6. Backend Health Check
echo "6. Backend API Health:"
curl -s http://localhost:8000/health || echo "Backend nicht erreichbar"
echo ""

# 7. Letzte NGINX Errors
echo "7. NGINX Error Logs (letzte 30 Zeilen):"
docker-compose logs --tail=30 nginx-cdn | grep -i error
echo ""

# 8. Frontend Container Logs
echo "8. Frontend Container Logs (letzte 20 Zeilen):"
docker-compose logs --tail=20 frontend
echo ""

# 9. Port Check
echo "9. Offene Ports:"
netstat -tlnp | grep -E ':80|:443' || ss -tlnp | grep -E ':80|:443'
echo ""

# 10. .env Check
echo "10. Aktuelle .env Konfiguration:"
grep -E "CDN_DOMAIN|CDN_PROTOCOL|LETSENCRYPT" .env | grep -v "^#"
echo ""

echo "=== Debug Complete ==="
echo ""
echo "Schnelle Checks:"
echo "- SSL aktiviert? → cdn-ssl.conf muss existieren"
echo "- Frontend gebaut? → /usr/share/nginx/html/ muss Dateien enthalten"
echo "- CDN_PROTOCOL=https in .env?"
echo ""
echo "Wenn SSL-Config fehlt: ./activate-ssl.sh"
