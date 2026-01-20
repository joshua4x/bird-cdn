"""
Enhanced Upload Router with:
- Multi-file upload
- API Key authentication
- Watermark support
- Advanced options
- File listing and deletion
"""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from services import minio_client, ensure_bucket_exists
from models import UploadedFile, WatermarkConfig
from config import settings
from url_helpers import build_cdn_url, build_transform_url, get_thumbnail_url
from auth import get_current_user_or_api_key, require_admin
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import mimetypes
import io
import tempfile
from metrics import (
    track_upload, track_upload_error, track_storage_operation,
    track_watermark
)

router = APIRouter()


def get_file_hash(file_content: bytes) -> str:
    """Generate SHA256 hash for file deduplication"""
    return hashlib.sha256(file_content).hexdigest()[:16]


def convert_image_to_webp(file_content: bytes, quality: int = 85) -> tuple[bytes, int, int]:
    """
    Convert images to WebP format
    Returns: (webp_content, width, height)
    """
    try:
        img = Image.open(io.BytesIO(file_content))
        
        if img.mode in ('RGBA', 'LA', 'P'):
            pass
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        output = io.BytesIO()
        img.save(output, format='WEBP', quality=quality, method=6)
        webp_content = output.getvalue()
        
        width, height = img.size
        
        return webp_content, width, height
    except Exception as e:
        raise HTTPException(500, f"Image conversion failed: {str(e)}")


