from minio import Minio
from config import settings
import redis

# MinIO Client (Origin Storage)
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE
)

# Redis Client
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


def ensure_bucket_exists(bucket_name: str):
    """Erstellt Bucket falls nicht vorhanden"""
    try:
        if not minio_client.bucket_exists(bucket_name):
            minio_client.make_bucket(bucket_name)
            print(f"✅ Bucket '{bucket_name}' created")
            
        # Set bucket policy to public read
        from minio.policy import Policy
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                }
            ]
        }
        import json
        minio_client.set_bucket_policy(bucket_name, json.dumps(policy))
        print(f"✅ Bucket '{bucket_name}' set to public read")
        return True
    except Exception as e:
        print(f"❌ Error creating bucket: {e}")
        return False
