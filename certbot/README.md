# Certbot / Let's Encrypt Verzeichnis

Dieses Verzeichnis wird automatisch vom `ssl-setup.sh` Script erstellt.

## Struktur

```
certbot/
  conf/          # Let's Encrypt Zertifikate & Config
    live/
      cdn.yourdomain.com/
        fullchain.pem    # Vollständiges Zertifikat
        privkey.pem      # Private Key
        cert.pem         # Nur Zertifikat
        chain.pem        # Certificate Chain
    archive/       # Archiv aller Zertifikat-Versionen
    renewal/       # Auto-Renewal Konfiguration
    
  www/           # ACME Challenge Files (für Certbot)
  logs/          # Certbot Logs
```

## Wichtig

⚠️ **Dieses Verzeichnis enthält sensible Daten (Private Keys)!**

- Nicht in Git committen (ist in .gitignore)
- Backup erstellen für Disaster Recovery
- Berechtigungen schützen (600 für Private Keys)

## Backup

```bash
# Backup erstellen
tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz certbot/conf/

# Backup wiederherstellen
tar -xzf letsencrypt-backup-YYYYMMDD.tar.gz
```

## Generiert von

- `ssl-setup.sh` (Linux/Mac)
- `ssl-setup.ps1` (Windows)
