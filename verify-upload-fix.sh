#!/bin/bash
# Verification Script: Check if upload improvements are active
# Run this on the server after update.sh

echo "🔍 Verifying Upload Configuration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# ============================================
# 1. Check NGINX Config
# ============================================
echo "📋 [1/5] Checking NGINX upload timeouts..."
if docker-compose exec -T nginx-cdn grep -q "proxy_read_timeout 600s" /etc/nginx/conf.d/cdn.conf; then
    echo -e "${GREEN}✓${NC} NGINX upload timeouts configured (600s)"
else
    echo -e "${RED}✗${NC} NGINX missing upload timeouts!"
    ERRORS=$((ERRORS+1))
fi
echo ""

# ============================================
# 2. Check Backend Timeouts
# ============================================
echo "📋 [2/5] Checking Backend uvicorn timeouts..."
if docker-compose exec -T backend-api ps aux | grep -q "timeout-keep-alive 650"; then
    echo -e "${GREEN}✓${NC} Backend uvicorn running with timeout-keep-alive 650s"
else
    echo -e "${RED}✗${NC} Backend uvicorn NOT running with extended timeouts!"
    echo -e "${YELLOW}⚠${NC}  Current uvicorn command:"
    docker-compose exec -T backend-api ps aux | grep uvicorn | grep -v grep
    ERRORS=$((ERRORS+1))
fi
echo ""

# ============================================
# 3. Check if start.sh is executable
# ============================================
echo "📋 [3/5] Checking start.sh permissions..."
if docker-compose exec -T backend-api test -x /app/start.sh; then
    echo -e "${GREEN}✓${NC} start.sh is executable"
else
    echo -e "${RED}✗${NC} start.sh is NOT executable!"
    ERRORS=$((ERRORS+1))
fi
echo ""

# ============================================
# 4. Check Frontend Build Date
# ============================================
echo "📋 [4/5] Checking Frontend build..."
FRONTEND_BUILD=$(docker-compose exec -T frontend stat -c %Y /usr/share/nginx/html/index.html 2>/dev/null || echo "0")
CURRENT_TIME=$(date +%s)
AGE=$((CURRENT_TIME - FRONTEND_BUILD))

if [ $AGE -lt 3600 ]; then
    echo -e "${GREEN}✓${NC} Frontend recently built (${AGE}s ago)"
elif [ $AGE -lt 86400 ]; then
    echo -e "${YELLOW}⚠${NC} Frontend build is $((AGE/3600)) hours old - might be outdated"
else
    echo -e "${RED}✗${NC} Frontend build is $((AGE/86400)) days old - needs rebuild!"
    ERRORS=$((ERRORS+1))
fi
echo ""

# ============================================
# 5. Test Upload Endpoint
# ============================================
echo "📋 [5/5] Testing upload endpoint accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://localhost:8000/api/upload)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "405" ]; then
    echo -e "${GREEN}✓${NC} Upload endpoint reachable (HTTP $HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Upload endpoint unreachable (HTTP $HTTP_CODE)"
    ERRORS=$((ERRORS+1))
fi
echo ""

# ============================================
# Summary
# ============================================
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Upload configuration is correct."
    echo "If uploads still fail, check:"
    echo "  1. Browser console (F12) for errors"
    echo "  2. docker-compose logs backend-api"
    echo "  3. Network tab in DevTools during upload"
else
    echo -e "${RED}❌ Found $ERRORS issue(s)!${NC}"
    echo ""
    echo "To fix, run these commands:"
    echo ""
    
    if docker-compose exec -T nginx-cdn grep -q "proxy_read_timeout 600s" /etc/nginx/conf.d/cdn.conf; then
        :
    else
        echo "# Fix NGINX config:"
        echo "docker-compose exec nginx-cdn nginx -s reload"
        echo ""
    fi
    
    if docker-compose exec -T backend-api ps aux | grep -q "timeout-keep-alive 650"; then
        :
    else
        echo "# Rebuild and restart backend:"
        echo "docker-compose build backend-api"
        echo "docker-compose restart backend-api"
        echo ""
    fi
    
    echo "# Or run full update:"
    echo "bash update.sh"
fi
echo "========================================="
echo ""

# Show recent upload logs
echo "📊 Recent upload activity (last 10 lines):"
docker-compose logs --tail=10 backend-api | grep -i upload || echo "(No upload logs found)"
echo ""

exit $ERRORS
