# API Monitoring Dashboard

## 📊 Übersicht

Das API Monitoring Dashboard bietet umfassende Einblicke in die Performance und Nutzung der CDN Backend API.

## 🚀 Features

### Key Metrics (Oben)
- **Request Rate**: Aktuelle Anfragen pro Sekunde
- **P95 Latency**: 95. Perzentil der Antwortzeiten
- **Error Rate**: 5xx Fehler pro Sekunde
- **In-Progress**: Aktuell laufende Anfragen
- **Uploads (1h)**: Anzahl Uploads in der letzten Stunde
- **Storage Size**: Gesamtgröße aller gespeicherten Dateien

### Hauptgraphen

#### 📊 Request Rate by Status Code
- Zeigt Anfragen/Sekunde gruppiert nach HTTP Status Code
- Grün: 2xx (Success)
- Gelb: 4xx (Client Errors)
- Rot: 5xx (Server Errors)

#### ⏱️ Response Time Percentiles
- P50 (Median), P95, P99 Latenz pro Endpoint
- Hilft Performance-Bottlenecks zu identifizieren
- Threshold: Gelb ab 100ms, Rot ab 500ms

#### 🔧 Requests by HTTP Method
- Verteilung GET/POST/PUT/DELETE Anfragen
- Donut-Chart mit Prozentanzeige

#### 📤 Uploads by File Type
- Verteilung der hochgeladenen Dateitypen (image/video)
- Hilft bei Kapazitätsplanung

#### 🔐 Authentication Requests
- Erfolgreiche vs. fehlgeschlagene Auth-Versuche
- JWT und API-Key Authentifizierung getrennt

#### 📊 Upload Bandwidth by File Type
- Bytes/Sekunde pro Dateityp
- Zeigt Netzwerk-Auslastung

#### 💾 MinIO Storage Operations
- PUT/GET/DELETE Operationen zu MinIO
- Success vs. Error Rate
- Überwacht Storage-Backend-Health

#### 🎨 Watermark Operations
- Applied: Erfolgreich angewendete Wasserzeichen
- Failed: Fehlgeschlagene Anwendungen
- Skipped: Übersprungene Operationen

#### ⚡ Cache Hit/Miss Rate
- Redis Cache Performance
- Höhere Hit-Rate = bessere Performance
- Niedrige Hit-Rate = Cache Optimierung nötig

### 📋 Top Endpoints Table
- Zeigt aktivste Endpoints
- Spalten:
  - **Endpoint**: API Pfad
  - **Requests**: Anzahl Anfragen (letzte 5min)
  - **Avg Duration**: Durchschnittliche Antwortzeit
  - **P95 Duration**: 95. Perzentil Antwortzeit

## 🔧 Verfügbare Metriken

### Request Metrics
```
http_requests_total{method, endpoint, status_code}
http_request_duration_seconds{method, endpoint}
http_requests_in_progress{method, endpoint}
```

### Upload Metrics
```
cdn_uploads_total{file_type, bucket}
cdn_upload_size_bytes{file_type}
cdn_upload_errors_total{error_type}
```

### Authentication Metrics
```
cdn_auth_requests_total{auth_type, status}
cdn_login_attempts_total{status}
```

### Storage Metrics
```
cdn_storage_operations_total{operation, status}
cdn_storage_total_bytes{bucket}
```

### Cache Metrics
```
cdn_cache_hits_total{cache_type}
cdn_cache_misses_total{cache_type}
```

### Watermark Metrics
```
cdn_watermark_operations_total{status}
```

### System Metrics
```
cdn_api_errors_total{endpoint, error_code}
cdn_active_users
cdn_db_connections_active
```

## 📥 Zugriff

1. **Grafana Dashboard**: http://localhost:3001
   - Login: `admin` / `admin`
   - Navigiere zu "API Monitoring Dashboard"

2. **Prometheus**: http://localhost:9090
   - Query Interface für custom Queries

3. **Raw Metrics**: http://localhost:8000/metrics
   - Prometheus Exposition Format

## 🎯 Verwendung

### Performance-Analyse
- Suche nach Endpoints mit hoher P95 Latency
- Identifiziere Fehlerquellen über Status Code Verteilung
- Überwache In-Progress Requests für Überlastung

### Kapazitätsplanung
- Upload Bandwidth zeigt benötigte Netzwerkkapazität
- Storage Size für Speicherplanung
- Request Rate für Server-Dimensionierung

### Sicherheitsüberwachung
- Failed Login Attempts für Brute-Force-Erkennung
- Auth Request Patterns für Anomalie-Detektion
- Error Rate Spikes als Incident-Indikator

### Optimierung
- Cache Hit Rate für Cache-Tuning
- Upload Errors für Client-Probleme
- Watermark Failures für Bildverarbeitungs-Issues

## 🔔 Alerting (Optional)

Empfohlene Alerts:
```yaml
# Hohe Error Rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 10
  
# Langsame Responses
- alert: SlowResponses
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
  
# Viele fehlgeschlagene Logins
- alert: LoginBruteForce
  expr: rate(cdn_login_attempts_total{status="failed"}[5m]) > 5
  
# Niedriger Cache Hit Ratio
- alert: LowCacheHitRate
  expr: rate(cdn_cache_hits_total[5m]) / (rate(cdn_cache_hits_total[5m]) + rate(cdn_cache_misses_total[5m])) < 0.7
```

## 📚 Prometheus Query Beispiele

### Durchschnittliche Response Time pro Endpoint
```promql
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

### Request Success Rate (%)
```promql
sum(rate(http_requests_total{status_code=~"2.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

### Top 5 langsamste Endpoints
```promql
topk(5, histogram_quantile(0.95, sum by (endpoint, le) (rate(http_request_duration_seconds_bucket[5m]))))
```

### Upload Fehlerrate (%)
```promql
sum(rate(cdn_upload_errors_total[5m])) / sum(rate(cdn_uploads_total[5m])) * 100
```

### Cache Hit Ratio (%)
```promql
sum(rate(cdn_cache_hits_total[5m])) / (sum(rate(cdn_cache_hits_total[5m])) + sum(rate(cdn_cache_misses_total[5m]))) * 100
```

## 🛠️ Troubleshooting

### Dashboard zeigt keine Daten
1. Prüfe ob Backend läuft: `docker logs cdn-backend`
2. Teste Metrics Endpoint: `curl http://localhost:8000/metrics`
3. Prüfe Prometheus Targets: http://localhost:9090/targets

### Metrics fehlen
1. Backend neu starten: `docker compose restart backend-api`
2. Prometheus Config prüfen: `monitoring/prometheus.yml`
3. Grafana Datasource prüfen: Settings → Data Sources

### Grafana Dashboard lädt nicht
1. Prüfe Grafana Logs: `docker logs cdn-grafana`
2. Dashboard neu importieren: `monitoring/grafana/dashboards/api-monitoring.json`
3. Provisioning-Config prüfen: `monitoring/grafana/dashboards/dashboard.yml`

## 🎨 Customization

### Eigene Panels hinzufügen
1. Bearbeite `monitoring/grafana/dashboards/api-monitoring.json`
2. Oder: Im Grafana UI Dashboard editieren und exportieren

### Neue Metriken hinzufügen
1. Definiere in `backend/metrics.py`
2. Tracke in relevanten Routers
3. Update Dashboard mit neuen Queries

### Refresh-Intervall ändern
- Standard: 10 Sekunden
- Ändern: Dashboard Settings → Time → Refresh

## 📄 Weitere Informationen

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **FastAPI Metrics**: https://github.com/prometheus/client_python
