"""
Prometheus Metrics for CDN API Monitoring
"""
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
import time
from typing import Callable

# === Request Metrics ===
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

REQUEST_IN_PROGRESS = Gauge(
    'http_requests_in_progress',
    'HTTP requests currently in progress',
    ['method', 'endpoint']
)

# === Upload Metrics ===
UPLOAD_COUNT = Counter(
    'cdn_uploads_total',
    'Total file uploads',
    ['file_type', 'bucket']
)

UPLOAD_SIZE_BYTES = Histogram(
    'cdn_upload_size_bytes',
    'Upload file sizes in bytes',
    ['file_type'],
    buckets=[1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824]  # 1KB to 1GB
)

UPLOAD_ERRORS = Counter(
    'cdn_upload_errors_total',
    'Total upload errors',
    ['error_type']
)

# === Authentication Metrics ===
AUTH_REQUESTS = Counter(
    'cdn_auth_requests_total',
    'Total authentication requests',
    ['auth_type', 'status']  # auth_type: jwt, api_key | status: success, failed
)

LOGIN_ATTEMPTS = Counter(
    'cdn_login_attempts_total',
    'Total login attempts',
    ['status']  # success, failed
)

# === Database Metrics ===
DB_QUERY_DURATION = Histogram(
    'cdn_db_query_duration_seconds',
    'Database query duration',
    ['operation'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
)

DB_CONNECTIONS = Gauge(
    'cdn_db_connections_active',
    'Active database connections'
)

# === Storage Metrics ===
STORAGE_OPERATIONS = Counter(
    'cdn_storage_operations_total',
    'MinIO storage operations',
    ['operation', 'status']  # operation: put, get, delete | status: success, error
)

STORAGE_SIZE = Gauge(
    'cdn_storage_total_bytes',
    'Total storage size in bytes',
    ['bucket']
)

# === Cache Metrics ===
CACHE_HITS = Counter(
    'cdn_cache_hits_total',
    'Cache hit count',
    ['cache_type']  # redis, nginx
)

CACHE_MISSES = Counter(
    'cdn_cache_misses_total',
    'Cache miss count',
    ['cache_type']
)

# === API Endpoint Metrics ===
API_ERRORS = Counter(
    'cdn_api_errors_total',
    'API error count',
    ['endpoint', 'error_code']
)

ACTIVE_USERS = Gauge(
    'cdn_active_users',
    'Currently active users'
)

WATERMARK_OPERATIONS = Counter(
    'cdn_watermark_operations_total',
    'Watermark operations',
    ['status']  # applied, failed, skipped
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically track all HTTP requests
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics endpoint itself
        if request.url.path == "/metrics":
            return await call_next(request)
        
        method = request.method
        endpoint = request.url.path
        
        # Track in-progress requests
        REQUEST_IN_PROGRESS.labels(method=method, endpoint=endpoint).inc()
        
        # Track request duration
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            REQUEST_IN_PROGRESS.labels(method=method, endpoint=endpoint).dec()
            raise
        finally:
            duration = time.time() - start_time
            
            # Record metrics
            REQUEST_COUNT.labels(
                method=method,
                endpoint=endpoint,
                status_code=status_code
            ).inc()
            
            REQUEST_DURATION.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
            
            REQUEST_IN_PROGRESS.labels(method=method, endpoint=endpoint).dec()
        
        return response


def metrics_endpoint():
    """
    Expose metrics for Prometheus scraping
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# === Helper Functions ===

def track_upload(file_type: str, bucket: str, file_size: int):
    """Track successful upload"""
    UPLOAD_COUNT.labels(file_type=file_type, bucket=bucket).inc()
    UPLOAD_SIZE_BYTES.labels(file_type=file_type).observe(file_size)

def track_upload_error(error_type: str):
    """Track upload error"""
    UPLOAD_ERRORS.labels(error_type=error_type).inc()

def track_auth(auth_type: str, success: bool):
    """Track authentication attempt"""
    status = "success" if success else "failed"
    AUTH_REQUESTS.labels(auth_type=auth_type, status=status).inc()

def track_login(success: bool):
    """Track login attempt"""
    status = "success" if success else "failed"
    LOGIN_ATTEMPTS.labels(status=status).inc()

def track_storage_operation(operation: str, success: bool):
    """Track MinIO operation"""
    status = "success" if success else "error"
    STORAGE_OPERATIONS.labels(operation=operation, status=status).inc()

def track_cache(hit: bool, cache_type: str = "redis"):
    """Track cache hit/miss"""
    if hit:
        CACHE_HITS.labels(cache_type=cache_type).inc()
    else:
        CACHE_MISSES.labels(cache_type=cache_type).inc()

def track_api_error(endpoint: str, error_code: int):
    """Track API error"""
    API_ERRORS.labels(endpoint=endpoint, error_code=error_code).inc()

def track_watermark(status: str):
    """Track watermark operation"""
    WATERMARK_OPERATIONS.labels(status=status).inc()
