#!/usr/bin/env python3
"""Direct auth test inside backend container"""

from auth import verify_token, create_access_token
from datetime import timedelta

# Create a test token
test_data = {"sub": 1, "role": "admin"}
token = create_access_token(test_data, expires_delta=timedelta(hours=24))

print(f"✅ Created token: {token[:30]}...")

# Try to verify it
try:
    payload = verify_token(token)
    print(f"✅ Token verified successfully!")
    print(f"   Payload: {payload}")
except Exception as e:
    print(f"❌ Token verification failed: {e}")
    print(f"   Type: {type(e)}")
    
    # Try manual decode
    from jose import jwt, JWTError
    from config import settings
    
    print(f"\n🔍 Manual decode attempt:")
    print(f"   JWT_SECRET from settings: {settings.JWT_SECRET[:20]}...")
    
    try:
        manual_payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        print(f"✅ Manual decode worked!")
        print(f"   Payload: {manual_payload}")
    except JWTError as je:
        print(f"❌ Manual decode failed: {je}")

# Test with a real token from login
print(f"\n" + "="*50)