def apply_watermark(
    image_content: bytes,
    watermark_path: str,
    position: str = "bottom-right",
    opacity: int = 70,
    padding: int = 10
) -> bytes:
    """
    Apply watermark to image from file path
    
    position: top-left, top-right, bottom-left, bottom-right, center
    opacity: 0-100
    """
    try:
        # Open images
        base_image = Image.open(io.BytesIO(image_content))
        
        if base_image.mode != 'RGBA':
            base_image = base_image.convert('RGBA')
        
        # Check if watermark exists
        if not Path(watermark_path).exists():
            raise HTTPException(400, f"Watermark file not found: {watermark_path}")
        
        watermark = Image.open(watermark_path).convert('RGBA')
        
        # Calculate watermark size (max 20% of image width)
        max_wm_width = int(base_image.width * 0.2)
        if watermark.width > max_wm_width:
            ratio = max_wm_width / watermark.width
            new_size = (max_wm_width, int(watermark.height * ratio))
            watermark = watermark.resize(new_size, Image.Resampling.LANCZOS)
        
        # Adjust opacity
        alpha = watermark.split()[3]
        alpha = alpha.point(lambda p: int(p * (opacity / 100)))
        watermark.putalpha(alpha)
        
        # Calculate position
        wm_width, wm_height = watermark.size
        base_width, base_height = base_image.size
        
        if position == "top-left":
            pos = (padding, padding)
        elif position == "top-right":
            pos = (base_width - wm_width - padding, padding)
        elif position == "bottom-left":
            pos = (padding, base_height - wm_height - padding)
        elif position == "bottom-right":
            pos = (base_width - wm_width - padding, base_height - wm_height - padding)
        elif position == "center":
            pos = ((base_width - wm_width) // 2, (base_height - wm_height) // 2)
        else:
            pos = (base_width - wm_width - padding, base_height - wm_height - padding)
        
        # Create transparent layer and paste watermark
        transparent = Image.new('RGBA', base_image.size, (0, 0, 0, 0))
        transparent.paste(watermark, pos, watermark)
        
        # Composite
        watermarked = Image.alpha_composite(base_image, transparent)
        
        # Convert back to RGB if needed
        if watermarked.mode == 'RGBA':
            watermarked = watermarked.convert('RGB')
        
        # Save to bytes
        output = io.BytesIO()
        watermarked.save(output, format='WEBP', quality=85)
        
        return output.getvalue()
        
    except Exception as e:
        raise HTTPException(500, f"Watermark failed: {str(e)}")


def apply_watermark_from_db(
    image_content: bytes,
    watermark_data: bytes,
    position: str = "bottom-right",
    opacity: int = 70,
    scale_percent: int = 20,
    padding: int = 10
) -> bytes:
    """
    Apply watermark to image from database blob
    
    position: top-left, top-right, bottom-left, bottom-right, center
    opacity: 0-100
    scale_percent: size as percentage of image width
    """
    try:
        # Open images
        base_image = Image.open(io.BytesIO(image_content))
        
        if base_image.mode != 'RGBA':
            base_image = base_image.convert('RGBA')
        
        # Load watermark from bytes
        watermark = Image.open(io.BytesIO(watermark_data)).convert('RGBA')
        
        # Calculate watermark size based on scale_percent
        max_wm_width = int(base_image.width * (scale_percent / 100))
        if watermark.width > max_wm_width:
            ratio = max_wm_width / watermark.width
            new_size = (max_wm_width, int(watermark.height * ratio))
            watermark = watermark.resize(new_size, Image.Resampling.LANCZOS)
        
        # Adjust opacity
        alpha = watermark.split()[3]
        alpha = alpha.point(lambda p: int(p * (opacity / 100)))
        watermark.putalpha(alpha)
        
        # Calculate position
        wm_width, wm_height = watermark.size
        base_width, base_height = base_image.size
        
        if position == "top-left":
            pos = (padding, padding)
        elif position == "top-right":
            pos = (base_width - wm_width - padding, padding)
        elif position == "bottom-left":
            pos = (padding, base_height - wm_height - padding)
        elif position == "bottom-right":
            pos = (base_width - wm_width - padding, base_height - wm_height - padding)
        elif position == "center":
            pos = ((base_width - wm_width) // 2, (base_height - wm_height) // 2)
        else:
            pos = (base_width - wm_width - padding, base_height - wm_height - padding)
        
        # Create transparent layer and paste watermark
        transparent = Image.new('RGBA', base_image.size, (0, 0, 0, 0))
        transparent.paste(watermark, pos, watermark)
        
        # Composite
        watermarked = Image.alpha_composite(base_image, transparent)
        
        # Convert back to RGB if needed
        if watermarked.mode == 'RGBA':
            watermarked = watermarked.convert('RGB')
        
        # Save to bytes
        output = io.BytesIO()
        watermarked.save(output, format='WEBP', quality=85)
        
        return output.getvalue()
        
    except Exception as e:
        raise HTTPException(500, f"Watermark failed: {str(e)}")


@router.post("/upload/multi")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    bucket: str = Form(default=settings.MINIO_DEFAULT_BUCKET),
    folder: str = Form(default=""),
    apply_watermark_flag: bool = Form(default=False),
    watermark_position: str = Form(default="bottom-right"),
    auth = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db)
):
    """
    🚀 Multi-file upload endpoint
    
    - Supports JWT token or API key authentication
    - Automatic WebP conversion for images
    - Optional watermark application
    - Batch processing
    
    **Authentication:**
    - Header: `Authorization: Bearer <jwt_token>`
    - OR Header: `X-API-Key: <api_key>`
    """
    
    if not files:
        raise HTTPException(400, "No files provided")
    
    if len(files) > 50:
        raise HTTPException(400, "Maximum 50 files per request")
    
    results = []
    errors = []
    
    # Ensure bucket exists
    ensure_bucket_exists(bucket)
    
    # Get watermark config from database if watermark is enabled
    watermark_data = None
    watermark_config = None
    print(f"[WATERMARK DEBUG] apply_watermark_flag: {apply_watermark_flag}, type: {type(apply_watermark_flag)}")
    
    if apply_watermark_flag:
        watermark_config = db.query(WatermarkConfig).first()
        print(f"[WATERMARK DEBUG] WatermarkConfig query result: {watermark_config}")
        
        if watermark_config:
            print(f"[WATERMARK DEBUG]   has_logo_data: {watermark_config.logo_data is not None}")
            print(f"[WATERMARK DEBUG]   is_active: {watermark_config.is_active}")
            print(f"[WATERMARK DEBUG]   position: {watermark_config.position}")
            print(f"[WATERMARK DEBUG]   opacity: {watermark_config.opacity}")
            print(f"[WATERMARK DEBUG]   scale_percent: {watermark_config.scale_percent}")
            
            if watermark_config.is_active and watermark_config.logo_data:
                watermark_data = watermark_config.logo_data
                print(f"[WATERMARK DEBUG] Watermark data loaded, size: {len(watermark_data)} bytes")
    
    for file in files:
        try:
            # Read file
            file_content = await file.read()
            file_size = len(file_content)
            
            if file_size > settings.MAX_UPLOAD_SIZE:
                errors.append({
                    "filename": file.filename,
                    "error": f"File too large. Max: {settings.MAX_UPLOAD_SIZE} bytes"
                })
                continue
            
            # Validate file type
            file_ext = Path(file.filename).suffix.lower()
            mime_type = mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
            original_ext = file_ext
            
            if file_ext in settings.ALLOWED_IMAGE_EXTENSIONS:
                file_type = "image"
            elif file_ext in settings.ALLOWED_VIDEO_EXTENSIONS:
                file_type = "video"
            else:
                errors.append({
                    "filename": file.filename,
                    "error": f"File type not allowed: {file_ext}"
                })
                continue
            
            # Process images
            width, height = None, None
            if file_type == "image":
                try:
                    # Convert to WebP
                    file_content, width, height = convert_image_to_webp(file_content, quality=85)
                    file_ext = ".webp"
                    mime_type = "image/webp"
                    file_size = len(file_content)
                    
                    # Apply watermark if enabled and available
                    if apply_watermark_flag and watermark_data:
                        print(f"[WATERMARK DEBUG] Applying watermark to {file.filename}")
                        try:
                            file_content = apply_watermark_from_db(
                                file_content,
                                watermark_data,
                                position=watermark_config.position or watermark_position,
                                opacity=int(watermark_config.opacity * 100) if watermark_config.opacity else 70,
                                scale_percent=watermark_config.scale_percent or 20
                            )
                            file_size = len(file_content)
                            print(f"[WATERMARK DEBUG] Watermark applied successfully to {file.filename}")
                            track_watermark("applied")
                        except Exception as e:
                            print(f"[WATERMARK ERROR] Watermark failed for {file.filename}: {e}")
                            track_watermark("failed")
                            import traceback
                            traceback.print_exc()
                    elif apply_watermark_flag:
                        print(f"[WATERMARK DEBUG] Watermark flag set but no watermark data available")
                        track_watermark("skipped")
                    
                except Exception as e:
                    print(f"Image processing failed for {file.filename}, keeping original: {e}")
                    if not width:
                        try:
                            img = Image.open(io.BytesIO(file_content))
                            width, height = img.size
                        except:
                            pass
            
            # Generate unique filename
            file_hash = get_file_hash(file_content)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = f"{timestamp}_{file_hash}{file_ext}"
            
            # Build path
            if folder:
                object_name = f"{folder.strip('/')}/{safe_filename}"
            else:
                object_name = safe_filename
            
            # Upload to MinIO
            from io import BytesIO
            try:
                minio_client.put_object(
                    bucket,
                    object_name,
                    BytesIO(file_content),
                    length=file_size,
                    content_type=mime_type
                )
                track_storage_operation("put", True)
            except Exception as e:
                track_storage_operation("put", False)
                raise
            
            # Build CDN URL
            cdn_url = build_cdn_url(bucket, object_name)
            
            # Save to database
            db_file = UploadedFile(
                filename=safe_filename,
                original_filename=file.filename,
                bucket=bucket,
                path=f"/{bucket}/{object_name}",
                size=file_size,
                mime_type=mime_type,
                file_type=file_type,
                cdn_url=cdn_url,
                width=width,
                height=height,
                created_at=datetime.now(),
                is_active=True  # Explicitly set to ensure it's not NULL
            )
            
            db.add(db_file)
            db.commit()
            db.refresh(db_file)
            
            # Track successful upload
            track_upload(file_type, bucket, file_size)
            
            # Build result
            result = {
                "success": True,
                "file_id": db_file.id,
                "filename": safe_filename,
                "original_filename": file.filename,
                "cdn_url": cdn_url,
                "size": file_size,
                "type": file_type,
                "dimensions": {"width": width, "height": height} if width else None
            }
            
            # Add transform URLs for images
            if file_type == "image":
                result["transform_urls"] = {
                    "thumbnail": get_thumbnail_url(bucket, object_name, size=400),
                    "preview": build_transform_url(bucket, object_name, w=800, format='webp'),
                    "large": build_transform_url(bucket, object_name, w=1600, format='webp'),
                    "original_webp": build_transform_url(bucket, object_name, format='webp', quality=90)
                }
            
            results.append(result)
            
        except Exception as e:
            track_upload_error(str(type(e).__name__))
            errors.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {
        "success": len(results) > 0,
        "uploaded": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors if errors else None
    }


