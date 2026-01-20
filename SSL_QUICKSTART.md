# 🚀 SSL Setup - Quick Reference

## 1. Vorbereitung (5 Min)

```bash
# .env bearbeiten
nano .env

# Wichtige Zeilen:
CDN_DOMAIN=cdn.yourdomain.com
CDN_PROTOCOL=http  # Wird automatisch auf https geändert
LETSENCRYPT_EMAIL=your-email@example.com
```

## 2. DNS Setup (10-30 Min)

**Bei deinem Domain-Provider:**

```
Typ: A Record
Name: cdn (oder Subdomain deiner Wahl)
Wert: Deine-Server-IP
TTL: 300 (5 Min) oder Auto
```

**Warten auf DNS-Propagierung:**
```bash
# Prüfen
nslookup cdn.yourdomain.com

# Sollte deine Server-IP zeigen
```

## 3. Firewall öffnen (2 Min)

**Port 80 (HTTP) und 443 (HTTPS) öffnen:**

```bash
# ufw (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Cloud: Security Groups konfigurieren
# AWS/Azure/GCP Console → Inbound Rules
```

## 4. SSL-Setup ausführen (5 Min)

**Linux/Mac:**
```bash
chmod +x ssl-setup.sh
./ssl-setup.sh
```

**Windows:**
```powershell
.\ssl-setup.ps1
```

**Interaktive Prompts:**
1. Email eingeben (falls nicht in .env)
2. Staging-Modus? → **Y** (für ersten Test)
3. Fortfahren? → **Y**
4. Warten (~1-2 Min)

## 5. Production-Zertifikat (2 Min)

**Nach erfolgreichem Staging-Test:**

```bash
# Staging-Cert löschen
rm -rf certbot/conf/live certbot/conf/archive certbot/conf/renewal

# Nochmal ausführen
./ssl-setup.sh
# Bei Staging-Frage: N
```

## 6. Testen (1 Min)

```bash
# HTTPS abrufen
curl https://cdn.yourdomain.com/health

# Im Browser
https://cdn.yourdomain.com/admin/

# SSL-Test
https://www.ssllabs.com/ssltest/analyze.html?d=cdn.yourdomain.com
```

## 7. Backend neu starten (1 Min)

```bash
# Damit URLs auf https:// umgestellt werden
docker-compose restart backend-api
```

---

## Troubleshooting One-Liners

```bash
# DNS-Check
nslookup cdn.yourdomain.com

# Port-Check
nc -zv cdn.yourdomain.com 80
nc -zv cdn.yourdomain.com 443

# Certbot-Logs
docker-compose logs certbot | tail -50

# NGINX-Logs
docker-compose logs nginx-cdn | tail -50

# NGINX-Config testen
docker-compose exec nginx-cdn nginx -t

# Zertifikat-Info
docker-compose run --rm certbot certificates

# Manuelles Renewal
docker-compose run --rm certbot renew
docker-compose restart nginx-cdn

# SSL-Details anzeigen
openssl s_client -connect cdn.yourdomain.com:443 -servername cdn.yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -text
```

---

## Häufige Fehler & Fixes

| Problem | Lösung |
|---------|--------|
| DNS nicht gefunden | Warten (bis 24h), DNS-Eintrag prüfen |
| Challenge failed | Port 80 öffnen, Firewall prüfen |
| Rate limit exceeded | 1 Woche warten oder Staging verwenden |
| Cert not trusted | Staging-Cert aktiv → Production-Cert anfordern |
| NGINX failed to start | `docker-compose exec nginx-cdn nginx -t` |

---

## Wichtige Dateien

```
certbot/
  conf/
    live/cdn.yourdomain.com/
      fullchain.pem  ← SSL-Cert
      privkey.pem    ← Private Key
      chain.pem      ← Certificate Chain
  www/               ← ACME Challenge
  logs/              ← Certbot Logs

nginx/conf.d/
  cdn.conf           ← HTTP Config (+ ACME)
  cdn-ssl.conf       ← HTTPS Config (nach Setup)
  cdn-ssl.conf.template ← Template

.env                 ← Domain & Email hier
```

---

## Auto-Renewal

**Läuft automatisch alle 12h!**

```bash
# Status prüfen
docker-compose logs certbot

# Dry-Run testen
docker-compose run --rm certbot renew --dry-run

# Manuell triggern
docker-compose run --rm certbot renew
```

---

## Timeline

```
┌─────────────────────────────────────────────────────────┐
│ Gesamtdauer: ~30-60 Minuten (inkl. DNS-Propagierung)   │
└─────────────────────────────────────────────────────────┘

[0-5min]   .env konfigurieren
[5-10min]  DNS A-Record erstellen
[10-40min] DNS-Propagierung warten
[40-42min] Firewall konfigurieren
[42-47min] ssl-setup.sh ausführen (Staging)
[47-49min] Staging-Cert löschen, Production-Cert
[49-50min] Backend neu starten
[50-60min] Testen & Verifizieren

🎉 Fertig!
```

---

## Checkliste

- [ ] DNS A-Record erstellt
- [ ] DNS propagiert (nslookup funktioniert)
- [ ] Port 80 + 443 offen (Firewall)
- [ ] .env mit CDN_DOMAIN & EMAIL
- [ ] Docker Services laufen
- [ ] ssl-setup.sh ausgeführt (Staging)
- [ ] Staging-Test erfolgreich
- [ ] Production-Cert angefordert
- [ ] HTTPS funktioniert
- [ ] Backend neu gestartet
- [ ] URLs verwenden https://
- [ ] SSL Labs Test bestanden (A+)

---

## Schnellstart (Copy-Paste)

```bash
# 1. .env konfigurieren
echo "CDN_DOMAIN=cdn.yourdomain.com" >> .env
echo "LETSENCRYPT_EMAIL=your-email@example.com" >> .env

# 2. Services starten
docker-compose up -d

# 3. SSL-Setup
chmod +x ssl-setup.sh && ./ssl-setup.sh

# 4. Backend neu starten
docker-compose restart backend-api

# 5. Test
curl -I https://cdn.yourdomain.com/health
```

🎉 **Done!**
