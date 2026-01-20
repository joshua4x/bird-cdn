# Test Authentication Flow
Write-Host "=== CDN AUTH TEST ===" -ForegroundColor Cyan
Write-Host ""

# 1. Login und Token holen
Write-Host "1. Login als Admin..." -ForegroundColor Yellow

# FastAPI OAuth2 braucht x-www-form-urlencoded
$loginBody = "username=admin&password=admin123"

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/x-www-form-urlencoded"
    
    $token = $loginResponse.access_token
    Write-Host "   ✅ Login erfolgreich!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,20))..." -ForegroundColor Gray
    Write-Host ""
    
    # 2. Test Upload-Endpoint mit Token
    Write-Host "2. Test Upload-Endpoint..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    # Erstelle Test-FormData (empty, nur um Auth zu testen)
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="bucket"',
        "",
        "test",
        "--$boundary--"
    ) -join "`r`n"
    
    try {
        $uploadTest = Invoke-WebRequest -Uri "http://localhost:3000/api/upload" `
            -Method Post `
            -Headers $headers `
            -Body $bodyLines `
            -ContentType "multipart/form-data; boundary=$boundary" `
            -ErrorAction SilentlyContinue
        
        $statusCode = $uploadTest.StatusCode
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
    }
    
    if ($statusCode -eq 401) {
        Write-Host "   ❌ 401 Unauthorized - Backend akzeptiert Token NICHT!" -ForegroundColor Red
    } elseif ($statusCode -eq 422) {
        Write-Host "   ✅ Auth OK! (422 = Missing file, aber Auth funktioniert)" -ForegroundColor Green
    } else {
        Write-Host "   Status: $statusCode" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 3. Test Watermark-Endpoint
    Write-Host "3. Test Watermark Config..." -ForegroundColor Yellow
    try {
        $watermarkTest = Invoke-WebRequest -Uri "http://localhost:3000/api/watermark/config" `
            -Method Get `
            -Headers $headers `
            -ErrorAction SilentlyContinue
        
        $statusCode = $watermarkTest.StatusCode
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
    }
    
    if ($statusCode -eq 401) {
        Write-Host "   ❌ 401 Unauthorized - Backend akzeptiert Token NICHT!" -ForegroundColor Red
    } elseif ($statusCode -eq 200) {
        Write-Host "   ✅ Auth funktioniert!" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "   ✅ Auth OK! (404 = Kein Watermark, aber Auth funktioniert)" -ForegroundColor Green
    } else {
        Write-Host "   Status: $statusCode" -ForegroundColor Yellow
    }
    Write-Host ""
    
    Write-Host "=== ZUSAMMENFASSUNG ===" -ForegroundColor Cyan
    Write-Host "Wenn hier 401-Fehler erscheinen:" -ForegroundColor White
    Write-Host "→ Backend akzeptiert den Token nicht" -ForegroundColor White
    Write-Host "→ Problem in backend/auth.py oder Token-Format" -ForegroundColor White
    Write-Host ""
    Write-Host "Wenn hier 200/422 erscheint:" -ForegroundColor White
    Write-Host "→ Backend funktioniert!" -ForegroundColor White
    Write-Host "→ Problem ist im Browser (Cache oder api.js)" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Login fehlgeschlagen!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
