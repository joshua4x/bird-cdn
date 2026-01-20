# CDN Performance Test Script
# Für Windows PowerShell

Write-Host "🧪 CDN Performance Tests" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Test 1: API Health Check
Write-Host "1. Testing API Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ API not reachable" -ForegroundColor Red
    exit 1
}

# Test 2: Upload Test Image
Write-Host ""
Write-Host "2. Uploading test image..." -ForegroundColor Yellow

# Create a simple test file
$testFile = "test-image.txt"
"This is a test file for CDN testing" | Out-File -FilePath $testFile -Encoding UTF8

try {
    $form = @{
        file = Get-Item -Path $testFile
        bucket = "media"
        folder = "test"
    }
    
    $upload = Invoke-RestMethod -Uri "http://localhost:8000/api/upload" `
        -Method Post `
        -Form $form
    
    Write-Host "   ✅ File uploaded: $($upload.filename)" -ForegroundColor Green
    $cdnUrl = $upload.cdn_url
    Write-Host "   📎 CDN URL: $cdnUrl" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Upload failed: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Cache MISS (first request)
Write-Host ""
Write-Host "3. Testing Cache MISS (first request)..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri $cdnUrl -Method Head -UseBasicParsing
    $cacheStatus = $response.Headers["X-Cache-Status"]
    
    if ($cacheStatus -eq "MISS") {
        Write-Host "   ✅ Cache MISS detected (expected)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Cache Status: $cacheStatus" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ CDN request failed" -ForegroundColor Red
}

# Test 4: Cache HIT (second request)
Write-Host ""
Write-Host "4. Testing Cache HIT (second request)..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

try {
    $response = Invoke-WebRequest -Uri $cdnUrl -Method Head -UseBasicParsing
    $cacheStatus = $response.Headers["X-Cache-Status"]
    
    if ($cacheStatus -eq "HIT") {
        Write-Host "   ✅ Cache HIT detected! CDN is working!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Cache Status: $cacheStatus (expected HIT)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ CDN request failed" -ForegroundColor Red
}

# Test 5: Stats API
Write-Host ""
Write-Host "5. Testing Stats API..." -ForegroundColor Yellow

try {
    $stats = Invoke-RestMethod -Uri "http://localhost:8000/api/stats/overview" -UseBasicParsing
    Write-Host "   ✅ Stats API working" -ForegroundColor Green
    Write-Host "   📊 Total Files: $($stats.files.total)" -ForegroundColor Cyan
    Write-Host "   💾 Storage Used: $($stats.storage.used_gb) GB" -ForegroundColor Cyan
    Write-Host "   ⚡ Cache Hit Ratio: $($stats.cache.hit_ratio)%" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Stats API failed" -ForegroundColor Red
}

# Test 6: Cache Purge
Write-Host ""
Write-Host "6. Testing Cache Purge..." -ForegroundColor Yellow

try {
    $purgeUrl = "http://localhost:8000/api/purge?path=" + [System.Web.HttpUtility]::UrlEncode($upload.path)
    $purge = Invoke-RestMethod -Uri $purgeUrl -Method Delete -UseBasicParsing
    Write-Host "   ✅ Cache purged: $($purge.files_purged) files" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Purge failed" -ForegroundColor Red
}

# Cleanup
Remove-Item -Path $testFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  • Open Admin UI: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  • View Monitoring: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  • Check API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
