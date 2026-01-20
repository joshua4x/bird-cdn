"""
Authentication Router
Endpoints for user login, registration, API key management
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, APIKey
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user,
    require_admin
)
import secrets
from metrics import track_login, track_auth

router = APIRouter()


# Request/Response Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class APIKeyCreate(BaseModel):
    name: str
    expires_in_days: Optional[int] = None


class APIKeyResponse(BaseModel):
    id: int
    name: str
    key: str
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register new user (admin only in production)
    """
    
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True,
        created_at=datetime.now()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with username/email and password
    Returns JWT access token
    """
    
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        track_login(False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        track_login(False)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role}
    )
    
    track_login(True)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current logged-in user info"""
    return current_user


@router.post("/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create new API key (admin only)
    For external applications like PayloadCMS
    """
    
    # Generate secure random API key
    api_key = f"cdn_{secrets.token_urlsafe(32)}"
    
    # Calculate expiration
    expires_at = None
    if key_data.expires_in_days:
        expires_at = datetime.now() + timedelta(days=key_data.expires_in_days)
    
    # Create API key
    new_key = APIKey(
        name=key_data.name,
        key=api_key,
        created_by=current_user.id,
        is_active=True,
        created_at=datetime.now(),
        expires_at=expires_at
    )
    
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    return new_key


@router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all API keys (admin only)"""
    
    keys = db.query(APIKey).filter(APIKey.created_by == current_user.id).all()
    
    return {
        "total": len(keys),
        "keys": [
            {
                "id": k.id,
                "name": k.name,
                "key": k.key[:20] + "..." if len(k.key) > 20 else k.key,  # Masked
                "is_active": k.is_active,
                "created_at": k.created_at.isoformat() if k.created_at else None,
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None
            }
            for k in keys
        ]
    }


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete API key (admin only)"""
    
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.created_by == current_user.id
    ).first()
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(key)
    db.commit()
    
    return {"success": True, "message": f"API key '{key.name}' deleted"}


@router.patch("/api-keys/{key_id}/toggle")
async def toggle_api_key(
    key_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Toggle API key active status"""
    
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.created_by == current_user.id
    ).first()
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    key.is_active = not key.is_active
    db.commit()
    
    return {
        "success": True,
        "key_id": key.id,
        "is_active": key.is_active
    }
