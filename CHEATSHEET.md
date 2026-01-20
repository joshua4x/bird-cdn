# 🎯 CDN Deployment Cheat Sheet

## 🚀 Lokales Development

```powershell
# Starten
.\start.bat

# Stoppen
.\stop.bat

# Logs
docker-compose logs -f

# Einzelnen Service neu starten
docker-compose restart nginx-cdn
docker-compose restart backend-api

# Cache leeren
docker-compose exec nginx-cdn rm -rf /var/cache/nginx/*
docker-compose restart nginx-cdn
```

## 📝 Häufige Aufgaben

### Upload via API
```powershell
# Bild hochladen
curl.exe -X POST http://localhost:8000/api/upload `
  -F "file=@image.jpg" `
  -F "bucket=media" `
  -F "folder=uploads"

# Video hochladen
curl.exe -X POST http://localhost:8000/api/upload `
  -F "file=@video.mp4" `
  -F "bucket=media" `
  -F "folder=videos"
```

### Cache Purge
```powershell
# Einzelne Datei
curl.exe -X DELETE "http://localhost:8000/api/purge?path=/media/image.jpg"

# Ganzer Bucket
curl.exe -X DELETE "http://localhost:8000/api/purge/bucket/media"

# Alles (VORSICHT!)
curl.exe -X DELETE "http://localhost:8000/api/purge/all?confirm=true"
```

### Statistiken abrufen
```powershell
# Overview
curl.exe http://localhost:8000/api/stats/overview

# Bandwidth
curl.exe http://localhost:8000/api/stats/bandwidth?days=7

# Top Files
curl.exe http://localhost:8000/api/stats/top-files?limit=10
```

## 🔧 Konfiguration anpassen

### Cache-Größe ändern
**Datei:** `nginx/nginx.conf`
```nginx
proxy_cache_path /var/cache/nginx/cdn
  max_size=100g;  # von 50g erhöhen
```

### Cache-Dauer ändern
**Datei:** `nginx/conf.d/cdn-locations.conf`
```nginx
# Für Bilder
proxy_cache_valid 200 301 302 60d;  # von 30d auf 60d

# Für Videos
proxy_cache_valid 200 206 301 302 14d;  # von 7d auf 14d
```

### Domain ändern
**Datei:** `.env`
```env
CDN_DOMAIN=cdn.yourdomain.com
```

**Datei:** `backend/config.py`
```python
CDN_PROTOCOL: str = "https"  # von http
```

### SSL aktivieren
**Datei:** `nginx/conf.d/cdn.conf`
```nginx
# SSL Server Block auskommentieren
server {
    listen 443 ssl http2;
    server_name cdn.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ...
}
```

## 🐳 Docker Commands

```powershell
# Status prüfen
docker-compose ps

# Services neu bauen
docker-compose build

# Alles neu starten
docker-compose down
docker-compose up -d --build

# Volumes löschen (VORSICHT - löscht Daten!)
docker-compose down -v

# In Container einsteigen
docker-compose exec nginx-cdn sh
docker-compose exec backend-api bash
docker-compose exec postgres psql -U cdn cdn
```

## 📊 Monitoring

### Grafana
- URL: http://localhost:3001
- Login: admin/admin
- Dashboard: "CDN Overview"

### Prometheus Queries
URL: http://localhost:9090

Nützliche Queries:
```promql
# Request Rate
rate(nginx_http_requests_total[5m])

# Cache Hit Ratio
rate(cdn_cache_hits_total[5m]) / (rate(cdn_cache_hits_total[5m]) + rate(cdn_cache_misses_total[5m])) * 100

# Active Connections
nginx_connections_active
```

## 🔐 Production Setup

### 1. Passwörter ändern
**Datei:** `.env`
```env
MINIO_ROOT_PASSWORD=<starkes-passwort>
DATABASE_URL=postgresql://cdn:<passwort>@postgres:5432/cdn
API_SECRET_KEY=<zufälliger-32-zeichen-key>
JWT_SECRET=<zufälliger-32-zeichen-key>
GF_SECURITY_ADMIN_PASSWORD=<grafana-passwort>
```

### 2. SSL Zertifikate
```bash
# Let's Encrypt auf Server
certbot certonly --standalone -d cdn.yourdomain.com

# Zertifikate kopieren
cp /etc/letsencrypt/live/cdn.yourdomain.com/*.pem ./ssl/

# In docker-compose.yml mounten
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```

### 3. Firewall
```bash
# Nur notwendige Ports öffnen
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 4. Backups
```bash
# PostgreSQL Backup
docker-compose exec postgres pg_dump -U cdn cdn > backup.sql

# MinIO Backup
docker-compose exec origin-storage mc mirror /data /backup

# Restore PostgreSQL
cat backup.sql | docker-compose exec -T postgres psql -U cdn cdn
```

## 🧪 Testing

```powershell
# Automatischer Test
.\test-cdn.ps1

# Manueller Test
# 1. Upload
curl.exe -X POST http://localhost:8000/api/upload -F "file=@test.jpg" -F "bucket=media"

# 2. First Request (MISS)
curl.exe -I http://localhost/media/test.jpg
# → X-Cache-Status: MISS

# 3. Second Request (HIT)
curl.exe -I http://localhost/media/test.jpg
# → X-Cache-Status: HIT

# 4. Range Request (Video)
curl.exe -I http://localhost/media/video.mp4 -H "Range: bytes=0-1000000"
# → 206 Partial Content
```

## 📈 Performance Tuning

### NGINX Worker Processes
**Datei:** `nginx/nginx.conf`
```nginx
worker_processes auto;  # = CPU Cores
worker_connections 4096;  # erhöhen für mehr Traffic
```

### Backend Workers
**Datei:** `backend/Dockerfile`
```dockerfile
CMD ["uvicorn", "main:app", "--workers", "8"]  # von 4 erhöhen
```

### Database Connection Pool
**Datei:** `backend/database.py`
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,      # von 10
    max_overflow=40    # von 20
)
```

## 🆘 Troubleshooting

### Problem: Cache nicht aktiv
```bash
# Cache-Verzeichnis prüfen
docker-compose exec nginx-cdn ls -la /var/cache/nginx/cdn/

# Permissions fixen
docker-compose exec nginx-cdn chown -R nginx:nginx /var/cache/nginx/

# NGINX neu laden
docker-compose exec nginx-cdn nginx -s reload
```

### Problem: Backend startet nicht
```bash
# Logs prüfen
docker-compose logs backend-api

# Datenbank prüfen
docker-compose exec postgres psql -U cdn cdn -c "\dt"

# Neu bauen
docker-compose build backend-api
docker-compose up -d backend-api
```

### Problem: Upload schlägt fehl
```bash
# MinIO prüfen
docker-compose logs origin-storage

# Bucket erstellen
curl.exe -X POST "http://localhost:8000/api/admin/buckets?name=media"

# Permissions prüfen
docker-compose exec backend-api ls -la /tmp
```

### Problem: Hoher Memory-Verbrauch
```bash
# Cache leeren
curl.exe -X DELETE "http://localhost:8000/api/purge/all?confirm=true"

# In nginx.conf: max_size reduzieren
max_size=20g;  # statt 50g
```

## 📞 Weitere Hilfe

- **API Docs**: http://localhost:8000/docs
- **README**: [README.md](README.md)
- **Logs**: `docker-compose logs -f <service>`

---

**Quick Links:**
- Admin UI: http://localhost:3000
- API: http://localhost:8000
- Grafana: http://localhost:3001
- MinIO: http://localhost:9011
