# Quick Start Guide

## 🚀 Start CDN (Windows)

```bash
# In PowerShell oder CMD
.\start.bat
```

## 🛑 Stop CDN

```bash
.\stop.bat
```

## 📊 Services

Nach dem Start (ca. 30-60 Sekunden):

| Service | URL | Login |
|---------|-----|-------|
| **CDN** | http://localhost | - |
| **Admin UI** | http://localhost:3000 | - |
| **API** | http://localhost:8000/docs | - |
| **MinIO** | http://localhost:9011 | admin/adminpassword123 |
| **Grafana** | http://localhost:3001 | admin/admin |

## ✅ Test CDN

### 1. Upload Test-Bild
```bash
# Via Admin UI: http://localhost:3000/admin/upload
# Oder per API:
curl -X POST http://localhost:8000/api/upload \
  -F "file=@test.jpg" \
  -F "bucket=media"
```

### 2. CDN Test
```bash
# Erste Anfrage (MISS)
curl -I http://localhost/media/test.jpg
# Header: X-Cache-Status: MISS

# Zweite Anfrage (HIT!)
curl -I http://localhost/media/test.jpg
# Header: X-Cache-Status: HIT
```

### 3. Video Streaming Test
```bash
# Video hochladen
curl -X POST http://localhost:8000/api/upload \
  -F "file=@video.mp4" \
  -F "bucket=media"

# Via CDN abrufen mit Range Request
curl -I http://localhost/media/video.mp4 \
  -H "Range: bytes=0-1000000"
```

## 🎯 Features nutzen

### Cache Purge
```bash
# Einzelne Datei
curl -X DELETE "http://localhost:8000/api/purge?path=/media/image.jpg"

# Ganzer Bucket
curl -X DELETE "http://localhost:8000/api/purge/bucket/media"

# Kompletter Cache (VORSICHT!)
curl -X DELETE "http://localhost:8000/api/purge/all?confirm=true"
```

### Statistiken
```bash
# Overview
curl http://localhost:8000/api/stats/overview | json_pp

# Bandwidth
curl http://localhost:8000/api/stats/bandwidth?days=7 | json_pp

# Top Files
curl http://localhost:8000/api/stats/top-files | json_pp
```

## 🔧 Troubleshooting

### Logs anschauen
```bash
# Alle Services
docker-compose logs -f

# Nur NGINX
docker-compose logs -f nginx-cdn

# Nur Backend
docker-compose logs -f backend-api
```

### Service neu starten
```bash
docker-compose restart nginx-cdn
docker-compose restart backend-api
```

### Cache leeren (komplett)
```bash
docker-compose exec nginx-cdn rm -rf /var/cache/nginx/*
docker-compose restart nginx-cdn
```

### Alles neu bauen
```bash
docker-compose down
docker-compose up -d --build
```

## 📈 Monitoring

- **Grafana Dashboard**: http://localhost:3001
  - Login: admin/admin
  - Zeigt: Cache Hit Ratio, Bandwidth, Requests/sec
  
- **Prometheus**: http://localhost:9090
  - Raw Metriken & Queries

## 🔐 Production Checklist

Vor Production Deployment:

1. ✅ Passwörter in `.env` ändern
2. ✅ SSL Zertifikate einrichten
3. ✅ Domain in `config.py` setzen
4. ✅ NGINX SSL Config aktivieren
5. ✅ Firewall Regeln setzen
6. ✅ Backup-Strategie planen

## 📚 Weitere Infos

Siehe [README.md](README.md) für vollständige Dokumentation!
