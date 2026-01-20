from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "CDN Management API"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://cdn:cdn123@postgres:5432/cdn"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379"
    
    # MinIO (Origin Storage)
    MINIO_ENDPOINT: str = "origin-storage:9000"
    MINIO_ACCESS_KEY: str = "admin"
    MINIO_SECRET_KEY: str = "adminpassword123"
    MINIO_SECURE: bool = False
    MINIO_DEFAULT_BUCKET: str = "media"
    
    # NGINX Cache
    NGINX_CACHE_PATH: str = "/var/cache/nginx/cdn"
    NGINX_THUMB_CACHE_PATH: str = "/var/cache/nginx/thumbnails"
    
    # Security
    API_SECRET_KEY: str = "change-this-in-production-very-secret-key-12345"
    JWT_SECRET: str = "change-this-jwt-secret-key-for-production-67890"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Upload Settings
    MAX_UPLOAD_SIZE: int = 5_000_000_000  # 5GB
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
    ALLOWED_VIDEO_EXTENSIONS: set = {".mp4", ".webm", ".avi", ".mov", ".mkv", ".flv", ".m4v"}
    
    # CDN Settings
    CDN_DOMAIN: str = "localhost"
    CDN_PROTOCOL: str = "http"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
