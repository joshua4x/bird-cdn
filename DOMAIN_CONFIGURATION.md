# 🌐 Domain-Konfiguration - Beispiel

## Wie funktioniert die automatische Domain-Anpassung?

Das CDN-System verwendet **Konfigurationsvariablen** aus der `.env` Datei, um URLs zu generieren. Diese passen sich automatisch an Ihre Umgebung an.

---

## 📝 Konfiguration

### Development (localhost)

**`.env`:**
```env
CDN_DOMAIN=localhost
CDN_PROTOCOL=http
```

**Generierte URLs:**
```
http://localhost/media/image.jpg
http://localhost/api/transform/media/image.jpg?w=800&format=webp
```

---

### Production (Ihre Domain)

**`.env`:**
```env
CDN_DOMAIN=cdn.yourdomain.com
CDN_PROTOCOL=https
```

**Generierte URLs:**
```
https://cdn.yourdomain.com/media/image.jpg
https://cdn.yourdomain.com/api/transform/media/image.jpg?w=800&format=webp
```

---

## 🔄 Upload-Response-Beispiel

### Request

```bash
curl -X POST https://cdn.yourdomain.com/api/upload \
  -H "X-API-Key: your-api-key" \
  -F "file=@photo.jpg" \
  -F "bucket=media"
```

### Response (Development - localhost)

```json
{
  "success": true,
  "file_id": 42,
  "filename": "20260120_123456_abc123.webp",
  "original_filename": "photo.jpg",
  "bucket": "media",
  "cdn_url": "http://localhost/media/20260120_123456_abc123.webp",
  "size": 245760,
  "type": "image",
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "transform_urls": {
    "thumbnail": "http://localhost/api/transform/media/20260120_123456_abc123.webp?w=400&h=400&fit=cover&crop=center&format=webp",
    "preview": "http://localhost/api/transform/media/20260120_123456_abc123.webp?w=800&format=webp",
    "large": "http://localhost/api/transform/media/20260120_123456_abc123.webp?w=1600&format=webp",
    "original_webp": "http://localhost/api/transform/media/20260120_123456_abc123.webp?format=webp&quality=90"
  }
}
```

### Response (Production - cdn.yourdomain.com)

```json
{
  "success": true,
  "file_id": 42,
  "filename": "20260120_123456_abc123.webp",
  "original_filename": "photo.jpg",
  "bucket": "media",
  "cdn_url": "https://cdn.yourdomain.com/media/20260120_123456_abc123.webp",
  "size": 245760,
  "type": "image",
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "transform_urls": {
    "thumbnail": "https://cdn.yourdomain.com/api/transform/media/20260120_123456_abc123.webp?w=400&h=400&fit=cover&crop=center&format=webp",
    "preview": "https://cdn.yourdomain.com/api/transform/media/20260120_123456_abc123.webp?w=800&format=webp",
    "large": "https://cdn.yourdomain.com/api/transform/media/20260120_123456_abc123.webp?w=1600&format=webp",
    "original_webp": "https://cdn.yourdomain.com/api/transform/media/20260120_123456_abc123.webp?format=webp&quality=90"
  }
}
```

🎯 **Die URLs ändern sich automatisch!**

---

## 🔧 Technische Details

### Backend-Code (url_helpers.py)

```python
from config import settings

def build_cdn_url(bucket: str, path: str) -> str:
    """Baut CDN-URL basierend auf Config"""
    return f"{settings.CDN_PROTOCOL}://{settings.CDN_DOMAIN}/{bucket}/{path}"

def build_transform_url(bucket: str, path: str, **params) -> str:
    """Baut Transform-URL mit Parametern"""
    base = f"{settings.CDN_PROTOCOL}://{settings.CDN_DOMAIN}/api/transform/{bucket}/{path}"
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{base}?{query}"
```

### Upload-Router Verwendung

```python
from url_helpers import build_cdn_url, build_transform_url, get_thumbnail_url

# Nach Upload
cdn_url = build_cdn_url(bucket, object_name)

# Transform-URLs generieren
transform_urls = {
    "thumbnail": get_thumbnail_url(bucket, object_name, size=400),
    "preview": build_transform_url(bucket, object_name, w=800, format='webp'),
    "large": build_transform_url(bucket, object_name, w=1600, format='webp')
}
```

---

## ✅ Vorteile

1. **Keine Code-Änderungen** beim Deployment
2. **Eine `.env` Datei** steuert alles
3. **Automatische URL-Generierung** in allen Endpoints
4. **Test & Production** mit gleicher Codebasis
5. **Einfache Migration** zu neuer Domain

---

## 🚀 Deployment-Schritte

1. **`.env` aktualisieren**
   ```env
   CDN_DOMAIN=cdn.yourdomain.com
   CDN_PROTOCOL=https
   ```

2. **Services neu starten**
   ```bash
   docker-compose restart backend-api
   ```

3. **Fertig!** 🎉
   - Alle neuen Uploads verwenden die neue Domain
   - Alle Transform-URLs verwenden die neue Domain
   - Keine Code-Änderungen nötig

---

## 📱 Frontend-Integration

### React/Next.js Beispiel

```jsx
import { useState } from 'react';

function ImageUpload() {
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'media');

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-API-Key': process.env.NEXT_PUBLIC_CDN_API_KEY },
      body: formData
    });

    const data = await response.json();
    setUploadedImage(data);
  };

  return (
    <div>
      {uploadedImage && (
        <picture>
          {/* Responsive Srcset mit automatischen URLs */}
          <source 
            srcSet={`
              ${uploadedImage.transform_urls.thumbnail} 400w,
              ${uploadedImage.transform_urls.preview} 800w,
              ${uploadedImage.transform_urls.large} 1600w
            `}
            sizes="(max-width: 768px) 100vw, 800px"
          />
          <img 
            src={uploadedImage.cdn_url} 
            alt={uploadedImage.original_filename}
          />
        </picture>
      )}
    </div>
  );
}
```

**In Development:**
```
http://localhost/api/transform/media/image.webp?w=400&format=webp
```

**In Production:**
```
https://cdn.yourdomain.com/api/transform/media/image.webp?w=400&format=webp
```

✨ **Alles funktioniert automatisch!**

---

## 🔍 Debugging

### URLs überprüfen

```bash
# Nach Upload, Response anschauen
curl -X POST http://localhost:8000/api/upload \
  -H "X-API-Key: your-key" \
  -F "file=@test.jpg" | jq '.cdn_url'

# Sollte ausgeben:
# Development: "http://localhost/media/..."
# Production:  "https://cdn.yourdomain.com/media/..."
```

### Config prüfen

```bash
# In Container
docker-compose exec backend-api env | grep CDN

# Sollte zeigen:
# CDN_DOMAIN=cdn.yourdomain.com
# CDN_PROTOCOL=https
```

---

## 💡 Wichtige Hinweise

1. ✅ **URLs sind persistent** - Alte URLs bleiben gültig
2. ✅ **Nur neue Uploads** verwenden die neue Domain
3. ✅ **Transform-API** funktioniert mit allen URLs
4. ⚠️ **DNS-Propagierung** kann bis 24h dauern
5. ⚠️ **SSL-Cert** muss für Domain gültig sein

---

## 📚 Weitere Dokumentation

- **Production-Setup**: Siehe [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)
- **Transform-API**: Siehe [IMAGE_TRANSFORM_API.md](IMAGE_TRANSFORM_API.md)
- **API-Docs**: http://localhost:8000/docs
