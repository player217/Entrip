# WSL/Docker Environment Scripts for Phase 2A Testing

This directory contains comprehensive scripts for validating, setting up, and testing the Phase 2A optimistic locking implementation in WSL/Docker environments.

## 🎯 Quick Start

```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Validate environment
scripts/validate-wsl-environment.sh

# 3. Setup database and services
scripts/setup-database.sh

# 4. Run comprehensive optimistic locking tests
scripts/test-optimistic-locking.sh
```

## 📋 Script Overview

### `validate-wsl-environment.sh`
**Purpose**: Validates WSL/Docker environment prerequisites before testing.

**Features**:
- WSL version and distribution checks
- Docker daemon connectivity validation
- Port availability analysis
- Project structure verification
- Database configuration analysis

**Usage**:
```bash
# Basic validation
scripts/validate-wsl-environment.sh

# With detailed output
VERBOSE=true scripts/validate-wsl-environment.sh
```

**Expected Output**:
- ✅ All checks pass → Ready for database setup
- ❌ Issues found → Fix reported problems before proceeding

### `setup-database.sh`
**Purpose**: Starts Docker services and initializes database for testing.

**Features**:
- Docker Compose service management
- PostgreSQL/Redis container health monitoring
- Prisma client generation and schema synchronization
- Optimistic locking migration application
- API server connectivity verification

**Usage**:
```bash
# Standard setup
scripts/setup-database.sh

# With custom API URL
API_URL=http://localhost:4002 scripts/setup-database.sh
```

**What it does**:
1. Starts `postgres` and `redis` containers
2. Waits for services to be healthy (up to 60s)
3. Generates Prisma client
4. Pushes database schema
5. Applies optimistic locking migration
6. Verifies API server connectivity

### `test-optimistic-locking.sh`
**Purpose**: Comprehensive test suite for optimistic locking functionality.

**Features**:
- **Dual Testing Strategy**: Production routes (with auth) OR test routes (no auth)
- **Complete HTTP Status Validation**: 200, 201, 304, 412, 428
- **ETag Lifecycle Testing**: Creation, validation, version conflicts
- **Production Guard Testing**: Ensures test routes blocked in production
- **Detailed Reporting**: Pass/fail statistics with diagnostic info

**Usage**:
```bash
# Auto-detect authentication and choose appropriate routes
scripts/test-optimistic-locking.sh

# Force production routes (requires authentication)
scripts/test-optimistic-locking.sh --production

# Force test routes only (no authentication needed)
scripts/test-optimistic-locking.sh --test-only

# Verbose output with full request/response details
scripts/test-optimistic-locking.sh --verbose

# Custom configuration
scripts/test-optimistic-locking.sh --api-url http://localhost:4002 --timeout 15
```

**Test Scenarios**:
1. **POST 201 + ETag**: Create resource with version-based ETag
2. **GET 200 + ETag**: Retrieve resource with ETag confirmation
3. **GET 304**: Cache validation with `If-None-Match`
4. **PATCH 428**: Missing `If-Match` header handling
5. **PATCH 412**: Version conflict detection
6. **PATCH 200**: Successful update with version increment

### `troubleshoot-wsl.sh`
**Purpose**: Advanced diagnostic tool for environment issues.

**Features**:
- **Interactive Menu**: Step-through diagnostics
- **Comprehensive Analysis**: System, network, Docker, database, API, filesystem
- **Performance Monitoring**: Resource usage and response times
- **Quick Fixes**: Automated resolution for common issues
- **Report Generation**: Detailed diagnostic reports for support

**Usage**:
```bash
# Interactive mode (recommended for troubleshooting)
scripts/troubleshoot-wsl.sh

# Specific diagnostics
scripts/troubleshoot-wsl.sh --docker      # Docker issues only
scripts/troubleshoot-wsl.sh --database    # Database connectivity
scripts/troubleshoot-wsl.sh --api         # API server issues

# Generate comprehensive report
scripts/troubleshoot-wsl.sh --report

# Apply quick fixes
scripts/troubleshoot-wsl.sh --fix

# Show all information
scripts/troubleshoot-wsl.sh --all
```

**Diagnostic Categories**:
- **System**: WSL version, OS info, network interfaces
- **Docker**: Daemon status, containers, health checks
- **Database**: Connection testing, configuration validation
- **API**: Endpoint accessibility, response times
- **Filesystem**: File permissions, line endings, structure
- **Performance**: Resource usage, response times

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# API Configuration
export API_URL="http://localhost:4001"          # API server URL
export TIMEOUT="10"                             # Request timeout (seconds)

