"""
URL Helper Functions für CDN-URLs

Diese Funktionen generieren korrekte URLs basierend auf der Konfiguration
und funktionieren sowohl in Development (localhost) als auch Production (yourdomain.com)
"""

from config import settings


def build_cdn_url(bucket: str, path: str) -> str:
    """
    Build CDN URL für direkte Datei-Zugriffe
    
    Args:
        bucket: Bucket name (z.B. 'media')
        path: Datei-Pfad innerhalb des Buckets
        
    Returns:
        Vollständige CDN-URL (z.B. 'https://cdn.yourdomain.com/media/image.jpg')
        
    Examples:
        >>> build_cdn_url('media', 'uploads/photo.jpg')
        'http://localhost/media/uploads/photo.jpg'
        
        # In Production mit .env: CDN_DOMAIN=cdn.yourdomain.com, CDN_PROTOCOL=https
        'https://cdn.yourdomain.com/media/uploads/photo.jpg'
    """
    # Entferne führendes '/' falls vorhanden
    clean_path = path.lstrip('/')
    
    return f"{settings.CDN_PROTOCOL}://{settings.CDN_DOMAIN}/{bucket}/{clean_path}"


def build_transform_url(bucket: str, path: str, **params) -> str:
    """
    Build CDN Transform-URL für on-the-fly Bildbearbeitung
    
    Args:
        bucket: Bucket name (z.B. 'media')
        path: Datei-Pfad innerhalb des Buckets
        **params: Transform-Parameter (w, h, format, quality, fit, crop)
        
    Returns:
        Vollständige Transform-URL mit Parametern
        
    Examples:
        >>> build_transform_url('media', 'photo.jpg', w=800, format='webp')
        'http://localhost/api/transform/media/photo.jpg?w=800&format=webp'
        
        >>> build_transform_url('media', 'hero.jpg', w=1200, h=600, fit='cover', quality=90)
        'http://localhost/api/transform/media/hero.jpg?w=1200&h=600&fit=cover&quality=90'
        
        # In Production mit .env: CDN_DOMAIN=cdn.yourdomain.com, CDN_PROTOCOL=https
        'https://cdn.yourdomain.com/api/transform/media/photo.jpg?w=800&format=webp'
    """
    # Entferne führendes '/' falls vorhanden
    clean_path = path.lstrip('/')
    
    # Base-URL
    base_url = f"{settings.CDN_PROTOCOL}://{settings.CDN_DOMAIN}/api/transform/{bucket}/{clean_path}"
    
    # Filter None-Werte und erstelle Query-String
    query_params = {k: v for k, v in params.items() if v is not None}
    
    if query_params:
        query_string = "&".join(f"{k}={v}" for k, v in query_params.items())
        return f"{base_url}?{query_string}"
    
    return base_url


def build_origin_url(bucket: str, path: str) -> str:
    """
    Build MinIO Origin-URL (intern, für Backend-Zugriffe)
    
    Args:
        bucket: Bucket name
        path: Datei-Pfad
        
    Returns:
        Interne MinIO-URL
    """
    clean_path = path.lstrip('/')
    protocol = "https" if settings.MINIO_SECURE else "http"
    return f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket}/{clean_path}"


def get_responsive_srcset(bucket: str, path: str, widths: list[int], format: str = "webp") -> str:
    """
    Generate responsive srcset string für <img> srcset-Attribut
    
    Args:
        bucket: Bucket name
        path: Datei-Pfad
        widths: Liste von Breiten (z.B. [400, 800, 1200, 1600])
        format: Output-Format (default: webp)
        
    Returns:
        Srcset-String für HTML
        
    Example:
        >>> get_responsive_srcset('media', 'photo.jpg', [400, 800, 1200])
        'http://localhost/api/transform/media/photo.jpg?w=400&format=webp 400w, 
         http://localhost/api/transform/media/photo.jpg?w=800&format=webp 800w, 
         http://localhost/api/transform/media/photo.jpg?w=1200&format=webp 1200w'
    """
    srcset_parts = []
    for width in widths:
        url = build_transform_url(bucket, path, w=width, format=format)
        srcset_parts.append(f"{url} {width}w")
    
    return ", ".join(srcset_parts)


def get_thumbnail_url(bucket: str, path: str, size: int = 400, crop: str = "center") -> str:
    """
    Shortcut für quadratisches Thumbnail
    
    Args:
        bucket: Bucket name
        path: Datei-Pfad
        size: Größe in Pixeln (default: 400x400)
        crop: Crop-Modus (default: center)
        
    Returns:
        Transform-URL für Thumbnail
    """
    return build_transform_url(bucket, path, w=size, h=size, fit='cover', crop=crop, format='webp')


def get_hero_url(bucket: str, path: str, width: int = 1920, height: int = 1080) -> str:
    """
    Shortcut für Hero/Banner-Bild
    
    Args:
        bucket: Bucket name
        path: Datei-Pfad
        width: Breite (default: 1920)
        height: Höhe (default: 1080)
        
    Returns:
        Transform-URL für Hero-Image
    """
    return build_transform_url(bucket, path, w=width, h=height, fit='cover', format='webp', quality=85)
