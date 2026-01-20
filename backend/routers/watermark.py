"""
Watermark Configuration Endpoint
Manage watermark settings globally
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_db
from auth import require_admin
from models import WatermarkConfig, User
from typing import Optional

router = APIRouter()


@router.post("/upload")
async def upload_watermark(
    file: UploadFile = File(...),
    position: str = Form("bottom-right"),
    opacity: float = Form(0.7),
    scale_percent: int = Form(20),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Upload watermark logo (PNG recommended)
    Admin only
    """
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    
    if file.content_type != "image/png":
        raise HTTPException(400, "Only PNG files with transparency are supported")
    
    # Read file
    try:
        logo_data = await file.read()
        
        # Check if watermark exists
        watermark = db.query(WatermarkConfig).first()
        
        if watermark:
            # Update existing
            watermark.logo_data = logo_data
            watermark.position = position
            watermark.opacity = opacity
            watermark.scale_percent = scale_percent
            watermark.is_active = True
        else:
            # Create new
            watermark = WatermarkConfig(
                logo_data=logo_data,
                position=position,
                opacity=opacity,
                scale_percent=scale_percent,
                is_active=True
            )
            db.add(watermark)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Watermark uploaded successfully",
            "config": {
                "position": watermark.position,
                "opacity": watermark.opacity,
                "scale_percent": watermark.scale_percent
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Upload failed: {str(e)}")


@router.get("/config")
async def get_watermark_config(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get current watermark configuration"""
    
    watermark = db.query(WatermarkConfig).first()
    
    if not watermark:
        return {
            "has_logo": False,
            "position": "bottom-right",
            "opacity": 0.7,
            "scale_percent": 20,
            "is_active": False
        }
    
    return {
        "has_logo": watermark.logo_data is not None,
        "position": watermark.position,
        "opacity": watermark.opacity,
        "scale_percent": watermark.scale_percent,
        "is_active": watermark.is_active
    }


@router.get("/logo")
async def get_watermark_logo(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get watermark logo image"""
    
    watermark = db.query(WatermarkConfig).first()
    
    if not watermark or not watermark.logo_data:
        raise HTTPException(404, "Watermark logo not found")
    
    return Response(
        content=watermark.logo_data,
        media_type="image/png"
    )


@router.put("/config")
async def update_watermark_config(
    position: str = Form("bottom-right"),
    opacity: float = Form(0.7),
    scale_percent: int = Form(20),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update watermark configuration without changing logo"""
    
    watermark = db.query(WatermarkConfig).first()
    
    if not watermark:
        raise HTTPException(404, "No watermark configured yet")
    
    watermark.position = position
    watermark.opacity = opacity
    watermark.scale_percent = scale_percent
    
    db.commit()
    
    return {
        "success": True,
        "message": "Configuration updated",
        "config": {
            "position": watermark.position,
            "opacity": watermark.opacity,
            "scale_percent": watermark.scale_percent
        }
    }


@router.delete("/")
async def delete_watermark(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete watermark (admin only)"""
    
    watermark = db.query(WatermarkConfig).first()
    
    if not watermark:
        raise HTTPException(404, "Watermark not found")
    
    try:
        db.delete(watermark)
        db.commit()
        
        return {
            "success": True,
            "message": "Watermark deleted"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Delete failed: {str(e)}")


@router.put("/toggle")
async def toggle_watermark(
    is_active: bool = Form(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Enable/disable watermark globally"""
    
    watermark = db.query(WatermarkConfig).first()
    
    if not watermark:
        raise HTTPException(404, "No watermark configured")
    
    watermark.is_active = is_active
    db.commit()
    
    return {
        "success": True,
        "is_active": watermark.is_active
    }
