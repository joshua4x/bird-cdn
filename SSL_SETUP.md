# 🔐 SSL/HTTPS Setup mit Let's Encrypt

## Quick Start

### 1. Domain konfigurieren

**`.env` bearbeiten:**
```env
CDN_DOMAIN=cdn.yourdomain.com
LETSENCRYPT_EMAIL=your-email@example.com
```

### 2. SSL-Setup ausführen

**Linux/Mac:**
```bash
chmod +x ssl-setup.sh
./ssl-setup.sh
```

**Windows:**
```powershell
.\ssl-setup.ps1
```

### 3. Fertig! 🎉

Dein CDN läuft jetzt auf: `https://cdn.yourdomain.com`

---

## Detaillierte Anleitung

### Voraussetzungen

✅ **DNS konfiguriert**: A-Record `cdn.yourdomain.com → Server-IP`  
✅ **Port 80 offen**: Firewall/Security Group erlaubt eingehenden Traffic  
✅ **Docker läuft**: `docker-compose ps` zeigt laufende Services  

### Was macht das Setup-Script?

1. ✅ Prüft `.env` Konfiguration
2. ✅ Fragt Email-Adresse für Let's Encrypt ab
3. ✅ Bietet Staging-Modus für Tests an (empfohlen!)
4. ✅ Prüft DNS-Auflösung
5. ✅ Fordert SSL-Zertifikat über Certbot an
6. ✅ Erstellt HTTPS-Konfiguration für NGINX
7. ✅ Aktualisiert `.env` (CDN_PROTOCOL=https)
8. ✅ Startet NGINX mit neuer Config neu
9. ✅ Aktiviert Auto-Renewal (alle 12h)

### Staging vs. Production

**Staging-Modus (Empfohlen für erste Tests):**
- ✅ Unbegrenzte Versuche
- ✅ Test-Zertifikat (nicht vertraut von Browsern)
- ✅ Perfekt zum Testen der Konfiguration

**Production-Modus:**
- ⚠️ Rate-Limit: 5 Fehlversuche pro Woche
- ✅ Echtes Zertifikat (vertraut von allen Browsern)
- ✅ Verwenden nach erfolgreichem Staging-Test

### Migration von Staging zu Production

```bash
# 1. Staging-Zertifikat löschen
rm -rf certbot/conf/live certbot/conf/archive certbot/conf/renewal

# 2. Setup erneut ausführen (Production-Modus)
./ssl-setup.sh
# Wähle 'N' bei Staging-Frage
```

---

## Manuelle Schritte (falls Script nicht funktioniert)

### 1. Verzeichnisse erstellen

```bash
mkdir -p certbot/www certbot/conf certbot/logs ssl
```

### 2. Services starten

```bash
docker-compose up -d nginx-cdn
```

### 3. Zertifikat anfordern

```bash
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  --staging \
  -d cdn.yourdomain.com
```

### 4. HTTPS-Config aktivieren

```bash
# Domain in Template ersetzen
sed "s/YOUR_DOMAIN_HERE/cdn.yourdomain.com/g" \
  nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf

# NGINX neu laden
docker-compose exec nginx-cdn nginx -t
docker-compose restart nginx-cdn
```

### 5. .env aktualisieren

```bash
# CDN_PROTOCOL auf https setzen
sed -i 's/^CDN_PROTOCOL=.*/CDN_PROTOCOL=https/' .env

# Backend neu starten
docker-compose restart backend-api
```

### 6. Auto-Renewal aktivieren

```bash
docker-compose up -d certbot
```

---

## Troubleshooting

### Problem: "DNS-Auflösung fehlgeschlagen"

**Ursache:** DNS noch nicht propagiert

**Lösung:**
```bash
# DNS prüfen
nslookup cdn.yourdomain.com

# Warten und später nochmal versuchen
```

### Problem: "Challenge failed"

**Ursache:** Port 80 nicht erreichbar

**Lösung:**
1. Firewall-Regeln prüfen
2. Security Groups (AWS/Cloud) konfigurieren
3. Server direkt testen: `curl http://SERVER-IP/.well-known/acme-challenge/test`

### Problem: "Rate limit exceeded"

**Ursache:** Zu viele Fehlversuche im Production-Modus

**Lösung:**
- Warten (1 Woche)
- Oder Staging-Modus verwenden zum Testen

### Problem: "NGINX config test failed"

**Ursache:** Fehler in cdn-ssl.conf

**Lösung:**
```bash
# NGINX-Fehler anzeigen
docker-compose exec nginx-cdn nginx -t

# Config prüfen
cat nginx/conf.d/cdn-ssl.conf
```

### Problem: Browser zeigt "Certificate not trusted"

**Ursache:** Staging-Zertifikat wird verwendet

**Lösung:**
- Staging-Cert löschen und Production-Cert anfordern
- Oder ignorieren (nur für Tests)

---

## Zertifikat-Verwaltung

### Zertifikat erneuern (manuell)

```bash
docker-compose run --rm certbot renew
docker-compose restart nginx-cdn
```

### Zertifikat-Info anzeigen