@router.post("/upload")
async def upload_single_file(
    file: UploadFile = File(...),
    bucket: str = Form(default=settings.MINIO_DEFAULT_BUCKET),
    folder: str = Form(default=""),
    apply_watermark_flag: bool = Form(default=False),
    watermark_position: str = Form(default="bottom-right"),
    auth = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db)
):
    """
    Single file upload (delegates to multi-upload)
    
    **Authentication:**
    - Header: `Authorization: Bearer <jwt_token>`
    - OR Header: `X-API-Key: <api_key>`
    """
    
    result = await upload_multiple_files(
        files=[file],
        bucket=bucket,
        folder=folder,
        apply_watermark_flag=apply_watermark_flag,
        watermark_position=watermark_position,
        auth=auth,
        db=db
    )
    
    if result["uploaded"] == 0:
        raise HTTPException(400, result["errors"][0]["error"] if result["errors"] else "Upload failed")
    
    return result["results"][0]


@router.get("/files")
async def list_uploaded_files(
    bucket: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    auth = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db)
):
    """
    List all uploaded files

    **Authentication required**
    """
    # Only show active files
    query = db.query(UploadedFile).filter(UploadedFile.is_active == True)

    if bucket:
        query = query.filter(UploadedFile.bucket == bucket)

    if file_type:
        query = query.filter(UploadedFile.file_type == file_type)
    
    total = query.count()
    files = query.order_by(UploadedFile.created_at.desc()).limit(limit).offset(offset).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "files": files
    }


@router.delete("/files/{file_id}")
async def delete_uploaded_file(
    file_id: int,
    auth = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db)
):
    """
    Delete an uploaded file
    
    **Authentication required**
    """
    file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    
    if not file_record:
        raise HTTPException(404, "File not found")
    
    # Delete from MinIO
    try:
        minio_client.remove_object(file_record.bucket, file_record.path)
    except Exception as e:
        # Continue even if MinIO deletion fails (file might already be gone)
        pass
    
    # Delete from database
    db.delete(file_record)
    db.commit()
    
    return {"message": "File deleted successfully"}

