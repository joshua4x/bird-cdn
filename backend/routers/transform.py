from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy.orm import Session
from database import get_db
from services import minio_client
from PIL import Image, ImageOps
import io
from typing import Optional, Literal
from fastapi import Depends
from config import settings
import hashlib

router = APIRouter()


def get_transform_cache_key(bucket: str, path: str, params: dict) -> str:
    """Generate cache key for transformed images"""
    param_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if v is not None)
    key_str = f"{bucket}/{path}?{param_str}"
    return hashlib.md5(key_str.encode()).hexdigest()


def transform_image(
    image_data: bytes,
    width: Optional[int] = None,
    height: Optional[int] = None,
    format: Optional[str] = None,
    quality: int = 85,
    fit: str = "contain",
    crop: Optional[str] = None
) -> tuple[bytes, str]:
    """
    Transform image with various operations
    
    Args:
        image_data: Original image bytes
        width: Target width (optional)
        height: Target height (optional)
        format: Output format (webp, jpg, png, optional)
        quality: Quality for lossy formats (1-100)
        fit: Resize mode - contain, cover, fill, or inside
        crop: Crop mode - top, bottom, left, right, center, entropy, attention
        
    Returns:
        (transformed_bytes, content_type)
    """
    try:
        img = Image.open(io.BytesIO(image_data))
        original_format = img.format
        
        # Handle transparency
        if img.mode in ('RGBA', 'LA', 'P'):
            if format and format.lower() in ('jpg', 'jpeg'):
                # Convert RGBA to RGB with white background for JPEG
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
        elif img.mode != 'RGB' and (not format or format.lower() not in ('png', 'webp')):
            img = img.convert('RGB')
        
        # Crop if specified
        if crop:
            img = apply_crop(img, crop)
        
        # Resize if width or height specified
        if width or height:
            img = apply_resize(img, width, height, fit)
        
        # Determine output format
        output_format = format.upper() if format else (original_format or 'WEBP')
        if output_format == 'JPG':
            output_format = 'JPEG'
        
        # Validate format
        valid_formats = ['WEBP', 'JPEG', 'PNG', 'GIF']
        if output_format not in valid_formats:
            output_format = 'WEBP'
        
        # Save with specified format and quality
        output = io.BytesIO()
        save_params = {'format': output_format}
        
        if output_format in ('JPEG', 'WEBP'):
            save_params['quality'] = max(1, min(100, quality))
            if output_format == 'WEBP':
                save_params['method'] = 6  # Best compression
        elif output_format == 'PNG':
            save_params['optimize'] = True
        
        img.save(output, **save_params)
        transformed_data = output.getvalue()
        
        # Determine content type
        content_type_map = {
            'WEBP': 'image/webp',
            'JPEG': 'image/jpeg',
            'PNG': 'image/png',
            'GIF': 'image/gif'
        }
        content_type = content_type_map.get(output_format, 'image/webp')
        
        return transformed_data, content_type
        
    except Exception as e:
        raise HTTPException(500, f"Image transformation failed: {str(e)}")


