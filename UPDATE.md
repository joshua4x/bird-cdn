# CDN System Updates

## 🔄 Automatisches Update

Das System kann automatisch Updates von GitHub herunterladen und installieren.

### ⚠️ Wichtiger Hinweis

Das **automatische Update über die Web-UI funktioniert nur, wenn die Anwendung direkt auf dem Host läuft** (nicht in Docker).

Bei der Standard Docker-Installation müssen Updates **manuell** über die bereitgestellten Scripts ausgeführt werden.

## 📦 Manuelle Updates

### Windows

Führe im Projektverzeichnis aus:
```cmd
update.bat
```

### Linux / macOS

Führe im Projektverzeichnis aus:
```bash
chmod +x update.sh
./update.sh
```

## 🔧 Was macht das Update-Script?

Das Update-Script führt automatisch folgende Schritte aus:

1. **Datenbank-Backup** erstellen
   - Backup wird in `./backups/` gespeichert
   - Format: `db_backup_YYYYMMDD_HHMMSS.sql`

2. **Storage-Backup** erstellen
   - Kopie aller hochgeladenen Dateien
   - Gespeichert in `./backups/storage_YYYYMMDD_HHMMSS/`

3. **Git Pull** ausführen
   - Lädt neueste Version von GitHub
   - Zeigt verfügbare Updates an

4. **Frontend neu bauen**
   - `docker-compose build frontend`

5. **Backend neu bauen**
   - `docker-compose build backend-api`

6. **Container neu starten**
   - `docker-compose up -d`

## 💾 Backups

Alle Backups werden automatisch im `./backups/` Verzeichnis gespeichert.

### Backup-Struktur
```
backups/
├── db_backup_20260120_120000.sql
├── db_backup_20260119_150000.sql
├── storage_20260120_120000/
│   └── media/
└── storage_20260119_150000/
    └── media/
```

### Datenbank wiederherstellen
```bash
# Backup in Container kopieren
docker cp backups/db_backup_YYYYMMDD_HHMMSS.sql cdn-postgres:/tmp/restore.sql

# In Datenbank wiederherstellen
docker exec -it cdn-postgres psql -U cdn -d cdndb -f /tmp/restore.sql
```

### Storage wiederherstellen
```bash
# Einfach Verzeichnis zurückkopieren
cp -r backups/storage_YYYYMMDD_HHMMSS/* storage/data/
```

## 🌐 Web-UI Update (nur für Host-Installation)

Wenn die Anwendung **nicht in Docker** läuft:

1. Öffne http://localhost:3000
2. Gehe zu **Settings**
3. Scrolle zu **System Updates**
4. Klicke auf **"Jetzt auf Updates prüfen"**
5. Bei verfügbaren Updates: **"Update jetzt installieren"**

Das System erstellt automatisch Backups und führt das Update durch.

## 🚨 Fehlerbehebung

### "fatal: not a git repository"
- Das Git-Repository fehlt oder ist beschädigt
- Lösung: Projekt neu von GitHub klonen

### "Docker command not found"
- Docker ist nicht installiert oder nicht im PATH
- Lösung: Docker installieren oder PATH anpassen

### Container starten nicht
- Prüfe Logs: `docker-compose logs`
- Ports bereits belegt? Prüfe mit `netstat -an | findstr ":8000"`
- Lösung: Stoppe alte Container oder ändere Ports

### Update schlägt fehl
- Rollback mit Backup:
  ```bash
  # Datenbank wiederherstellen
  docker exec -i cdn-postgres psql -U cdn -d cdndb < backups/db_backup_YYYYMMDD_HHMMSS.sql
  
  # Storage wiederherstellen
  rm -rf storage/data/*
  cp -r backups/storage_YYYYMMDD_HHMMSS/* storage/data/
  
  # Alte Version von Git holen
  git log  # Finde alte Commit-ID
  git reset --hard <commit-id>
  
  # Container neu bauen
  docker-compose build
  docker-compose up -d
  ```

## 📊 Update-Verlauf prüfen

```bash
# Zeige letzte Commits
git log --oneline -10

# Zeige Änderungen zwischen Versionen
git diff HEAD~1 HEAD

# Zeige aktuellen Branch und Status
git status
```

## ⏰ Regelmäßige Updates

Für automatische Updates kannst du einen Cron-Job (Linux) oder Task Scheduler (Windows) einrichten:

### Linux Cron
```bash
# Crontab öffnen
crontab -e

# Jeden Tag um 3 Uhr morgens
0 3 * * * cd /path/to/cdn-tourdiary && ./update.sh >> /var/log/cdn-update.log 2>&1
```

### Windows Task Scheduler
1. Task Scheduler öffnen
2. Neue Aufgabe erstellen
3. Trigger: Täglich um 3:00
4. Aktion: `update.bat` ausführen
5. Arbeitsverzeichnis: Projektpfad

## 📝 Changelog

Alle Änderungen werden im Git-Log dokumentiert:
```bash
git log --pretty=format:"%h - %s (%an, %ar)" --since="1 month ago"
```
