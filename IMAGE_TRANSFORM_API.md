# 🖼️ Image Transformation API

## Übersicht

Die Image Transformation API ermöglicht **On-the-fly Bildbearbeitung** mit automatischem Caching. Bilder können in Echtzeit skaliert, zugeschnitten und konvertiert werden, ohne dass vorab verschiedene Versionen gespeichert werden müssen.

## Features

- ✅ **Resize** - Bilder auf beliebige Dimensionen skalieren
- ✅ **Format-Konvertierung** - WebP, JPEG, PNG, GIF
- ✅ **Quality-Kontrolle** - Qualität von 1-100 für verlustbehaftete Formate
- ✅ **Smart Cropping** - Center, Entropy, Directional
- ✅ **Fit-Modes** - Contain, Cover, Fill, Inside
- ✅ **Automatisches Caching** - 30 Tage NGINX-Cache
- ✅ **Transparenz-Support** - RGBA, PNG, WebP

## Endpoint

```
GET /api/transform/{bucket}/{path}
```

## URL-Parameter

| Parameter | Typ     | Beschreibung                          | Beispiel      |
|-----------|---------|---------------------------------------|---------------|
| `w`       | integer | Zielbreite in Pixel (1-4000)          | `w=800`       |
| `h`       | integer | Zielhöhe in Pixel (1-4000)            | `h=600`       |
| `format`  | string  | Ausgabeformat (webp, jpg, png, gif)   | `format=webp` |
| `quality` | integer | Qualität 1-100 (default: 85)          | `quality=90`  |
| `fit`     | string  | Resize-Modus (siehe unten)            | `fit=cover`   |
| `crop`    | string  | Crop-Modus (siehe unten)              | `crop=center` |

### Fit-Modes

| Mode       | Beschreibung                                    | Use Case                    |
|------------|-------------------------------------------------|-----------------------------|
| `contain`  | In Grenzen einpassen, Seitenverhältnis erhalten (default) | Thumbnails, Vorschaubilder  |
| `cover`    | Grenzen füllen, Seitenverhältnis erhalten, Überhang croppen | Hero-Images, Hintergrundbilder |
| `fill`     | Exakte Dimensionen (kann verzerren)             | Icons, Grafiken             |
| `inside`   | Nur verkleinern wenn größer                     | Responsive Bilder           |

### Crop-Modes

| Mode       | Beschreibung                           | Use Case                    |
|------------|----------------------------------------|-----------------------------|
| `center`   | Zentrierter Crop zu Quadrat            | Profilbilder, Thumbnails    |
| `top`      | Von oben croppen                       | Header-Bilder               |
| `bottom`   | Von unten croppen                      | Footer-Bilder               |
| `left`     | Von links croppen                      | Seitenleisten               |
| `right`    | Von rechts croppen                     | Seitenleisten               |
| `entropy`  | Crop zum interessantesten Bereich      | Automatische Bildoptimierung |

## Beispiele

### 1. Responsive Image (800px Breite, WebP)

```
GET /api/transform/media/hero.jpg?w=800&format=webp
```

**Verwendung:**
```html
<img src="https://cdn.yourdomain.com/api/transform/media/hero.jpg?w=800&format=webp" 
     alt="Hero Image">
```

### 2. Square Thumbnail (400x400, center crop)

```
GET /api/transform/media/photo.jpg?w=400&h=400&fit=cover&crop=center
```

**Verwendung:**
```html
<img src="https://cdn.yourdomain.com/api/transform/media/photo.jpg?w=400&h=400&fit=cover&crop=center" 
     alt="Profile Picture" 
     class="rounded-full">
```

### 3. Format-Konvertierung (JPG → WebP mit hoher Qualität)

```
GET /api/transform/media/banner.jpg?format=webp&quality=95
```

### 4. Mobile-Optimized (600px, WebP, komprimiert)

```
GET /api/transform/media/product.png?w=600&format=webp&quality=80
```

### 5. Responsive Srcset

```html
<img 
  src="/api/transform/media/image.jpg?w=800&format=webp"
  srcset="
    /api/transform/media/image.jpg?w=400&format=webp 400w,
    /api/transform/media/image.jpg?w=800&format=webp 800w,
    /api/transform/media/image.jpg?w=1200&format=webp 1200w,
    /api/transform/media/image.jpg?w=1600&format=webp 1600w
  "
  sizes="(max-width: 768px) 100vw, 800px"
  alt="Responsive Image">
```

### 6. Background Cover Image

```
GET /api/transform/media/background.jpg?w=1920&h=1080&fit=cover&format=webp&quality=85
```

**CSS:**
```css
.hero-section {
  background-image: url('/api/transform/media/background.jpg?w=1920&h=1080&fit=cover&format=webp&quality=85');
  background-size: cover;
  background-position: center;
}
```

## Performance & Caching

### NGINX Cache-Layer

- **Cache-Dauer:** 30 Tage
- **Cache-Key:** Vollständige URL inkl. aller Parameter
- **Cache-Status:** Wird in `X-Cache-Status` Header zurückgegeben
  - `MISS` - Erste Anfrage, wird verarbeitet
  - `HIT` - Aus Cache geliefert
  - `EXPIRED` - Cache abgelaufen, wird aktualisiert
  - `BYPASS` - Cache umgangen

### Response Headers

```http
X-Cache-Status: HIT
Cache-Control: public, max-age=2592000
X-Original-Size: 2457600
X-Transformed-Size: 156832
X-Compression-Ratio: 93.6%
Content-Type: image/webp
```

### Erste vs. Nachfolgende Requests

| Request | Processing Time | Source       |
|---------|----------------|--------------|
| 1st     | ~200-500ms     | Backend      |
| 2nd+    | ~5-20ms        | NGINX Cache  |

