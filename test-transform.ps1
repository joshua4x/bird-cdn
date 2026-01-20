# Image Transformation API Test Script
# Tests the new on-the-fly image transformation capabilities

$BaseUrl = "http://localhost:8000"
$TransformUrl = "$BaseUrl/api/transform"

Write-Host "🖼️  Image Transformation API Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get transformation info
Write-Host "Test 1: Get Transformation Info" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/transform-info" -Method Get
    Write-Host "✅ Info retrieved successfully" -ForegroundColor Green
    Write-Host "Supported formats: $($response.limits.supported_formats -join ', ')" -ForegroundColor Gray
    Write-Host "Max dimensions: $($response.limits.max_width)x$($response.limits.max_height)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Resize image to 800x600 WebP
Write-Host "Test 2: Resize to 800x600 WebP" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/test/sample.jpg?w=800&h=600&format=webp"
    $response = Invoke-WebRequest -Uri $url -Method Get
    Write-Host "✅ Transform successful" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Gray
    Write-Host "Cache-Status: $($response.Headers['X-Cache-Status'])" -ForegroundColor Gray
    Write-Host "Size: $($response.Content.Length) bytes" -ForegroundColor Gray
    if ($response.Headers['X-Original-Size']) {
        Write-Host "Original Size: $($response.Headers['X-Original-Size']) bytes" -ForegroundColor Gray
        Write-Host "Compression: $($response.Headers['X-Compression-Ratio'])" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Square thumbnail with center crop
Write-Host "Test 3: Square Thumbnail (400x400, center crop)" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/test/sample.jpg?w=400&h=400&fit=cover&crop=center"
    $response = Invoke-WebRequest -Uri $url -Method Get
    Write-Host "✅ Transform successful" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "Size: $($response.Content.Length) bytes" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Format conversion only (JPG to WebP)
Write-Host "Test 4: Format Conversion (JPG → WebP)" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/test/sample.jpg?format=webp&quality=90"
    $response = Invoke-WebRequest -Uri $url -Method Get
    Write-Host "✅ Transform successful" -ForegroundColor Green
    Write-Host "Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Gray
    Write-Host "Size: $($response.Content.Length) bytes" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Responsive width (maintain aspect ratio)
Write-Host "Test 5: Responsive Width (1200px, maintain aspect)" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/test/sample.jpg?w=1200&fit=contain"
    $response = Invoke-WebRequest -Uri $url -Method Get
    Write-Host "✅ Transform successful" -ForegroundColor Green
    Write-Host "Size: $($response.Content.Length) bytes" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Mobile-optimized
Write-Host "Test 6: Mobile-Optimized (600px WebP, quality 80)" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/test/sample.jpg?w=600&format=webp&quality=80"
    $response = Invoke-WebRequest -Uri $url -Method Get
    Write-Host "✅ Transform successful" -ForegroundColor Green
    Write-Host "Size: $($response.Content.Length) bytes" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Test caching (request same image twice)
Write-Host "Test 7: Cache Test (request same image twice)" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/test/sample.jpg?w=800&format=webp"
    
    Write-Host "First request..." -ForegroundColor Gray
    $response1 = Invoke-WebRequest -Uri $url -Method Get
    $cacheStatus1 = $response1.Headers['X-Cache-Status']
    Write-Host "Cache Status: $cacheStatus1" -ForegroundColor Gray
    
    Start-Sleep -Seconds 1
    
    Write-Host "Second request..." -ForegroundColor Gray
    $response2 = Invoke-WebRequest -Uri $url -Method Get
    $cacheStatus2 = $response2.Headers['X-Cache-Status']
    Write-Host "Cache Status: $cacheStatus2" -ForegroundColor Gray
    
    if ($cacheStatus2 -eq "HIT") {
        Write-Host "✅ Caching works correctly!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Cache might not be working (Status: $cacheStatus2)" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Invalid parameters (should fail)
Write-Host "Test 8: Invalid Parameters (should fail)" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/test/sample.jpg?w=10000"  # Exceeds max width
    $response = Invoke-WebRequest -Uri $url -Method Get
    Write-Host "❌ Should have failed but didn't!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "✅ Correctly rejected invalid parameters" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Failed with unexpected status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 9: Non-existent image (should return 404)
Write-Host "Test 9: Non-Existent Image (should return 404)" -ForegroundColor Yellow
try {
    $url = "$TransformUrl/media/nonexistent/fake.jpg?w=800"
    $response = Invoke-WebRequest -Uri $url -Method Get
    Write-Host "❌ Should have returned 404 but didn't!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Correctly returned 404" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Failed with unexpected status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✨ Transformation API Test Complete" -ForegroundColor Cyan
Write-Host ""
Write-Host "Examples to try manually:" -ForegroundColor Yellow
Write-Host "  $TransformUrl/media/your-image.jpg?w=800&h=600&format=webp" -ForegroundColor Gray
Write-Host "  $TransformUrl/media/your-image.jpg?w=400&h=400&fit=cover&crop=center" -ForegroundColor Gray
Write-Host "  $TransformUrl/media/your-image.jpg?format=webp&quality=90" -ForegroundColor Gray
Write-Host "  $TransformUrl/media/your-image.jpg?w=1200&fit=contain" -ForegroundColor Gray
Write-Host ""