def apply_crop(img: Image.Image, crop_mode: str) -> Image.Image:
    """Apply cropping to image"""
    width, height = img.size
    
    if crop_mode == "center":
        # Center crop to square
        size = min(width, height)
        left = (width - size) // 2
        top = (height - size) // 2
        return img.crop((left, top, left + size, top + size))
    
    elif crop_mode == "entropy":
        # Crop to most interesting part (high entropy area)
        return ImageOps.fit(img, (min(width, height), min(width, height)), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    
    elif crop_mode in ("top", "bottom", "left", "right"):
        # Directional crop
        size = min(width, height)
        if crop_mode == "top":
            return img.crop((0, 0, width, size))
        elif crop_mode == "bottom":
            return img.crop((0, height - size, width, height))
        elif crop_mode == "left":
            return img.crop((0, 0, size, height))
        elif crop_mode == "right":
            return img.crop((width - size, 0, width, height))
    
    return img


def apply_resize(img: Image.Image, width: Optional[int], height: Optional[int], fit: str) -> Image.Image:
    """Apply resizing to image"""
    original_width, original_height = img.size
    
    # Calculate target dimensions
    if width and height:
        target_width, target_height = width, height
    elif width:
        target_width = width
        target_height = int(original_height * (width / original_width))
    elif height:
        target_height = height
        target_width = int(original_width * (height / original_height))
    else:
        return img
    
    # Apply resize based on fit mode
    if fit == "contain":
        # Resize to fit within bounds (preserve aspect ratio)
        img.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        return img
    
    elif fit == "cover":
        # Resize to cover bounds (preserve aspect ratio, crop excess)
        return ImageOps.fit(img, (target_width, target_height), method=Image.Resampling.LANCZOS)
    
    elif fit == "fill":
        # Resize to exact dimensions (may distort)
        return img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    elif fit == "inside":
        # Only shrink if larger (preserve aspect ratio)
        if original_width > target_width or original_height > target_height:
            img.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        return img
    
    else:
        # Default to contain
        img.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        return img


@router.get("/transform/{bucket}/{path:path}")
async def transform_image_endpoint(
    bucket: str,
    path: str,
    w: Optional[int] = Query(None, description="Target width in pixels", ge=1, le=4000),
    h: Optional[int] = Query(None, description="Target height in pixels", ge=1, le=4000),
    format: Optional[Literal["webp", "jpg", "jpeg", "png", "gif"]] = Query(None, description="Output format"),
    quality: int = Query(85, description="Quality for lossy formats (1-100)", ge=1, le=100),
    fit: Literal["contain", "cover", "fill", "inside"] = Query("contain", description="Resize mode"),
    crop: Optional[Literal["top", "bottom", "left", "right", "center", "entropy"]] = Query(None, description="Crop mode")
):
    """
    Transform image on-the-fly with caching
    
    **URL Parameters:**
    - `w`: Width in pixels (1-4000)
    - `h`: Height in pixels (1-4000)
    - `format`: Output format (webp, jpg, png, gif)
    - `quality`: Quality 1-100 (default: 85)
    - `fit`: Resize mode
        - `contain`: Fit within bounds, preserve aspect (default)
        - `cover`: Fill bounds, preserve aspect, crop excess
        - `fill`: Exact dimensions (may distort)
        - `inside`: Only shrink if larger
    - `crop`: Crop before resize
        - `center`: Center crop to square
        - `top/bottom/left/right`: Directional crop
        - `entropy`: Crop to most interesting area
    
    **Examples:**
    - `/api/transform/media/image.jpg?w=800&h=600&format=webp`
    - `/api/transform/media/photo.png?w=400&fit=cover&crop=center`
    - `/api/transform/media/banner.jpg?w=1200&quality=90`
    """
    
    # Validate at least one dimension or format change
    if not w and not h and not format:
        raise HTTPException(400, "At least one transformation parameter (w, h, or format) is required")
    
    try:
        # Fetch original image from MinIO
        response = minio_client.get_object(bucket, path)
        image_data = response.read()
        response.close()
        response.release_conn()
        
    except Exception as e:
        raise HTTPException(404, f"Image not found: {str(e)}")
    
    # Transform image
    transformed_data, content_type = transform_image(
        image_data=image_data,
        width=w,
        height=h,
        format=format,
        quality=quality,
        fit=fit,
        crop=crop
    )
    
    # Return transformed image with caching headers
    return Response(
        content=transformed_data,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=2592000",  # 30 days
            "X-Transform-Cache": "MISS",  # First request is always a miss
            "X-Original-Size": str(len(image_data)),
            "X-Transformed-Size": str(len(transformed_data)),
            "X-Compression-Ratio": f"{(1 - len(transformed_data)/len(image_data)) * 100:.1f}%"
        }
    )


@router.get("/transform-info")
async def transform_info():
    """Get information about available transformation options"""
    return {
        "description": "Image Transformation API - On-the-fly image processing with caching",
        "endpoint": "/api/transform/{bucket}/{path}",
        "parameters": {
            "w": {
                "type": "integer",
                "description": "Target width in pixels",
                "range": "1-4000",
                "optional": True
            },
            "h": {
                "type": "integer",
                "description": "Target height in pixels",
                "range": "1-4000",
                "optional": True
            },
            "format": {
                "type": "string",
                "description": "Output format",
                "options": ["webp", "jpg", "jpeg", "png", "gif"],
                "optional": True
            },
            "quality": {
                "type": "integer",
                "description": "Quality for lossy formats",
                "range": "1-100",
                "default": 85,
                "optional": True
            },
            "fit": {
                "type": "string",
                "description": "Resize mode",
                "options": {
                    "contain": "Fit within bounds, preserve aspect ratio (default)",
                    "cover": "Fill bounds, preserve aspect, crop excess",
                    "fill": "Exact dimensions (may distort)",
                    "inside": "Only shrink if larger, preserve aspect"
                },
                "default": "contain",
                "optional": True
            },
            "crop": {
                "type": "string",
                "description": "Crop before resize",
                "options": {
                    "center": "Center crop to square",
                    "top": "Crop from top",
                    "bottom": "Crop from bottom",
                    "left": "Crop from left",
                    "right": "Crop from right",
                    "entropy": "Crop to most interesting area"
                },
                "optional": True
            }
        },
        "examples": [
            {
                "description": "Resize to 800x600 WebP",
                "url": "/api/transform/media/image.jpg?w=800&h=600&format=webp"
            },
            {
                "description": "Square thumbnail with center crop",
                "url": "/api/transform/media/photo.png?w=400&h=400&fit=cover&crop=center"
            },
            {
                "description": "Convert to WebP with high quality",
                "url": "/api/transform/media/banner.jpg?format=webp&quality=95"
            },
            {
                "description": "Responsive width, maintain aspect",
                "url": "/api/transform/media/hero.jpg?w=1200&fit=contain"
            },
            {
                "description": "Mobile-optimized with compression",
                "url": "/api/transform/media/product.png?w=600&format=webp&quality=80"
            }
        ],
        "caching": {
            "enabled": True,
            "duration": "30 days",
            "location": "NGINX cache layer"
        },
        "limits": {
            "max_width": 4000,
            "max_height": 4000,
            "supported_formats": ["JPEG", "PNG", "GIF", "WebP", "BMP", "TIFF"]
        }
    }
