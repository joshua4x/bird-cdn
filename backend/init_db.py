"""
Database initialization script
Creates initial admin user and sample API key
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, APIKey
from auth import get_password_hash
from datetime import datetime
import secrets

def init_db():
    """Initialize database with admin user"""
    
    print("🔧 Initializing database...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")
    
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            print("👤 Creating admin user...")
            
            # Simple password for initial setup
            password = "admin123"
            
            admin = User(
                username="admin",
                email="admin@cdn-tourdiary.local",
                hashed_password=get_password_hash(password),
                role="admin",
                is_active=True,
                created_at=datetime.now()
            )
            
            db.add(admin)
            db.commit()
            db.refresh(admin)
            
            print(f"✅ Admin user created!")
            print(f"   Username: admin")
            print(f"   Password: admin123")
            print(f"   ⚠️  CHANGE PASSWORD IN PRODUCTION!")
            
            # Create sample API key
            print("\n🔑 Creating sample API key...")
            
            api_key = f"cdn_{secrets.token_urlsafe(32)}"
            
            api_key_obj = APIKey(
                name="Sample Key - PayloadCMS",
                key=api_key,
                created_by=admin.id,
                is_active=True,
                created_at=datetime.now(),
                expires_at=None
            )
            
            db.add(api_key_obj)
            db.commit()
            
            print(f"✅ API Key created!")
            print(f"   Name: Sample Key - PayloadCMS")
            print(f"   Key: {api_key}")
            print(f"   Save this key - it won't be shown again!")
            
        else:
            print("ℹ️  Admin user already exists")
            print(f"   Username: {admin.username}")
            print(f"   Email: {admin.email}")
        
        print("\n✅ Database initialization complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
