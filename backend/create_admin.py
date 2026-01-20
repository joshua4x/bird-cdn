#!/usr/bin/env python3
"""
Create admin user with correct password hash
"""

from auth import get_password_hash
from models import User
from database import SessionLocal

def create_admin():
    """Create admin user"""
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        
        if admin:
            # Update existing admin password
            admin.hashed_password = get_password_hash("admin123")
            db.commit()
            print("✅ Admin password updated!")
        else:
            # Create new admin
            admin = User(
                username="admin",
                email="admin@cdn-tourdiary.local",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created!")
        
        print(f"Username: admin")
        print(f"Password: admin123")
        print(f"Role: {admin.role}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
