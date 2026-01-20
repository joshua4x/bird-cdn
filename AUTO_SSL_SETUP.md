# 🚀 Automatisches SSL-Setup

## Problem gelöst!

Certbot läuft jetzt **automatisch** beim Container-Start und erstellt Zertifikate wenn:
1. Domain in `.env` gesetzt ist
2. Email in `.env` gesetzt ist
3. Noch kein Zertifikat existiert

---

## Schnellstart (3 Schritte)

### 1. `.env` konfigurieren

```bash
# .env bearbeiten
nano .env  # oder notepad .env
```

**Wichtige Zeilen:**
```env
# Domain für CDN (OHNE http:// oder https://)
CDN_DOMAIN=cdn.yourdomain.com

# Email für Let's Encrypt
LETSENCRYPT_EMAIL=your-email@example.com

# Staging-Modus (true = Test, false = Production)
# Empfohlen: Erst true, dann false
LETSENCRYPT_STAGING=true
```

### 2. Services starten

```bash
docker-compose up -d
```

**Das passiert automatisch:**
- ✅ Certbot prüft ob Zertifikat existiert
- ✅ Falls nicht: Erstellt automatisch neues Zertifikat
- ✅ Wartet 10s damit NGINX hochgefahren ist
- ✅ Fordert Zertifikat von Let's Encrypt an
- ✅ Speichert in `certbot/conf/`
- ✅ Startet Auto-Renewal alle 12h

### 3. HTTPS aktivieren

**Nach erfolgreichem Zertifikat:**

```bash
# SSL-Config aktivieren
sed "s/YOUR_DOMAIN_HERE/cdn.yourdomain.com/g" \
    nginx/conf.d/cdn-ssl.conf.template > nginx/conf.d/cdn-ssl.conf

# .env auf HTTPS umstellen
sed -i 's/^CDN_PROTOCOL=.*/CDN_PROTOCOL=https/' .env

# Services neu starten
docker-compose restart nginx-cdn backend-api
```

**Oder Windows (PowerShell):**
```powershell
# SSL-Config aktivieren
(Get-Content nginx\conf.d\cdn-ssl.conf.template) -replace 'YOUR_DOMAIN_HERE','cdn.yourdomain.com' | Set-Content nginx\conf.d\cdn-ssl.conf

# .env auf HTTPS umstellen
(Get-Content .env) -replace '^CDN_PROTOCOL=.*','CDN_PROTOCOL=https' | Set-Content .env

# Services neu starten
docker-compose restart nginx-cdn backend-api
```

---

## Logs prüfen

```bash
# Certbot-Logs live ansehen
docker-compose logs -f certbot

# Nur letzte 50 Zeilen
docker-compose logs certbot | tail -50

# NGINX-Logs
docker-compose logs nginx-cdn | tail -50
```

---

## Status prüfen

```bash
# Prüfe ob Zertifikat existiert
ls -la certbot/conf/live/cdn.yourdomain.com/

# Sollte zeigen:
# fullchain.pem
# privkey.pem
# cert.pem
# chain.pem

# Zertifikat-Details
docker-compose exec certbot certbot certificates
```

---

## Von Staging zu Production

**Nach erfolgreichem Test:**

```bash
# 1. Staging-Zertifikat löschen
rm -rf certbot/conf/live certbot/conf/archive certbot/conf/renewal

# 2. .env auf Production umstellen
sed -i 's/LETSENCRYPT_STAGING=.*/LETSENCRYPT_STAGING=false/' .env

# 3. Certbot neu starten
docker-compose restart certbot

# 4. Logs prüfen
docker-compose logs -f certbot
```

---

## Troubleshooting

### Zertifikat wird nicht erstellt

**Prüfe Logs:**
```bash
docker-compose logs certbot | grep -i error
```

**Häufige Ursachen:**

1. **DNS zeigt nicht auf Server**
   ```bash
   nslookup cdn.yourdomain.com
   # Sollte Server-IP zeigen
   ```

