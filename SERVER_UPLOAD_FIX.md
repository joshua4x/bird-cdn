# SERVER UPLOAD FIX - Quick Guide

## Problem
Upload funktioniert lokal, aber nicht auf dem Server. Video wird hochgeladen, aber URL zeigt "NoSuchKey" Error.

## Root Cause
Nach `update.sh` wurden nicht alle Services korrekt neu geladen:
- NGINX config nicht reloaded
- Backend Container noch mit alten Timeouts
- Frontend möglicherweise nicht neu gebaut

---

## Solution (Auf dem Server ausführen)

### Step 1: Verify Current State
```bash
cd /opt/cdn-network
bash verify-upload-fix.sh
```

Dies zeigt dir genau, was fehlt.

### Step 2: Force Rebuild & Restart

```bash
# Stop all containers
docker-compose down

# Remove old images (optional but recommended)
docker-compose rm -f

# Rebuild backend with new timeouts
docker-compose build --no-cache backend-api

# Rebuild frontend with progress bar
docker-compose build --no-cache frontend

# Start everything
docker-compose up -d

# Wait 30 seconds for startup
sleep 30

# Verify again
bash verify-upload-fix.sh
```

### Step 3: Test Upload

```bash
# Create small test file (10 MB)
dd if=/dev/zero of=test-video.mp4 bs=1M count=10

# Test upload via API
curl -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-video.mp4" \
  -F "bucket=media" \
  -F "folder=test" \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: HTTP 200 with JSON response containing `cdn_url`

---

## Manual Fixes (If verify-upload-fix.sh shows errors)

### Fix 1: NGINX Timeouts Missing
```bash
# Check config
docker-compose exec nginx-cdn cat /etc/nginx/conf.d/cdn.conf | grep -A5 "location /api/"

# Should show:
#   proxy_read_timeout 600s;
#   proxy_connect_timeout 600s;
#   proxy_send_timeout 600s;
#   client_body_timeout 600s;

# If missing, reload:
docker-compose exec nginx-cdn nginx -s reload
```

### Fix 2: Backend Timeouts Missing
```bash
# Check running uvicorn command
docker-compose exec backend-api ps aux | grep uvicorn

# Should show: --timeout-keep-alive 650

# If not, restart:
docker-compose restart backend-api

# Still wrong? Rebuild:
docker-compose build backend-api
docker-compose up -d backend-api
```

### Fix 3: Frontend Not Updated
```bash
# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose restart frontend

# Clear browser cache (Ctrl+Shift+R)
```

---

## Debugging Upload Issues

### Check Backend Logs
```bash
# Follow logs in real-time
docker-compose logs -f backend-api

# In another terminal, try upload from frontend
# Watch for errors like:
#   - "File too large"
#   - "Upload failed: [reason]"
#   - Timeout errors
```

### Check NGINX Logs
```bash
# Check for 413 (Payload Too Large) or 504 (Timeout)
docker-compose logs --tail=50 nginx-cdn | grep -E "413|504|timeout"
```

### Check MinIO Storage
```bash
# List files in media bucket
docker-compose exec origin-storage mc ls minio/media/

# Expected: Files with timestamp_hash.mp4 format
```

### Test Direct MinIO Upload
```bash
# Bypass NGINX/Backend, test MinIO directly
docker-compose exec origin-storage mc cp /tmp/test.mp4 minio/media/direct-test.mp4

# Then check via CDN
curl -I http://YOUR_SERVER_IP/media/direct-test.mp4
```

---

## Common Issues & Solutions

### Issue 1: "NoSuchKey" Error
**Cause:** File uploaded to frontend, but never reached MinIO

**Fix:**
1. Check if upload endpoint is reachable: `curl -I http://localhost:8000/api/upload`
2. Check JWT token is valid: `curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/auth/me`
3. Check file size < 5GB
4. Check backend logs for upload errors

### Issue 2: Upload Hangs at 99%
**Cause:** Backend processing timeout or MinIO connection issue

**Fix:**
1. Increase backend timeout: Already set to 650s in start.sh
2. Check MinIO is running: `docker-compose ps origin-storage`
3. Check disk space: `df -h`

### Issue 3: 413 Payload Too Large
**Cause:** NGINX blocking large files

**Fix:**
```bash
# Check NGINX config
docker-compose exec nginx-cdn grep client_max_body_size /etc/nginx/nginx.conf

# Should show: client_max_body_size 5000m;
# If not, update nginx.conf and reload
```

### Issue 4: No Progress Bar Visible
**Cause:** Old frontend code cached in browser

**Fix:**
1. Hard reload: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear browser cache completely
3. Open DevTools (F12) → Application → Clear storage
4. Rebuild frontend: `docker-compose build frontend`

---

## Expected Behavior After Fix

### Upload Flow:
1. Select file → Shows file size (e.g., "1,250 MB")
2. Click "Upload File"
3. Progress bar appears: 0% → 100%
4. Upload speed displayed: "15.3 MB/s"
5. Size progress: "625 MB / 1,250 MB"
6. Success message with CDN URL
7. Can copy URL and open in new tab → Video plays

### Timeline:
- 100 MB video @ 10 MB/s → ~10 seconds
- 1 GB video @ 15 MB/s → ~70 seconds
- 3 GB video @ 20 MB/s → ~2.5 minutes

---

## Verification Checklist

After running fixes, verify:

- [ ] `bash verify-upload-fix.sh` shows all green ✓
- [ ] Frontend shows progress bar during upload
- [ ] Backend logs show upload processing
- [ ] File appears in database: `docker-compose exec postgres psql -U cdn -d cdn -c "SELECT * FROM uploaded_files ORDER BY created_at DESC LIMIT 1;"`
- [ ] File exists in MinIO: `docker-compose exec origin-storage ls /data/media/`
- [ ] CDN URL is accessible: `curl -I http://localhost/media/FILE.mp4`
- [ ] Video plays in browser

---

## Still Not Working?

### Collect Debug Info:
```bash
# 1. Save all logs
docker-compose logs > debug-logs.txt

# 2. Save config files
docker-compose exec nginx-cdn cat /etc/nginx/conf.d/cdn.conf > nginx-config.txt
docker-compose exec backend-api cat /app/start.sh > backend-start.txt

# 3. Check service status
docker-compose ps > service-status.txt

# 4. Check disk space
df -h > disk-space.txt

# Send all .txt files for analysis
```

### Emergency Full Reset:
```bash
# CAUTION: This will rebuild everything
docker-compose down -v
docker system prune -af
git pull origin main
bash update.sh
```

---

## Contact/Support
If issue persists after all steps, provide:
1. Output of `verify-upload-fix.sh`
2. Browser console errors (F12)
3. Backend logs during upload attempt
4. File size being uploaded
5. Network speed (run: `curl -o /dev/null http://speedtest.wdc01.softlayer.com/downloads/test100.zip`)
