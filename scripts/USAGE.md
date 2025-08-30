# Phase 2A Testing Suite - Usage Guide

## 🚀 Quick Start

### 1. First Time Setup
```bash
# Complete setup with auto-fix
./scripts/run-all.sh --reset --auto
```

### 2. Standard Test Execution
```bash
# Run all tests with verbose output
./scripts/run-all.sh --verbose

# Generate JSON report
./scripts/run-all.sh --json
```

### 3. Production Route Testing (with Authentication)
```bash
# Set authentication token
export AUTH_BEARER="Bearer your-jwt-token-here"
export BASE_URL=http://localhost:4001

# Run tests against production routes
./scripts/test-optimistic-locking-v2.sh --json
```

### 4. Test Routes (No Authentication)
```bash
# Automatically uses /api/test-db routes
./scripts/test-optimistic-locking-v2.sh
```

## ✅ Pass Criteria

The test suite verifies all optimistic locking scenarios:

| Test | Expected | Route |
|------|----------|-------|
| POST Create | 201 + ETag | /api/bookings or /api/test-db/bookings |
| GET with ETag | 200 + ETag | /api/bookings/{id} |
| GET If-None-Match | 304 Not Modified | /api/bookings/{id} |
| PATCH no If-Match | 428 Precondition Required | /api/bookings/{id} |
| PATCH wrong If-Match | 412 Precondition Failed | /api/bookings/{id} |
| PATCH correct If-Match | 200 + new ETag | /api/bookings/{id} |

## 🎯 GO/NO-GO Checklist

### ✅ PASS Criteria:
- All 6 test scenarios: **PASS**
- Success rate: **100%** (or after auto-retry)
- ETag headers present in responses
- Error codes (428/412) propagate correctly

### ❌ FAIL Criteria:
- Any test scenario fails after retries
- ETag headers missing
- 428/412 converted to 500 errors
- Production guard not working

## 📊 Test Reports

### Console Output
```
✅ Test #1: POST 201 + ETag
   Expected: 201 with ETag, Got: 201 with ETag:1 ✓
✅ Test #2: GET 200 + ETag
   Expected: 200 with ETag, Got: 200 with ETag:1 ✓
✅ Test #3: GET 304 Not Modified
   Expected: 304, Got: 304 ✓
✅ Test #4: PATCH 428 Required
   Expected: 428, Got: 428 ✓
✅ Test #5: PATCH 412 Failed
   Expected: 412, Got: 412 ✓
✅ Test #6: PATCH 200 Success
   Expected: 200 with new ETag, Got: 200 with ETag:2 ✓

Test Results Summary
====================
Total Tests: 6
Passed: 6
Failed: 0
Success Rate: 100%
```

### JSON Report
```json
{
  "timestamp": "2025-08-26T12:00:00Z",
  "api_url": "http://localhost:4001",
  "total_tests": 6,
  "passed": 6,
  "failed": 0,
  "duration": 3,
  "results": [...]
}
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Fix DATABASE_URL for WSL
./scripts/auto-fix.sh --auto

# Reset containers
./scripts/auto-fix.sh --reset
```

### Authentication Issues
```bash
# Check if token is valid
curl -H "Authorization: $AUTH_BEARER" http://localhost:4001/api/auth/verify

# Use test routes instead (no auth required)
unset AUTH_BEARER
./scripts/test-optimistic-locking-v2.sh
```

### Port Conflicts
```bash
# Check port usage
ss -ltnp | grep -E ':4001|:5432|:6379'

# Free ports automatically
AUTO_FIX=true ./scripts/auto-fix.sh
```

## 📝 Git Commit

After successful tests:
```bash
git add scripts/
git commit -m "chore(scripts): enhanced WSL/Docker setup, auto-fix, and optimistic locking test v2

- auto-fix DATABASE_URL for WSL
- smart Docker health checks + Prisma sync
- prod /bookings tests with fallback /api/test-db
- 201/304/428/412/200 matrix + JSON reports
- run-all orchestrator and env template"
```

## 🔍 Verification Commands

### Check API Health
```bash
curl http://localhost:4001/healthz
```

### Check Test Routes
```bash
curl http://localhost:4001/api/test-db/health
```

### Check Production Guard
```bash
# Should return 404/403 if NODE_ENV=production
NODE_ENV=production curl http://localhost:4001/api/test-db/health
```

## 📚 Script Reference

| Script | Purpose | Key Options |
|--------|---------|-------------|
| `run-all.sh` | Master orchestrator | `--reset`, `--auto`, `--json`, `--verbose` |
| `test-optimistic-locking-v2.sh` | Test suite | `--json`, `--verbose`, AUTH_BEARER, BASE_URL |
| `auto-fix.sh` | Problem resolver | `--auto`, `--reset` |
| `enhanced-setup.sh` | Database setup | (no options) |
| `validate-wsl-environment.sh` | Environment check | (no options) |

## 🌟 Best Practices

1. **Always run pre-flight checks first**:
   ```bash
   ./scripts/validate-wsl-environment.sh
   ```

2. **Use auto-fix for common issues**:
   ```bash
   ./scripts/auto-fix.sh --auto
   ```

3. **Generate JSON reports for CI/CD**:
   ```bash
   ./scripts/run-all.sh --json
   ```

4. **Test both routes (production and test)**:
   ```bash
   # Test routes
   ./scripts/test-optimistic-locking-v2.sh
   
   # Production routes
   export AUTH_BEARER="Bearer token"
   ./scripts/test-optimistic-locking-v2.sh
   ```

5. **Review logs for debugging**:
   ```bash
   tail -f logs/phase2a-*.log
   ```