## Best Practices

### 1. WebP für moderne Browser

```html
<picture>
  <source srcset="/api/transform/media/image.jpg?w=800&format=webp" type="image/webp">
  <img src="/api/transform/media/image.jpg?w=800&format=jpg" alt="Fallback">
</picture>
```

### 2. Lazy Loading für Performance

```html
<img 
  src="/api/transform/media/placeholder.jpg?w=20&quality=50"
  data-src="/api/transform/media/image.jpg?w=800&format=webp"
  loading="lazy"
  alt="Lazy Loaded Image">
```

### 3. Art Direction mit verschiedenen Crops

```html
<picture>
  <!-- Mobile: Square, center crop -->
  <source 
    media="(max-width: 768px)" 
    srcset="/api/transform/media/banner.jpg?w=768&h=768&fit=cover&crop=center&format=webp">
  
  <!-- Desktop: Wide, full image -->
  <source 
    media="(min-width: 769px)" 
    srcset="/api/transform/media/banner.jpg?w=1920&h=600&fit=cover&format=webp">
  
  <img src="/api/transform/media/banner.jpg?w=1200" alt="Banner">
</picture>
```

### 4. Qualitäts-Presets

```javascript
const QUALITY_PRESETS = {
  thumbnail: { w: 200, h: 200, fit: 'cover', format: 'webp', quality: 75 },
  preview: { w: 800, fit: 'contain', format: 'webp', quality: 85 },
  fullsize: { w: 1920, fit: 'inside', format: 'webp', quality: 90 },
  hero: { w: 1920, h: 1080, fit: 'cover', format: 'webp', quality: 85 }
};

function getImageUrl(bucket, path, preset) {
  const params = new URLSearchParams(QUALITY_PRESETS[preset]);
  return `/api/transform/${bucket}/${path}?${params}`;
}
```

## Limits & Constraints

| Limit              | Wert          |
|--------------------|---------------|
| Max Width          | 4000px        |
| Max Height         | 4000px        |
| Supported Formats  | JPEG, PNG, GIF, WebP, BMP, TIFF |
| Output Formats     | WebP, JPEG, PNG, GIF |
| Processing Timeout | 60 Sekunden   |
| Rate Limit         | 100 req/s     |

## API Info Endpoint

```bash
GET /api/transform-info
```

Gibt vollständige Dokumentation über verfügbare Parameter und Beispiele zurück.

```bash
curl http://localhost:8000/api/transform-info
```

## Testing

Siehe `test-transform.ps1` für automatisierte Tests.

```powershell
.\test-transform.ps1
```

## Integration Beispiele

### React Component

```jsx
const ResponsiveImage = ({ bucket, path, alt, sizes }) => {
  const getSrcSet = () => {
    return [400, 800, 1200, 1600]
      .map(w => `/api/transform/${bucket}/${path}?w=${w}&format=webp ${w}w`)
      .join(', ');
  };

  return (
    <img
      src={`/api/transform/${bucket}/${path}?w=800&format=webp`}
      srcSet={getSrcSet()}
      sizes={sizes || "(max-width: 768px) 100vw, 800px"}
      alt={alt}
      loading="lazy"
    />
  );
};
```

### Next.js Image Loader

```javascript
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './cdn-loader.js',
  },
};

// cdn-loader.js
export default function cdnLoader({ src, width, quality }) {
  const url = new URL(`${process.env.NEXT_PUBLIC_CDN_URL}/api/transform${src}`);
  url.searchParams.set('w', width.toString());
  url.searchParams.set('format', 'webp');
  if (quality) url.searchParams.set('quality', quality.toString());
  return url.href;
}
```

## Monitoring

Transformation-Requests werden in Prometheus-Metriken erfasst:

```promql
# Request Rate
rate(http_requests_total{endpoint="/api/transform"}[5m])

# Cache Hit Ratio
sum(rate(http_requests_total{endpoint="/api/transform", cache_status="HIT"}[5m])) 
/ 
sum(rate(http_requests_total{endpoint="/api/transform"}[5m]))

# Average Processing Time
rate(http_request_duration_seconds_sum{endpoint="/api/transform"}[5m])
/
rate(http_request_duration_seconds_count{endpoint="/api/transform"}[5m])
```

## Troubleshooting

### Problem: Bilder werden nicht gecacht

**Lösung:** Überprüfe NGINX-Logs und Cache-Status Header:

```bash
docker-compose logs nginx | grep transform
```

### Problem: Transformationen zu langsam

**Mögliche Ursachen:**
- Erste Request (MISS) dauert länger → normal
- Sehr große Originalbilder → vorab optimieren
- CPU-Limitierung → mehr Worker/Cores

### Problem: Format-Konvertierung schlägt fehl

**Lösung:** Stelle sicher dass Pillow alle Codecs unterstützt:

```bash
docker-compose exec backend-api pip show pillow
```

## Roadmap

- [ ] **Blur/Sharpen Filter** - Bildeffekte
- [ ] **Watermark-Integration** - Wasserzeichen bei Transformation
- [ ] **Face Detection Crop** - Intelligentes Cropping auf Gesichter
- [ ] **Auto-Format** - Automatische Format-Wahl basierend auf Browser
- [ ] **Progressive JPEG** - Progressive Encoding für große Bilder
- [ ] **AVIF Support** - Nächste Generation Format
- [ ] **Signed URLs** - Zeitlich begrenzte Transform-URLs

## Weitere Informationen

- **API-Dokumentation:** http://localhost:8000/docs#/Image%20Transform
- **Test-Script:** `test-transform.ps1`
- **Nginx-Config:** `nginx/conf.d/cdn.conf`
- **Backend-Code:** `backend/routers/transform.py`