```bash
docker-compose run --rm certbot certificates
```

### Neues Zertifikat für andere Domain

```bash
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  -d another-domain.com
```

### Zertifikat widerrufen

```bash
docker-compose run --rm certbot revoke \
  --cert-path /etc/letsencrypt/live/cdn.yourdomain.com/cert.pem
```

---

## Auto-Renewal

### Wie funktioniert es?

Der Certbot-Container läuft kontinuierlich und:
- Prüft **alle 12 Stunden** ob Zertifikate erneuert werden müssen
- Erneuert automatisch wenn < 30 Tage gültig
- NGINX wird automatisch neu geladen nach Renewal

### Renewal-Status prüfen

```bash
# Logs ansehen
docker-compose logs certbot

# Nächsten Renewal-Termin anzeigen
docker-compose run --rm certbot renew --dry-run
```

### Renewal testen

```bash
# Dry-Run (simuliert Renewal)
docker-compose run --rm certbot renew --dry-run
```

---

## Monitoring

### SSL-Zertifikat-Status überwachen

**Online-Tools:**
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html)

**Kommandozeile:**
```bash
# Zertifikat-Details anzeigen
openssl s_client -connect cdn.yourdomain.com:443 -servername cdn.yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Ablaufdatum prüfen
echo | openssl s_client -servername cdn.yourdomain.com -connect cdn.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Grafana-Dashboard für SSL

Erstelle ein Dashboard mit:
- Tage bis Zertifikat abläuft
- Renewal-Status
- SSL-Handshake-Zeiten

---

## Sicherheit

### Empfohlene NGINX SSL-Konfiguration

Die bereitgestellte `cdn-ssl.conf.template` verwendet:

✅ **TLS 1.2 & 1.3** (nur moderne Protokolle)  
✅ **Moderne Ciphers** (ECDHE, AES-GCM, ChaCha20)  
✅ **HSTS Header** (Force HTTPS)  
✅ **OCSP Stapling** (Performance)  
✅ **Session Tickets Off** (Perfect Forward Secrecy)  

### SSL Security Score

Mit der Standard-Config erreichst du auf SSL Labs:
- **Rating: A+**
- **Certificate: 100%**
- **Protocol Support: 100%**
- **Key Exchange: 90%**
- **Cipher Strength: 90%**

---

## Best Practices

### 1. Immer Staging zuerst

```bash
# Test mit Staging
./ssl-setup.sh
# Wähle 'Y' für Staging

# Nach erfolgreichem Test: Production
rm -rf certbot/conf/live certbot/conf/archive certbot/conf/renewal
./ssl-setup.sh
# Wähle 'N' für Production
```

### 2. Email-Benachrichtigungen aktiv halten

Let's Encrypt sendet Erinnerungen wenn:
- Zertifikat bald abläuft
- Renewal fehlschlägt
- Wichtige Änderungen anstehen

### 3. Backup von Zertifikaten

```bash
# Backup erstellen
tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz certbot/conf/

# Backup wiederherstellen
tar -xzf letsencrypt-backup-YYYYMMDD.tar.gz
```

### 4. Monitoring einrichten

Überwache:
- Zertifikat-Ablaufdatum
- Renewal-Erfolg/Fehler
- HTTPS-Verfügbarkeit

---

## FAQ

**Q: Kann ich mehrere Domains verwenden?**  
A: Ja, mit `-d domain1.com -d domain2.com` beim Certbot-Aufruf

**Q: Wie viel kostet Let's Encrypt?**  
A: Komplett kostenlos! 🎉

**Q: Wie lange ist ein Zertifikat gültig?**  
A: 90 Tage (automatische Erneuerung nach 60 Tagen)

**Q: Was ist der Unterschied zu kommerziellem SSL?**  
A: Let's Encrypt ist genauso sicher, nur kostenloses Angebot

**Q: Brauche ich ein Wildcard-Zertifikat?**  
A: Nur wenn du `*.yourdomain.com` abdecken willst (DNS-Challenge erforderlich)

**Q: Funktioniert es mit Cloudflare?**  
A: Ja, aber Cloudflare Proxy muss temporär deaktiviert werden (Orange Cloud → Grey Cloud)

---

## Support

Bei Problemen:

1. **Logs prüfen:**
   ```bash
   docker-compose logs certbot
   docker-compose logs nginx-cdn
   ```

2. **NGINX-Config testen:**
   ```bash
   docker-compose exec nginx-cdn nginx -t
   ```

3. **Certbot-Status:**
   ```bash
   docker-compose run --rm certbot certificates
   ```

4. **Community:**
   - [Let's Encrypt Community](https://community.letsencrypt.org/)
   - [Certbot Documentation](https://eff-certbot.readthedocs.io/)

---

## Weiterführende Links

- **Let's Encrypt:** https://letsencrypt.org/
- **Certbot:** https://certbot.eff.org/
- **SSL Labs Test:** https://www.ssllabs.com/ssltest/
- **Mozilla SSL Config Generator:** https://ssl-config.mozilla.org/

---

🎉 **Viel Erfolg mit deinem HTTPS-gesicherten CDN!**
