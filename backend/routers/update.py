"""
Update Router - GitHub Updates und System-Updates
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User
import subprocess
import os
import asyncio
from datetime import datetime
import json

router = APIRouter()

# Globaler Update-Status
update_status = {
    "running": False,
    "progress": 0,
    "stage": "",
    "error": None,
    "last_check": None,
    "available_update": None
}


def require_admin(user: User):
    """Prüft ob User Admin ist"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/update/check")
async def check_for_updates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Prüft ob Updates auf GitHub verfügbar sind
    """
    require_admin(current_user)
    
    try:
        # WICHTIG: Git-Befehle müssen auf dem HOST laufen!
        # Der Container hat kein .git Verzeichnis (Volume-Mount)
        # Daher rufen wir den Host über docker exec auf
        
        # Alternative: Prüfe ob wir im Container sind
        is_in_container = os.path.exists('/.dockerenv')
        
        if is_in_container:
            # Im Container: Befehle können nicht ausgeführt werden
            # Gebe hilfreiche Info zurück
            raise HTTPException(
                status_code=503,
                detail="Update-Check funktioniert nur auf dem Host. Bitte verwende das update.sh/update.bat Script manuell."
            )
        
        # Auf dem Host: Normal ausführen
        work_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        result = subprocess.run(
            ["git", "fetch", "origin", "main"],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Vergleiche local mit remote
        result = subprocess.run(
            ["git", "rev-list", "--count", "HEAD..origin/main"],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        commits_behind = int(result.stdout.strip())
        
        # Hole Commit-Details falls Updates vorhanden
        update_info = None
        if commits_behind > 0:
            result = subprocess.run(
                ["git", "log", "--oneline", f"HEAD..origin/main", "--pretty=format:%H|%s|%an|%ad", "--date=short"],
                cwd=work_dir,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split('|')
                    if len(parts) >= 4:
                        commits.append({
                            "hash": parts[0][:7],
                            "message": parts[1],
                            "author": parts[2],
                            "date": parts[3]
                        })
            
            update_info = {
                "available": True,
                "commits_behind": commits_behind,
                "commits": commits
            }
        else:
            update_info = {
                "available": False,
                "commits_behind": 0,
                "commits": []
            }
        
        update_status["last_check"] = datetime.now().isoformat()
        update_status["available_update"] = update_info
        
        return update_info
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="GitHub request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Prüfen: {str(e)}")


@router.post("/update/install")
async def install_update(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Installiert verfügbares Update
    Läuft im Hintergrund um Request nicht zu blocken
    
    HINWEIS: Funktioniert nur auf dem Host, nicht im Container!
    """
    require_admin(current_user)
    
    # Prüfe ob wir im Container sind
    is_in_container = os.path.exists('/.dockerenv')
    
    if is_in_container:
        raise HTTPException(
            status_code=503,
            detail="Updates können nur auf dem Host installiert werden. Bitte verwende ./update.sh oder update.bat"
        )
    
    if update_status["running"]:
        raise HTTPException(status_code=409, detail="Update läuft bereits")
    
    # Starte Update im Hintergrund
    background_tasks.add_task(perform_update)
    
    return {
        "status": "started",
        "message": "Update wurde gestartet. Prüfe Status mit /api/update/status"
    }


@router.get("/update/status")
async def get_update_status(
    current_user: User = Depends(get_current_user)
):
    """
    Gibt den aktuellen Update-Status zurück
    """
    require_admin(current_user)
    return update_status


async def perform_update():
    """
    Führt das Update durch:
    1. Backup der Datenbank
    2. Backup der Storage-Files
    3. Git pull
    4. Docker rebuild
    5. Container restart
    """
    global update_status
    
    update_status["running"] = True
    update_status["progress"] = 0
    update_status["error"] = None
    
    # Working Directory ermitteln
    work_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        # Stage 1: Datenbank Backup
        update_status["stage"] = "Datenbank-Backup erstellen"
        update_status["progress"] = 10
        
        # Erstelle Backup-Verzeichnis im Container
        backup_dir = "/app/backups"
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        db_backup_file = f"{backup_dir}/db_backup_{timestamp}.sql"
        
        # pg_dump über docker exec
        result = subprocess.run(
            [
                "docker", "exec", "cdn-postgres",
                "pg_dump", "-U", "cdn", "-d", "cdn"
            ],
            capture_output=True,
            text=True,
            timeout=120,
            cwd="/app"
        )
        
        if result.returncode == 0:
            with open(db_backup_file, 'w', encoding='utf-8') as f:
                f.write(result.stdout)
        else:
            raise Exception(f"Datenbank-Backup fehlgeschlagen: {result.stderr}")
        
        # Stage 2: Storage Backup
        update_status["stage"] = "Storage-Backup erstellen"
        update_status["progress"] = 30
        
        storage_backup_dir = f"{backup_dir}/storage_{timestamp}"
        subprocess.run(
            ["cp", "-r", "/app/storage/data", storage_backup_dir],
            check=True,
            timeout=120
        )
        
        # Stage 3: Git Pull
        update_status["stage"] = "Updates herunterladen"
        update_status["progress"] = 50
        
        subprocess.run(
            ["git", "pull", "origin", "main"],
            cwd=work_dir,
            check=True,
            timeout=60
        )
        
        # Stage 4: Frontend neu bauen
        update_status["stage"] = "Frontend neu bauen"
        update_status["progress"] = 70
        
        # Docker-compose läuft im Projektroot
        project_root = os.path.dirname(work_dir)
        subprocess.run(
            ["docker-compose", "build", "frontend"],
            cwd=project_root,
            check=True,
            timeout=300
        )
        
        # Stage 5: Backend neu bauen (falls Dockerfile geändert)
        update_status["stage"] = "Backend neu bauen"
        update_status["progress"] = 85
        
        subprocess.run(
            ["docker-compose", "build", "backend-api"],
            cwd=project_root,
            check=True,
            timeout=180
        )
        
        # Stage 6: Container restarten
        update_status["stage"] = "Services neu starten"
        update_status["progress"] = 95
        
        subprocess.run(
            ["docker-compose", "up", "-d"],
            cwd=project_root,
            check=True,
            timeout=120
        )
        
        # Fertig
        update_status["stage"] = "Update abgeschlossen"
        update_status["progress"] = 100
        update_status["running"] = False
        
    except subprocess.TimeoutExpired:
        update_status["error"] = "Timeout während Update"
        update_status["running"] = False
        update_status["progress"] = 0
    except Exception as e:
        update_status["error"] = str(e)
        update_status["running"] = False
        update_status["progress"] = 0


@router.get("/update/backups")
async def list_backups(
    current_user: User = Depends(get_current_user)
):
    """
    Listet alle verfügbaren Backups
    """
    require_admin(current_user)
    
    backup_dir = "/app/backups"
    if not os.path.exists(backup_dir):
        return {"backups": []}
    
    backups = []
    for item in os.listdir(backup_dir):
        item_path = os.path.join(backup_dir, item)
        stat = os.stat(item_path)
        
        backups.append({
            "name": item,
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    
    # Sortiere nach Datum absteigend
    backups.sort(key=lambda x: x["created"], reverse=True)
    
    return {"backups": backups}