# Database Configuration (apps/api/.env)
DATABASE_URL="postgresql://entrip:entrip@localhost:5432/entrip?schema=public"
PORT=4000
NODE_ENV=development
```

### WSL-Specific Considerations

1. **Database URL**: Use `localhost:5432` instead of `host.docker.internal:5432` for WSL compatibility
2. **File Permissions**: Scripts automatically handle executable permissions
3. **Line Endings**: Automatic conversion from CRLF to LF if needed
4. **Network Access**: Docker containers accessible via localhost in WSL2

## 🚀 Common Workflows

### Initial Environment Setup
```bash
# Complete setup from scratch
scripts/validate-wsl-environment.sh
scripts/setup-database.sh
scripts/test-optimistic-locking.sh
```

### Development Testing Cycle
```bash
# Quick validation after code changes
scripts/test-optimistic-locking.sh --verbose

# If issues found, run diagnostics
scripts/troubleshoot-wsl.sh --api
```

### CI/CD Integration
```bash
# Non-interactive validation
VERBOSE=false scripts/validate-wsl-environment.sh
scripts/setup-database.sh
scripts/test-optimistic-locking.sh --test-only
```

### Troubleshooting Workflow
```bash
# When things go wrong
scripts/troubleshoot-wsl.sh --all > diagnostic-report.txt
scripts/troubleshoot-wsl.sh --fix
scripts/setup-database.sh  # Retry setup
```

## 📊 Test Results Interpretation

### Success Indicators
```
✅ POST Create Booking: 201 (expected 201)
✅ GET ETag Confirmation: 200 (expected 200)  
✅ GET 304 Not Modified: 304 (expected 304)
✅ PATCH 428 Precondition Required: 428 (expected 428)
✅ PATCH 412 Precondition Failed: 412 (expected 412)
✅ PATCH 200 + New ETag: 200 (expected 200)

Tests Passed: 6
Tests Failed: 0
🎉 All tests passed! Optimistic locking is working correctly.
```

### Common Failure Patterns
```
❌ POST Create Booking: 401 (expected 201)
→ Issue: Authentication failed
→ Solution: Use --test-only or provide valid credentials

❌ PATCH 428 Precondition Required: 500 (expected 428)  
→ Issue: ApiError not handled by error middleware
→ Solution: Check errorHandler.ts for proper ApiError instance detection

❌ GET 304 Not Modified: 200 (expected 304)
→ Issue: ETag not implemented or cache headers missing
→ Solution: Verify ETag generation in respond middleware
```

## 🔍 Advanced Debugging

### Request/Response Analysis
```bash
# Enable verbose mode to see full HTTP details
scripts/test-optimistic-locking.sh --verbose

# Manual testing with curl
curl -i -X POST http://localhost:4001/api/test-db/bookings \
  -H "Content-Type: application/json" \
  --data '{"customerName":"Debug User","amount":"100.00"}'
```

### Database Connection Testing
```bash
# Direct database test
cd apps/api
echo "SELECT 1 as test;" | npx prisma db execute --stdin

# Check Prisma client
npx prisma generate
npx prisma db push --skip-generate
```

### Docker Service Management
```bash
# Check service status
docker compose -f docker-compose.local.yml ps

# View service logs
docker compose -f docker-compose.local.yml logs postgres
docker compose -f docker-compose.local.yml logs redis

# Restart services
docker compose -f docker-compose.local.yml restart postgres redis
```

## 🆘 Support and Troubleshooting

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Docker daemon not accessible | Start Docker Desktop, check WSL integration |
| Database connection failed | Verify DATABASE_URL, check PostgreSQL container health |
| Authentication failed | Use `--test-only` flag or provide valid credentials |
| ETag not generated | Check respond middleware configuration |
| Test routes accessible in production | Verify NODE_ENV guards in app.ts |
| Port conflicts | Use `ss -ltnp` to identify conflicting processes |

### Getting Help
1. Run comprehensive diagnostics: `scripts/troubleshoot-wsl.sh --report`
2. Check the generated report for specific issues
3. Use verbose mode for detailed test output: `--verbose`
4. Review Docker container logs for service-specific issues

## 📝 Script Customization

All scripts support environment variable configuration:

```bash
# Custom API URL
API_URL=http://localhost:4002 scripts/test-optimistic-locking.sh

# Extended timeout for slow systems
TIMEOUT=30 scripts/test-optimistic-locking.sh

# Force production route testing
USE_PRODUCTION_ROUTES=true scripts/test-optimistic-locking.sh

# Enable verbose output
VERBOSE=true scripts/validate-wsl-environment.sh
```

---

These scripts provide a comprehensive testing and validation suite for the Phase 2A optimistic locking implementation, specifically designed for WSL/Docker environments with automatic fallback strategies and detailed diagnostic capabilities.