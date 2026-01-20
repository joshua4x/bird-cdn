# Upload Improvements - Large File Support

## Problem
- No visual feedback during upload (especially for large videos)
- No error messages when upload fails
- Timeouts for files larger than 1-2 GB
- User doesn't know if upload is working or stuck

## Solution Implemented

### 1. Frontend Progress Indicator ✅

**File:** `frontend/src/pages/UploadPage.jsx`

**Features:**
- **Real-time progress bar** (0-100%)
- **Upload speed** (MB/s)
- **Uploaded size / Total size** display
- **Smooth animations** with gradient progress bar

**Visual Example:**
```
Uploading... 45%                           12.5 MB/s
[████████████████░░░░░░░░░░░░░░░░░░░░]
                                  1,125 MB / 2,500 MB
```

### 2. Enhanced Error Handling ✅

**Detailed error messages:**
- ❌ `Upload timeout - file may be too large or connection too slow`
- ❌ `No response from server - check your connection`
- ❌ `Error: 413 Payload Too Large`
- ❌ `File type not allowed: .xyz`

**Console logging** for debugging

### 3. Extended Timeouts ✅

#### Frontend (`api.js`)
```javascript
timeout: 600000  // 10 minutes (600 seconds)
```

#### Backend (`start.sh`)
```bash
uvicorn main:app \
  --timeout-keep-alive 650 \  # 10min + 50s buffer
  --limit-concurrency 1000
```

#### NGINX (`cdn.conf`)
```nginx
location /api/ {
    proxy_read_timeout 600s;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    client_body_timeout 600s;
}
```

### 4. Progress Tracking API ✅

**File:** `frontend/src/api.js`

```javascript
export const uploadFile = (formData, onProgress) => {
  return api.post('/upload', formData, {
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted, progressEvent.loaded, progressEvent.total);
    }
  });
};
```

**Usage:**
```javascript
await uploadFile(formData, (percent, loaded, total) => {
  console.log(`Upload: ${percent}% (${loaded}/${total} bytes)`);
});
```

## Technical Specifications

### Maximum File Sizes
- **NGINX:** `client_max_body_size 5000m` (5 GB)
- **Backend:** `MAX_UPLOAD_SIZE = 5_000_000_000` (5 GB)
- **Frontend Timeout:** 600 seconds (10 minutes)

### Upload Speed Calculation
```javascript
const elapsed = (Date.now() - startTime) / 1000; // seconds
const speedMBps = (loaded / 1024 / 1024) / elapsed;
```

### Supported File Types
**Images:**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`, `.tiff`, `.ico`
- Automatically converted to WebP (85% quality)

**Videos:**
- `.mp4`, `.webm`, `.avi`, `.mov`, `.mkv`, `.flv`, `.wmv`, `.m4v`
- No conversion (stored as-is)

## Testing Large Files

### Test 1: Small Video (< 100 MB)
```powershell
# Upload test video
curl -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-video-50mb.mp4" \
  -F "bucket=media" \
  -F "folder=test"
```
**Expected:** Upload completes in < 30 seconds, progress bar visible

### Test 2: Large Video (1-3 GB)
```powershell
# Upload large video via frontend
# 1. Open http://localhost:3000/upload
# 2. Select 2 GB video file
# 3. Click "Upload File"
```
**Expected:**
- Progress bar shows 0% → 100%
- Upload speed displayed (e.g., "15.3 MB/s")
- Completes in ~2 minutes (at 15 MB/s)
- Success message with CDN URL

### Test 3: Timeout Test (Simulated)
```javascript
// In api.js, temporarily set:
timeout: 10000  // 10 seconds
```
Upload 1 GB file → Should show: "Upload timeout - file may be too large or connection too slow"

## Upload Flow

```
┌─────────────┐
│ User selects│
│    file     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Show file size, │
│ name, preview   │
└──────┬──────────┘
       │
       ▼ [Click Upload]
┌─────────────────────┐
│ Start progress bar  │
│ Set startTime       │
└──────┬──────────────┘
       │
       ▼ (onUploadProgress)
┌─────────────────────────┐
│ Update progress: 0-100% │
│ Calculate speed: MB/s   │
│ Show uploaded/total MB  │
└──────┬──────────────────┘
       │
       ▼ [Success]
┌─────────────────────┐
│ Show CDN URL        │
│ Enable Copy button  │
│ Reset form          │
└─────────────────────┘
       │
       ▼ [Error]
┌─────────────────────┐
│ Show error message  │
│ Keep file selected  │
│ Allow retry         │
└─────────────────────┘
```

## UI Components

### Progress Bar
```jsx
<div style={{ width: '100%', height: '8px', background: '#e5e7eb' }}>
  <div style={{
    width: `${uploadProgress}%`,
    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
    transition: 'width 0.3s ease'
  }} />
</div>
```

### Speed Display
```jsx
<span>{uploadSpeed > 0 ? `${uploadSpeed.toFixed(2)} MB/s` : 'Calculating...'}</span>
```

### Size Display
```jsx
<span>
  {((file.size / 1024 / 1024) * (uploadProgress / 100)).toFixed(2)} MB 
  / 
  {(file.size / 1024 / 1024).toFixed(2)} MB
</span>
```

## Performance Considerations

### Network Speed Examples
- **Slow (5 MB/s):** 1 GB = ~3.5 minutes
- **Medium (15 MB/s):** 1 GB = ~70 seconds
- **Fast (50 MB/s):** 1 GB = ~20 seconds

### Server Processing Time
- **Image (WebP conversion):** + 1-3 seconds per image
- **Video (no processing):** Instant (just upload)
- **Database insert:** < 100ms

### Recommendations
1. **Files > 1 GB:** Show estimated time remaining
2. **Files > 3 GB:** Consider chunk upload (future enhancement)
3. **Slow connections:** Display warning if speed < 2 MB/s

## Browser Compatibility
- ✅ Chrome/Edge (tested)
- ✅ Firefox (tested)
- ✅ Safari (tested)
- ⚠️ IE11 (not supported - FormData issues)

## Future Enhancements
- [ ] Chunk upload for files > 5 GB
- [ ] Resume capability (pause/continue)
- [ ] Multiple file upload (batch)
- [ ] Drag & drop area
- [ ] Image preview before upload
- [ ] Estimated time remaining
- [ ] Upload queue management

## Deployment
All changes are in Git, use `update.sh`:
```bash
cd /opt/cdn-network
bash update.sh
```

This will:
1. Pull new frontend code with progress bar
2. Pull new backend start.sh with extended timeouts
3. Pull new NGINX config with upload timeouts
4. Rebuild and restart all containers

## Verification
```bash
# Test upload endpoint is accessible
curl -I http://localhost:8000/api/upload

# Check NGINX timeout config
docker-compose exec nginx-cdn grep -A5 "location /api/" /etc/nginx/conf.d/cdn.conf

# Check uvicorn is running with new timeouts
docker-compose exec backend-api ps aux | grep uvicorn
```

## Status
✅ Implemented and ready for deployment
✅ All timeouts extended to 10 minutes
✅ Progress bar with speed indicator
✅ Detailed error messages
✅ Tested with local files up to 2 GB
