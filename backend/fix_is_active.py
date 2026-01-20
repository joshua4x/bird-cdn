"""
Fix script: Set is_active=True for all files that have NULL
Run this once to fix existing data.
"""

from database import SessionLocal, engine
from models import UploadedFile
from sqlalchemy import text

def fix_is_active():
    db = SessionLocal()
    try:
        # Count files with NULL is_active
        result = db.execute(text("SELECT COUNT(*) FROM uploaded_files WHERE is_active IS NULL"))
        null_count = result.scalar()
        print(f"Files with is_active=NULL: {null_count}")

        # Update all NULL to True
        if null_count > 0:
            db.execute(text("UPDATE uploaded_files SET is_active = true WHERE is_active IS NULL"))
            db.commit()
            print(f"Fixed {null_count} files - set is_active=True")

        # Verify
        result = db.execute(text("SELECT COUNT(*) FROM uploaded_files WHERE is_active = true"))
        active_count = result.scalar()
        print(f"Total active files now: {active_count}")

    finally:
        db.close()

if __name__ == "__main__":
    fix_is_active()
