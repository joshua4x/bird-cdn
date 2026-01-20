# Bird-CDN Integration Guide

Dokumentation zur Integration des Bird-CDN in externe Anwendungen.

---

## Inhaltsverzeichnis

- [Schnellstart](#schnellstart)
- [Authentifizierung](#authentifizierung)
- [Datei-Upload](#datei-upload)
- [Bild-Transformation](#bild-transformation)
- [Dateiverwaltung](#dateiverwaltung)
- [Fehlerbehandlung](#fehlerbehandlung)
- [Code-Beispiele](#code-beispiele)
- [Best Practices](#best-practices)

---

## Schnellstart

### Base URL

```
Production: https://cdn.deine-domain.de
Lokal:      http://localhost
API:        http://localhost:8000
```

### Grundlegender Ablauf

```
1. API Key vom Admin erhalten
2. Datei hochladen -> CDN URL erhalten
3. CDN URL oder Transform URL in deiner App verwenden
```

### Minimales Beispiel (cURL)

```bash
# Bild hochladen
curl -X POST "http://localhost:8000/api/upload/multi" \
  -H "X-API-Key: cdn_dein_api_key" \
  -F "files=@bild.jpg" \
  -F "bucket=media"

# Antwort enthält cdn_url -> direkt verwendbar
```

---

## Authentifizierung

### API Key (Empfohlen für externe Apps)

Der API Key wird vom CDN-Administrator erstellt und hat das Format `cdn_...`.

**Header-Varianten:**

```bash
# Option 1: X-API-Key Header (empfohlen)
X-API-Key: cdn_abc123def456...

# Option 2: Authorization Bearer
Authorization: Bearer cdn_abc123def456...
```

### Beispiel Request

```bash
curl -X POST "http://localhost:8000/api/upload/multi" \
  -H "X-API-Key: cdn_abc123def456" \
  -F "files=@foto.jpg"
```

### API Key testen

```bash
curl "http://localhost:8000/api/auth/api-keys/test" \
  -H "X-API-Key: cdn_dein_key"

# Erfolg: {"valid": true, "name": "PayloadCMS", ...}
# Fehler: {"detail": "Invalid API key"}
```

---

## Datei-Upload

### Endpoint

```
POST /api/upload/multi
Content-Type: multipart/form-data
```

### Parameter

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `files` | File[] | Ja | Eine oder mehrere Dateien (max. 50) |
| `bucket` | String | Nein | Ziel-Bucket (default: "media") |
| `folder` | String | Nein | Unterordner (z.B. "2024/januar") |
| `apply_watermark_flag` | Boolean | Nein | Wasserzeichen anwenden |
| `watermark_position` | String | Nein | Position: bottom-right, top-left, etc. |

### Unterstützte Dateitypen

**Bilder:**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- Werden automatisch zu WebP konvertiert (außer SVG)

**Videos:**
- `.mp4`, `.webm`, `.avi`, `.mov`, `.mkv`, `.flv`, `.m4v`
- Keine Konvertierung, direkter Upload

### Request Beispiel

```bash
curl -X POST "http://localhost:8000/api/upload/multi" \
  -H "X-API-Key: cdn_dein_key" \
  -F "files=@foto1.jpg" \
  -F "files=@foto2.png" \
  -F "files=@video.mp4" \
  -F "bucket=media" \
  -F "folder=produkte/2024"
```

### Response

```json
{
  "results": [
    {
      "success": true,
      "file_id": 123,
      "filename": "20240120_143022_a1b2c3d4.webp",
      "original_filename": "foto1.jpg",
      "cdn_url": "http://localhost/media/produkte/2024/20240120_143022_a1b2c3d4.webp",
      "size": 45823,
      "type": "image",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "transform_urls": {
        "thumbnail": "http://localhost/api/transform/media/produkte/2024/20240120_143022_a1b2c3d4.webp?w=400&h=400&fit=cover&crop=center&format=webp",
        "preview": "http://localhost/api/transform/media/produkte/2024/20240120_143022_a1b2c3d4.webp?w=800&format=webp",
        "large": "http://localhost/api/transform/media/produkte/2024/20240120_143022_a1b2c3d4.webp?w=1600&format=webp",
        "original_webp": "http://localhost/api/transform/media/produkte/2024/20240120_143022_a1b2c3d4.webp?format=webp&quality=90"
      }
    },
    {
      "success": true,
      "file_id": 124,
      "filename": "20240120_143022_e5f6g7h8.mp4",
      "original_filename": "video.mp4",
      "cdn_url": "http://localhost/media/produkte/2024/20240120_143022_e5f6g7h8.mp4",
      "size": 52428800,
      "type": "video",
      "duration": 120.5
    }
  ],
  "total": 2,
  "successful": 2,
  "failed": 0
}
```

### Fehler Response

```json
{
  "results": [
    {
      "success": false,
      "original_filename": "dokument.pdf",
      "error": "Unsupported file type: .pdf"
    }
  ],
  "total": 1,
  "successful": 0,
  "failed": 1
}
```

---

## Bild-Transformation

Bilder können on-the-fly transformiert werden. Die Transformationen werden gecacht (30 Tage).

### Endpoint

```
GET /api/transform/{bucket}/{pfad}?parameter
```

### Parameter

| Parameter | Typ | Bereich | Beschreibung |
|-----------|-----|---------|--------------|
| `w` | Integer | 1-4000 | Zielbreite in Pixel |
| `h` | Integer | 1-4000 | Zielhöhe in Pixel |
| `format` | String | webp, jpg, png, gif | Ausgabeformat |
| `quality` | Integer | 1-100 | Kompressionsqualität (default: 85) |
| `fit` | String | contain, cover, fill, inside | Resize-Modus |
| `crop` | String | center, top, bottom, left, right, entropy | Crop-Position |

### Fit-Modi

| Modus | Beschreibung |
|-------|--------------|
| `contain` | Passt in Bounds, behält Aspect Ratio (Letterbox) |
| `cover` | Füllt Bounds, behält Aspect Ratio, schneidet Überschuss ab |
| `fill` | Exakte Dimensionen (kann verzerren) |
| `inside` | Verkleinert nur wenn größer, behält Aspect Ratio |

### Beispiele

```bash
# Thumbnail 400x400 (quadratisch, Mitte)
/api/transform/media/bild.webp?w=400&h=400&fit=cover&crop=center

# Vorschau max 800px breit
/api/transform/media/bild.webp?w=800

# Große Version max 1600px
/api/transform/media/bild.webp?w=1600&format=webp&quality=90

# JPEG für ältere Browser
/api/transform/media/bild.webp?w=800&format=jpg&quality=80

# Feste Höhe (z.B. für Banner)
/api/transform/media/bild.webp?h=300&fit=cover
```

### Response Headers

```
Content-Type: image/webp
Cache-Control: public, max-age=2592000
X-Transform-Cache: HIT/MISS
X-Original-Size: 2048576
X-Transformed-Size: 45823
X-Compression-Ratio: 97.76%
```

---

## Dateiverwaltung

### Dateien auflisten

```bash
GET /api/files?bucket=media&type=image&limit=50&offset=0
```

**Parameter:**
| Parameter | Beschreibung |
|-----------|--------------|
| `bucket` | Filter nach Bucket |
| `type` | Filter: "image" oder "video" |
| `limit` | Anzahl Ergebnisse (default: 50) |
| `offset` | Pagination Offset |

**Response:**
```json
{
  "files": [
    {
      "id": 123,
      "filename": "20240120_143022_a1b2c3d4.webp",
      "original_filename": "foto.jpg",
      "bucket": "media",
      "path": "media/produkte/20240120_143022_a1b2c3d4.webp",
      "cdn_url": "http://localhost/media/produkte/20240120_143022_a1b2c3d4.webp",
      "size": 45823,
      "mime_type": "image/webp",
      "file_type": "image",
      "width": 1920,
      "height": 1080,
      "created_at": "2024-01-20T14:30:22Z"
    }
  ],
  "total": 156,
  "limit": 50,
  "offset": 0
}
```

### Einzelne Datei abrufen

```bash
GET /api/files/{file_id}
```

### Datei löschen

```bash
DELETE /api/files/{file_id}
```

---

## Fehlerbehandlung

### HTTP Status Codes

| Code | Bedeutung |
|------|-----------|
| 200 | Erfolg |
| 201 | Erstellt (Upload erfolgreich) |
| 400 | Ungültige Anfrage (z.B. falscher Dateityp) |
| 401 | Nicht authentifiziert |
| 403 | Keine Berechtigung |
| 404 | Nicht gefunden |
| 413 | Datei zu groß (max. 5GB) |
| 429 | Rate Limit überschritten |
| 500 | Server-Fehler |

### Fehler Response Format

```json
{
  "detail": "Fehlerbeschreibung",
  "error_code": "INVALID_FILE_TYPE",
  "path": "/api/upload/multi"
}
```

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| CDN (Bilder/Videos) | 100 req/s |
| API Endpoints | 10 req/s |

Bei Überschreitung: `429 Too Many Requests`

---

## Code-Beispiele

### JavaScript / TypeScript

```typescript
// cdn-client.ts

interface UploadResult {
  success: boolean;
  file_id?: number;
  cdn_url?: string;
  transform_urls?: {
    thumbnail: string;
    preview: string;
    large: string;
  };
  error?: string;
}

interface UploadResponse {
  results: UploadResult[];
  total: number;
  successful: number;
  failed: number;
}

class CDNClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async upload(
    files: File[],
    options: { bucket?: string; folder?: string; watermark?: boolean } = {}
  ): Promise<UploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    if (options.bucket) {
      formData.append('bucket', options.bucket);
    }
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.watermark) {
      formData.append('apply_watermark_flag', 'true');
    }

    const response = await fetch(`${this.baseUrl}/api/upload/multi`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }

  getTransformUrl(
    cdnUrl: string,
    options: { w?: number; h?: number; format?: string; quality?: number; fit?: string; crop?: string }
  ): string {
    // Extrahiere bucket und pfad aus CDN URL
    const url = new URL(cdnUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const bucket = pathParts[0];
    const path = pathParts.slice(1).join('/');

    const params = new URLSearchParams();
    if (options.w) params.set('w', options.w.toString());
    if (options.h) params.set('h', options.h.toString());
    if (options.format) params.set('format', options.format);
    if (options.quality) params.set('quality', options.quality.toString());
    if (options.fit) params.set('fit', options.fit);
    if (options.crop) params.set('crop', options.crop);

    return `${this.baseUrl}/api/transform/${bucket}/${path}?${params.toString()}`;
  }
}

// Verwendung
const cdn = new CDNClient('http://localhost:8000', 'cdn_dein_api_key');

// Upload
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const files = Array.from(fileInput.files || []);

const result = await cdn.upload(files, {
  bucket: 'media',
  folder: 'uploads/2024'
});

console.log('Uploaded:', result.results[0].cdn_url);

// Transform URL generieren
const thumbnailUrl = cdn.getTransformUrl(result.results[0].cdn_url!, {
  w: 400,
  h: 400,
  fit: 'cover',
  crop: 'center'
});
```

### React Hook

```tsx
// useCDNUpload.ts
import { useState, useCallback } from 'react';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  results: any[];
}

export function useCDNUpload(apiKey: string, baseUrl = 'http://localhost:8000') {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    results: [],
  });

  const upload = useCallback(async (
    files: File[],
    options: { bucket?: string; folder?: string } = {}
  ) => {
    setState(s => ({ ...s, uploading: true, progress: 0, error: null }));

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (options.bucket) formData.append('bucket', options.bucket);
    if (options.folder) formData.append('folder', options.folder);

    try {
      const xhr = new XMLHttpRequest();

      const response = await new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setState(s => ({ ...s, progress }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));

        xhr.open('POST', `${baseUrl}/api/upload/multi`);
        xhr.setRequestHeader('X-API-Key', apiKey);
        xhr.send(formData);
      });

      setState(s => ({
        ...s,
        uploading: false,
        progress: 100,
        results: response.results
      }));

      return response;
    } catch (error) {
      setState(s => ({
        ...s,
        uploading: false,
        error: (error as Error).message
      }));
      throw error;
    }
  }, [apiKey, baseUrl]);

  return { ...state, upload };
}

// Verwendung in Komponente
function UploadComponent() {
  const { uploading, progress, error, results, upload } = useCDNUpload('cdn_key');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await upload(files, { bucket: 'media' });
  };

  return (
    <div>
      <input type="file" multiple onChange={handleUpload} disabled={uploading} />
      {uploading && <progress value={progress} max={100} />}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {results.map(r => (
        <img key={r.file_id} src={r.transform_urls?.thumbnail} alt="" />
      ))}
    </div>
  );
}
```

### Python

```python
# cdn_client.py
import requests
from pathlib import Path
from typing import List, Optional, Dict, Any

class CDNClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers['X-API-Key'] = api_key

    def upload(
        self,
        files: List[str],
        bucket: str = 'media',
        folder: Optional[str] = None,
        watermark: bool = False
    ) -> Dict[str, Any]:
        """
        Dateien zum CDN hochladen.

        Args:
            files: Liste von Dateipfaden
            bucket: Ziel-Bucket
            folder: Optionaler Unterordner
            watermark: Wasserzeichen anwenden

        Returns:
            Upload-Ergebnis mit CDN URLs
        """
        file_objects = []
        try:
            for filepath in files:
                path = Path(filepath)
                file_objects.append(
                    ('files', (path.name, open(path, 'rb'), self._get_mime_type(path)))
                )

            data = {'bucket': bucket}
            if folder:
                data['folder'] = folder
            if watermark:
                data['apply_watermark_flag'] = 'true'

            response = self.session.post(
                f'{self.base_url}/api/upload/multi',
                files=file_objects,
                data=data,
                timeout=600  # 10 Minuten für große Dateien
            )
            response.raise_for_status()
            return response.json()

        finally:
            for _, (_, file_obj, _) in file_objects:
                file_obj.close()

    def get_transform_url(
        self,
        cdn_url: str,
        w: Optional[int] = None,
        h: Optional[int] = None,
        format: Optional[str] = None,
        quality: Optional[int] = None,
        fit: Optional[str] = None,
        crop: Optional[str] = None
    ) -> str:
        """Transform URL generieren."""
        from urllib.parse import urlparse, urlencode

        parsed = urlparse(cdn_url)
        path_parts = parsed.path.strip('/').split('/')
        bucket = path_parts[0]
        file_path = '/'.join(path_parts[1:])

        params = {}
        if w: params['w'] = w
        if h: params['h'] = h
        if format: params['format'] = format
        if quality: params['quality'] = quality
        if fit: params['fit'] = fit
        if crop: params['crop'] = crop

        return f'{self.base_url}/api/transform/{bucket}/{file_path}?{urlencode(params)}'

    def list_files(
        self,
        bucket: Optional[str] = None,
        file_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Dateien auflisten."""
        params = {'limit': limit, 'offset': offset}
        if bucket:
            params['bucket'] = bucket
        if file_type:
            params['type'] = file_type

        response = self.session.get(
            f'{self.base_url}/api/files',
            params=params
        )
        response.raise_for_status()
        return response.json()

    def delete_file(self, file_id: int) -> bool:
        """Datei löschen."""
        response = self.session.delete(f'{self.base_url}/api/files/{file_id}')
        return response.status_code == 200

    def _get_mime_type(self, path: Path) -> str:
        """MIME-Type anhand der Dateiendung ermitteln."""
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
        }
        return mime_types.get(path.suffix.lower(), 'application/octet-stream')


# Verwendung
if __name__ == '__main__':
    cdn = CDNClient('http://localhost:8000', 'cdn_dein_api_key')

    # Upload
    result = cdn.upload(
        files=['./foto1.jpg', './foto2.png'],
        bucket='media',
        folder='produkte'
    )

    for file_result in result['results']:
        if file_result['success']:
            print(f"Uploaded: {file_result['cdn_url']}")

            # Thumbnail URL
            thumb = cdn.get_transform_url(
                file_result['cdn_url'],
                w=400, h=400, fit='cover', crop='center'
            )
            print(f"Thumbnail: {thumb}")

    # Dateien auflisten
    files = cdn.list_files(bucket='media', file_type='image')
    print(f"Total files: {files['total']}")
```

### PHP

```php
<?php
// CDNClient.php

class CDNClient {
    private string $baseUrl;
    private string $apiKey;

    public function __construct(string $baseUrl, string $apiKey) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * Dateien zum CDN hochladen
     */
    public function upload(array $filePaths, string $bucket = 'media', ?string $folder = null): array {
        $curl = curl_init();

        $postFields = ['bucket' => $bucket];

        if ($folder) {
            $postFields['folder'] = $folder;
        }

        foreach ($filePaths as $index => $filePath) {
            $postFields["files[$index]"] = new CURLFile($filePath);
        }

        curl_setopt_array($curl, [
            CURLOPT_URL => "{$this->baseUrl}/api/upload/multi",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_HTTPHEADER => [
                "X-API-Key: {$this->apiKey}",
            ],
            CURLOPT_TIMEOUT => 600,
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode !== 200 && $httpCode !== 201) {
            throw new Exception("Upload failed with status $httpCode");
        }

        return json_decode($response, true);
    }

    /**
     * Transform URL generieren
     */
    public function getTransformUrl(
        string $cdnUrl,
        ?int $w = null,
        ?int $h = null,
        ?string $format = null,
        ?int $quality = null,
        ?string $fit = null,
        ?string $crop = null
    ): string {
        $parsed = parse_url($cdnUrl);
        $pathParts = explode('/', trim($parsed['path'], '/'));
        $bucket = $pathParts[0];
        $filePath = implode('/', array_slice($pathParts, 1));

        $params = array_filter([
            'w' => $w,
            'h' => $h,
            'format' => $format,
            'quality' => $quality,
            'fit' => $fit,
            'crop' => $crop,
        ]);

        return "{$this->baseUrl}/api/transform/{$bucket}/{$filePath}?" . http_build_query($params);
    }

    /**
     * Dateien auflisten
     */
    public function listFiles(?string $bucket = null, ?string $type = null, int $limit = 50): array {
        $params = ['limit' => $limit];
        if ($bucket) $params['bucket'] = $bucket;
        if ($type) $params['type'] = $type;

        $url = "{$this->baseUrl}/api/files?" . http_build_query($params);

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ["X-API-Key: {$this->apiKey}"],
        ]);

        $response = curl_exec($curl);
        curl_close($curl);

        return json_decode($response, true);
    }
}

// Verwendung
$cdn = new CDNClient('http://localhost:8000', 'cdn_dein_api_key');

// Upload
$result = $cdn->upload(
    ['/pfad/zu/bild1.jpg', '/pfad/zu/bild2.png'],
    'media',
    'uploads/2024'
);

foreach ($result['results'] as $file) {
    if ($file['success']) {
        echo "CDN URL: " . $file['cdn_url'] . "\n";

        // Thumbnail
        $thumb = $cdn->getTransformUrl($file['cdn_url'], w: 400, h: 400, fit: 'cover');
        echo "Thumbnail: $thumb\n";
    }
}
```

### cURL Beispiele

```bash
# === UPLOAD ===

# Einzelne Datei
curl -X POST "http://localhost:8000/api/upload/multi" \
  -H "X-API-Key: cdn_key" \
  -F "files=@bild.jpg" \
  -F "bucket=media"

# Mehrere Dateien
curl -X POST "http://localhost:8000/api/upload/multi" \
  -H "X-API-Key: cdn_key" \
  -F "files=@bild1.jpg" \
  -F "files=@bild2.png" \
  -F "files=@video.mp4" \
  -F "bucket=media" \
  -F "folder=produkte"

# Mit Wasserzeichen
curl -X POST "http://localhost:8000/api/upload/multi" \
  -H "X-API-Key: cdn_key" \
  -F "files=@bild.jpg" \
  -F "apply_watermark_flag=true" \
  -F "watermark_position=bottom-right"


# === TRANSFORM ===

# Thumbnail herunterladen
curl -o thumb.webp "http://localhost/api/transform/media/bild.webp?w=400&h=400&fit=cover"

# Als JPEG
curl -o preview.jpg "http://localhost/api/transform/media/bild.webp?w=800&format=jpg&quality=80"


# === DATEIEN VERWALTEN ===

# Auflisten
curl "http://localhost:8000/api/files?bucket=media&type=image" \
  -H "X-API-Key: cdn_key"

# Einzelne Datei
curl "http://localhost:8000/api/files/123" \
  -H "X-API-Key: cdn_key"

# Löschen
curl -X DELETE "http://localhost:8000/api/files/123" \
  -H "X-API-Key: cdn_key"


# === API KEY TESTEN ===

curl "http://localhost:8000/api/auth/api-keys/test" \
  -H "X-API-Key: cdn_key"
```

---

## Best Practices

### 1. Responsive Images

Nutze die Transform URLs für responsive Bilder:

```html
<picture>
  <!-- WebP für moderne Browser -->
  <source
    type="image/webp"
    srcset="
      /api/transform/media/bild.webp?w=400&format=webp 400w,
      /api/transform/media/bild.webp?w=800&format=webp 800w,
      /api/transform/media/bild.webp?w=1600&format=webp 1600w
    "
    sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1600px"
  >
  <!-- JPEG Fallback -->
  <source
    type="image/jpeg"
    srcset="
      /api/transform/media/bild.webp?w=400&format=jpg 400w,
      /api/transform/media/bild.webp?w=800&format=jpg 800w,
      /api/transform/media/bild.webp?w=1600&format=jpg 1600w
    "
    sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1600px"
  >
  <img src="/api/transform/media/bild.webp?w=800&format=jpg" alt="Beschreibung">
</picture>
```

### 2. Lazy Loading

```html
<img
  src="/api/transform/media/bild.webp?w=20&quality=10"
  data-src="/api/transform/media/bild.webp?w=800"
  loading="lazy"
  alt="Beschreibung"
>
```

### 3. Thumbnail Grid

```javascript
// Einheitliche Thumbnails für Galerie
const thumbnails = results.map(file => ({
  id: file.file_id,
  src: file.transform_urls.thumbnail, // 400x400 cover
  fullsize: file.cdn_url
}));
```

### 4. Video Poster

```html
<!-- Video mit Vorschaubild aus erstem Frame -->
<video
  poster="/api/transform/media/video-poster.webp?w=800&format=webp"
  controls
>
  <source src="/media/video.mp4" type="video/mp4">
</video>
```

### 5. Fehlerbehandlung

```typescript
async function uploadWithRetry(files: File[], retries = 3): Promise<UploadResponse> {
  for (let i = 0; i < retries; i++) {
    try {
      return await cdn.upload(files);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error('Upload failed after retries');
}
```

### 6. Batch-Upload mit Progress

```typescript
async function uploadBatch(files: File[], onProgress: (p: number) => void) {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const result = await cdn.upload(batch);
    results.push(...result.results);
    onProgress((i + batch.length) / files.length * 100);
  }

  return results;
}
```

---

## Limits & Einschränkungen

| Einschränkung | Wert |
|---------------|------|
| Max. Dateigröße | 5 GB |
| Max. Dateien pro Request | 50 |
| Rate Limit (CDN) | 100 req/s |
| Rate Limit (API) | 10 req/s |
| Transform Cache | 30 Tage |
| Max. Bildbreite/-höhe | 4000 px |

---

## Support

Bei Fragen oder Problemen:
- API Dokumentation: `http://localhost:8000/docs`
- Admin Dashboard: `http://localhost:3000`
