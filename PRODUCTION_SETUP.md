# 🚀 Production Setup Guide

## Übersicht

Diese Anleitung zeigt, wie Sie das CDN-System in Production mit Ihrer eigenen Domain deployen.

## ✅ Voraussetzungen

- **Domain**: z.B. `cdn.yourdomain.com`
- **SSL-Zertifikat**: Let's Encrypt oder kommerzielles Cert
- **Server**: Min. 2 CPU, 4GB RAM, 100GB Storage
- **Docker** & **Docker Compose** installiert

---

## 1. Domain & DNS Setup

### DNS-Einträge konfigurieren

```
A Record:    cdn.yourdomain.com → Ihre-Server-IP
AAAA Record: cdn.yourdomain.com → Ihre-IPv6-Adresse (optional)
```

**Wichtig:** Warten Sie bis DNS propagiert ist (kann bis 24h dauern, meist schneller)

```bash
# DNS-Propagierung prüfen
nslookup cdn.yourdomain.com
dig cdn.yourdomain.com
```

---

## 2. SSL/TLS-Zertifikat mit Let's Encrypt

### Certbot installieren

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# RHEL/CentOS
sudo yum install certbot
```

### Zertifikat erstellen (Standalone-Modus)

**Wichtig:** Stoppen Sie temporär das CDN, damit Port 80 frei ist:

```bash
cd /path/to/cdn-tourdiary
docker-compose down
```

Dann:

```bash
sudo certbot certonly --standalone \
  -d cdn.yourdomain.com \
  --email your-email@yourdomain.com \
  --agree-tos \
  --no-eff-email
```

Zertifikate werden gespeichert in:
- **Cert**: `/etc/letsencrypt/live/cdn.yourdomain.com/fullchain.pem`
- **Key**: `/etc/letsencrypt/live/cdn.yourdomain.com/privkey.pem`

### Zertifikate ins Projekt kopieren

```bash
# SSL-Verzeichnis erstellen
cd /path/to/cdn-tourdiary
mkdir -p ssl

# Zertifikate kopieren
sudo cp /etc/letsencrypt/live/cdn.yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/cdn.yourdomain.com/privkey.pem ssl/