2. **Port 80 nicht erreichbar**
   ```bash
   # Von außen testen
   curl -I http://cdn.yourdomain.com/.well-known/acme-challenge/test
   
   # Firewall prüfen
   sudo ufw status | grep 80
   ```

3. **Domain falsch in .env**
   ```bash
   cat .env | grep CDN_DOMAIN
   # Sollte sein: CDN_DOMAIN=cdn.yourdomain.com
   # NICHT: CDN_DOMAIN=http://cdn.yourdomain.com
   ```

4. **Email falsch in .env**
   ```bash
   cat .env | grep LETSENCRYPT_EMAIL
   # Sollte gültige Email sein
   ```

### Certbot-Container startet nicht

```bash
# Container-Status
docker-compose ps certbot

# Wenn "Exited":
docker-compose logs certbot

# Neu starten
docker-compose restart certbot
```

### "Challenge failed"

**Ursache:** ACME-Challenge kann nicht verifiziert werden

**Lösung:**
```bash
# Prüfe ob NGINX läuft
docker-compose ps nginx-cdn

# Prüfe NGINX-Config
docker-compose exec nginx-cdn nginx -t

# Prüfe ACME-Location
docker-compose exec nginx-cdn cat /etc/nginx/conf.d/cdn.conf | grep acme-challenge
```

---

## Manuelle Alternative

Falls automatisches Setup nicht funktioniert:

```bash
# Manuelles Setup-Script ausführen
./ssl-setup.sh   # Linux/Mac
.\ssl-setup.ps1  # Windows
```

---

## Was ist anders?

**Vorher:**
- ❌ Manuell `ssl-setup.sh` ausführen
- ❌ Komplizierte manuelle Schritte

**Jetzt:**
- ✅ Domain + Email in `.env` eintragen
- ✅ `docker-compose up -d`
- ✅ Fertig! Zertifikat wird automatisch erstellt

---

## Umgebungsvariablen

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `CDN_DOMAIN` | Domain für CDN (ohne Protokoll) | `cdn.yourdomain.com` |
| `LETSENCRYPT_EMAIL` | Email für Let's Encrypt | `admin@yourdomain.com` |
| `LETSENCRYPT_STAGING` | Test-Modus (true/false) | `true` für Tests |

---

## Beispiel .env

```env
# CDN Configuration
CDN_DOMAIN=cdn.yourdomain.com
CDN_PROTOCOL=http  # Erst http, nach SSL-Setup auf https

# Let's Encrypt
LETSENCRYPT_EMAIL=admin@yourdomain.com
LETSENCRYPT_STAGING=true  # Erst true (Test), dann false (Production)

# ... Rest der Config
```

---

## Timeline

```
[0:00] docker-compose up -d
[0:10] Certbot wartet 10s auf NGINX
[0:15] Certbot fordert Zertifikat an
[0:45] Zertifikat erfolgreich erstellt ✅
[0:50] SSL-Config aktivieren (manuell)
[0:55] Services neu starten
[1:00] HTTPS funktioniert! 🎉
```

---

## Checkliste

- [ ] DNS A-Record zeigt auf Server-IP
- [ ] Port 80 + 443 in Firewall offen
- [ ] `CDN_DOMAIN` in `.env` gesetzt
- [ ] `LETSENCRYPT_EMAIL` in `.env` gesetzt
- [ ] `LETSENCRYPT_STAGING=true` für ersten Test
- [ ] `docker-compose up -d` ausgeführt
- [ ] Certbot-Logs geprüft (keine Fehler)
- [ ] Zertifikat existiert in `certbot/conf/live/`
- [ ] SSL-Config aktiviert (`cdn-ssl.conf`)
- [ ] `CDN_PROTOCOL=https` in `.env`
- [ ] NGINX + Backend neu gestartet
- [ ] HTTPS funktioniert: `curl https://cdn.yourdomain.com/health`
- [ ] Staging-Cert durch Production-Cert ersetzt

🎉 **Fertig!**
