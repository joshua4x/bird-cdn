# Deployment Fix - Permission Denied Error

## Problem
```
ERROR: for backend-api  Cannot start service backend-api: failed to create task for container: 
failed to create shim task: OCI runtime create failed: runc create failed: 
unable to start container process: error during container init: 
exec: "/app/start.sh": permission denied: unknown
```

## Root Cause
The `start.sh` script didn't have execute permissions. This happened because:
1. Git tracks files without execute flag by default
2. Docker COPY preserves file permissions from Git
3. Even with `chmod +x` in Dockerfile, timing issues can occur

## Solution Applied

### 1. Fixed Git Permissions
```bash
git add --chmod=+x backend/start.sh
git add --chmod=+x backend/setup_tracking_cron.sh  
git add --chmod=+x backend/cron_aggregate_logs.py
```

Files now tracked with mode `100755` (executable) instead of `100644`

### 2. Enhanced Dockerfile
```dockerfile
# Verbose chmod to verify execution
RUN chmod -v +x /app/cron_aggregate_logs.py && \
    chmod -v +x /app/setup_tracking_cron.sh && \
    chmod -v +x /app/start.sh && \
    ls -la /app/*.sh /app/cron_aggregate_logs.py

# Use bash explicitly to bypass permission checks
CMD ["bash", "/app/start.sh"]
```

**Key Change**: `CMD ["bash", "/app/start.sh"]` instead of `CMD ["/app/start.sh"]`
- This runs the script via bash interpreter
- Works even if execute bit fails for some reason
- More robust across different Docker/OS combinations

## Verification on Server

After pulling updates, the build should show:
```
Step X/Y : RUN chmod -v +x ...
mode of '/app/start.sh' changed from 0644 (rw-r--r--) to 0755 (rwxr-xr-x)
mode of '/app/setup_tracking_cron.sh' changed from 0644 (rw-r--r--) to 0755 (rwxr-xr-x)
...
```

If permissions are already correct (100755 from Git), you'll see:
```
mode of '/app/start.sh' retained as 0755 (rwxr-xr-x)
```

## Prevention
All shell scripts in the repository should be committed with execute permissions:
```bash
git ls-files -s *.sh
# Should show: 100755 (executable), NOT 100644 (regular file)
```

## Status
✅ Fixed in commit
- backend/Dockerfile updated with bash CMD
- All scripts tracked with execute permissions in Git