# Berechtigungen setzen
sudo chown $USER:$USER ssl/*.pem
sudo chmod 644 ssl/fullchain.pem
sudo chmod 600 ssl/privkey.pem
```

---

## 3. Environment-Konfiguration

### .env erstellen/anpassen

```bash
cd /path/to/cdn-tourdiary
cp .env.example .env
nano .env  # oder vi/vim
```

**Kritische Einstellungen für Production:**

```dotenv
# ========================================
# CDN Configuration (WICHTIG!)
# ========================================
CDN_DOMAIN=cdn.yourdomain.com
CDN_PROTOCOL=https

# ========================================
# Security (ZWINGEND ÄNDERN!)
# ========================================
API_SECRET_KEY=your-random-secret-key-min-32-chars-long
JWT_SECRET=another-random-secret-key-for-jwt-tokens

# ========================================
# MinIO Storage
# ========================================
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your-strong-minio-password-here

# ========================================
# Database
# ========================================
POSTGRES_USER=cdn
POSTGRES_PASSWORD=your-strong-database-password
POSTGRES_DB=cdn

# ========================================
# Admin Credentials (Backend-API)
# ========================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-admin-password

# ========================================
# Grafana Monitoring
# ========================================
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=your-grafana-password

# ========================================
# Cache Settings
# ========================================
CDN_CACHE_SIZE=50g
CDN_CACHE_INACTIVE=30d
```

### Secrets generieren

```bash
# Random Secrets generieren (Linux/Mac)
openssl rand -base64 32

# Oder Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Oder PowerShell (Windows)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

---

## 4. NGINX SSL-Konfiguration

### nginx/conf.d/cdn.conf anpassen

Fügen Sie den SSL-Server-Block hinzu:

```nginx
# HTTPS Server
server {
    listen 443 ssl http2;
    server_name cdn.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rest der Konfiguration (Backend API, Transform API, Images, Videos...)
    # ... (bestehende location-Blocks einfügen)
}

# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name cdn.yourdomain.com;
    
    # Let's Encrypt ACME Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Alle anderen Requests zu HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

---

## 5. Docker Compose Production-Setup

### docker-compose.prod.yml verwenden

```bash
# Services starten mit Production-Compose
docker-compose -f docker-compose.prod.yml up -d

# Oder
cp docker-compose.prod.yml docker-compose.yml
docker-compose up -d
```

### Volumes für SSL-Certs in docker-compose.yml

Stelle sicher, dass NGINX auf SSL-Certs zugreifen kann:

```yaml
services:
  nginx-cdn:
    image: nginx:1.25-alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro  # SSL-Zertifikate mounten
      - nginx_cache:/var/cache/nginx
    ports:
      - "80:80"
      - "443:443"  # HTTPS Port öffnen
```

---

## 6. Firewall & Security

### UFW (Ubuntu)

```bash
# Firewall aktivieren
sudo ufw enable

# Benötigte Ports öffnen
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (für Let's Encrypt)
sudo ufw allow 443/tcp     # HTTPS

# Optional: Admin-Ports nur für bestimmte IPs
sudo ufw allow from YOUR_IP to any port 3000  # Frontend Admin
sudo ufw allow from YOUR_IP to any port 3001  # Grafana
sudo ufw allow from YOUR_IP to any port 9090  # Prometheus

# Status prüfen
sudo ufw status
```

### iptables (RHEL/CentOS)

```bash
# HTTP/HTTPS erlauben
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Speichern
sudo service iptables save
```

---

## 7. Admin-User erstellen

```bash
# In Container einsteigen
docker-compose exec backend-api bash

# Admin-User erstellen
python create_admin.py

# Oder direkt
docker-compose exec backend-api python create_admin.py
```

---

## 8. SSL Auto-Renewal (Certbot Cron)

### Renewal-Script erstellen

```bash
sudo nano /etc/cron.d/certbot-renewal
```

**Inhalt:**

```cron
# Certbot Auto-Renewal - täglich um 3:00 Uhr
0 3 * * * root certbot renew --quiet --pre-hook "cd /path/to/cdn-tourdiary && docker-compose stop nginx-cdn" --post-hook "cd /path/to/cdn-tourdiary && docker-compose start nginx-cdn && cp /etc/letsencrypt/live/cdn.yourdomain.com/fullchain.pem /path/to/cdn-tourdiary/ssl/ && cp /etc/letsencrypt/live/cdn.yourdomain.com/privkey.pem /path/to/cdn-tourdiary/ssl/" >> /var/log/certbot-renewal.log 2>&1
```

**Oder einfacher mit Renewal-Hook-Script:**

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-cdn.sh
```

```bash
#!/bin/bash
# CDN SSL Cert Reload Script

CDN_PATH="/path/to/cdn-tourdiary"

# Copy new certs
cp /etc/letsencrypt/live/cdn.yourdomain.com/fullchain.pem $CDN_PATH/ssl/
cp /etc/letsencrypt/live/cdn.yourdomain.com/privkey.pem $CDN_PATH/ssl/

# Reload NGINX
cd $CDN_PATH
docker-compose restart nginx-cdn

echo "$(date): CDN SSL certificates renewed" >> /var/log/cdn-ssl-renewal.log
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-cdn.sh
```

---

## 9. Testing & Verification

### SSL-Konfiguration testen

```bash
# SSL Labs Test (online)
https://www.ssllabs.com/ssltest/analyze.html?d=cdn.yourdomain.com

# Oder mit curl
curl -v https://cdn.yourdomain.com/health

# Zertifikat-Infos anzeigen
openssl s_client -connect cdn.yourdomain.com:443 -servername cdn.yourdomain.com
```

### API-Test mit Production-Domain

```bash
# Health Check
curl https://cdn.yourdomain.com/api/health

# Transform API Info
curl https://cdn.yourdomain.com/api/transform-info

# Upload testen (mit API-Key)
curl -X POST https://cdn.yourdomain.com/api/upload \
  -H "X-API-Key: your-api-key" \
  -F "file=@test-image.jpg" \
  -F "bucket=media"
```

### Backend-URLs überprüfen

Nach dem Upload sollten die URLs automatisch die richtige Domain enthalten:

```json
{
  "success": true,
  "cdn_url": "https://cdn.yourdomain.com/media/image.jpg",
  "transform_urls": {
    "thumbnail": "https://cdn.yourdomain.com/api/transform/media/image.jpg?w=400&h=400&fit=cover&crop=center&format=webp",
    "preview": "https://cdn.yourdomain.com/api/transform/media/image.jpg?w=800&format=webp",
    "large": "https://cdn.yourdomain.com/api/transform/media/image.jpg?w=1600&format=webp"
  }
}
```

✅ **Die URLs passen sich automatisch an Ihre Domain an!**

---

## 10. Monitoring Setup

### Grafana über Reverse Proxy

Für sicheren Zugang zu Grafana, erstellen Sie einen Subdomain:

```
A Record: monitoring.yourdomain.com → Server-IP
```

Oder über Pfad:

```nginx
# In nginx/conf.d/cdn.conf
location /monitoring/ {
    proxy_pass http://grafana:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Zugriff:** https://cdn.yourdomain.com/monitoring/

---

## 11. Backup-Strategie

### Wichtige Daten

- **Datenbank**: PostgreSQL Dumps
- **Storage**: MinIO Buckets
- **Config**: `.env`, SSL-Certs
- **Logs**: Falls persistent gemountet

### Backup-Script

```bash
#!/bin/bash
# CDN Backup Script

BACKUP_DIR="/backups/cdn-tourdiary/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

# Database Backup
docker-compose exec -T postgres pg_dump -U cdn cdn > $BACKUP_DIR/database.sql

# MinIO Backup (mit mc client)
docker-compose exec -T origin-storage mc mirror /data $BACKUP_DIR/minio-data

# Config Backup
cp .env $BACKUP_DIR/
cp -r ssl $BACKUP_DIR/

# Komprimieren
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# Alte Backups löschen (älter als 30 Tage)
find /backups/cdn-tourdiary -name "*.tar.gz" -mtime +30 -delete
```

---

## 12. Performance-Tuning (Optional)

### NGINX Worker Processes

```nginx
# nginx/nginx.conf
worker_processes auto;  # Auto-detect CPU cores
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}
```

### Kernel-Parameter (Linux)

```bash
sudo nano /etc/sysctl.conf
```

```conf
# Network Performance
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_slow_start_after_idle = 0

# Connection Limits
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_local_port_range = 1024 65535

# File Descriptors
fs.file-max = 2097152
```

```bash
sudo sysctl -p
```

---

## 13. Troubleshooting

### Problem: URLs zeigen noch "localhost"

**Lösung:** `.env` überprüfen und Container neu starten:

```bash
# .env prüfen
cat .env | grep CDN_DOMAIN
# Sollte sein: CDN_DOMAIN=cdn.yourdomain.com

# Services neu starten
docker-compose restart backend-api
```

### Problem: SSL-Fehler "Certificate not found"

**Lösung:** Pfade in nginx/conf.d/cdn.conf prüfen:

```bash
# Im Container prüfen
docker-compose exec nginx-cdn ls -la /etc/nginx/ssl/

# Sollte zeigen:
# fullchain.pem
# privkey.pem
```

### Problem: 502 Bad Gateway

**Lösung:** Backend-Logs prüfen:

```bash
docker-compose logs backend-api
```

### Problem: Cache funktioniert nicht

**Lösung:** NGINX-Cache-Verzeichnis prüfen:

```bash
docker-compose exec nginx-cdn ls -la /var/cache/nginx/cdn/
```

---

## 14. Checkliste Production-Deployment

- [ ] Domain registriert & DNS konfiguriert
- [ ] SSL-Zertifikat erstellt (Let's Encrypt)
- [ ] `.env` mit Production-Werten erstellt
- [ ] Alle Secrets geändert (API_SECRET_KEY, JWT_SECRET, Passwörter)
- [ ] `CDN_DOMAIN` und `CDN_PROTOCOL` in `.env` gesetzt
- [ ] SSL-Certs nach `ssl/` kopiert
- [ ] nginx/conf.d/cdn.conf mit HTTPS-Block
- [ ] Firewall konfiguriert (Ports 80, 443)
- [ ] Docker Compose gestartet
- [ ] Admin-User erstellt
- [ ] SSL-Renewal Cron eingerichtet
- [ ] Backup-Script eingerichtet
- [ ] Monitoring (Grafana) zugänglich
- [ ] API-Tests durchgeführt
- [ ] Upload-Test mit Production-URLs
- [ ] Transform-API getestet
- [ ] Cache-Performance verifiziert

---

## 🎉 Fertig!

Ihr CDN ist jetzt in Production und nutzt automatisch Ihre Domain für alle URLs.

**Wichtige URLs:**

- **CDN**: https://cdn.yourdomain.com
- **API-Docs**: https://cdn.yourdomain.com/api/docs
- **Admin-UI**: https://cdn.yourdomain.com/admin/
- **Grafana**: https://cdn.yourdomain.com:3001 (oder via Reverse Proxy)

**Beispiel-URLs nach Upload:**

```
Original: https://cdn.yourdomain.com/media/photo.jpg
Thumbnail: https://cdn.yourdomain.com/api/transform/media/photo.jpg?w=400&h=400&fit=cover
Preview: https://cdn.yourdomain.com/api/transform/media/photo.jpg?w=800&format=webp
```

Alle URLs passen sich automatisch an! 🚀
