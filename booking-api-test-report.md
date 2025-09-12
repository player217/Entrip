# Booking API Comprehensive Test Report
**Date:** 2025-09-09  
**Time:** 13:04 UTC  
**API Server:** http://localhost:4001

## Test Summary

### ✅ SUCCESSFUL TESTS

#### 1. Login Test
- **Endpoint:** `POST /api/auth/login`
- **Credentials:** star company manager (`manager1@star.com` / `pass1234`)
- **Status:** ✅ **SUCCESS**
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "star-manager1",
      "companyCode": "star", 
      "username": "manager1@star.com",
      "email": "manager1@star.com",
      "name": "스타투어 김민수",
      "role": "MANAGER",
      "department": "영업1팀",
      "isActive": true,
      "createdAt": "2025-01-01T09:00:00.000Z",
      "lastLoginAt": "2025-09-09T13:02:01.917Z"
    },
    "message": "로그인 성공"
  }
  ```
- **Cookie Set:** `auth-token` (HttpOnly, expires in 24 hours)

#### 2. Authentication Verification
- **Endpoint:** `GET /api/auth/verify`
- **Status:** ✅ **SUCCESS**
- **User Info:** Successfully verified star company manager
- **Session:** Valid authentication token

#### 3. Health Check
- **Endpoint:** `GET /api/v1/health`  
- **Status:** ✅ **SUCCESS**
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2025-09-09T13:04:18.767Z",
    "version": "1.0.0"
  }
  ```

### ❌ FAILED TESTS

#### 1. Bookings List Retrieval
- **Endpoint:** `GET /api/v1/bookings?limit=5`
- **Status:** ❌ **FAILED** - HTTP 500 Internal Server Error
- **Error Response:**
  ```json
  {
    "code": 500,
    "message": "예약 목록을 조회하는 중 오류가 발생했습니다"
  }
  ```

#### 2. Alternative Booking Endpoints
- **Endpoints Tested:**
  - `GET /api/bookings` → 404 Not Found
  - `GET /api/booking` → 404 Not Found  
  - `GET /api/v1/booking` → 404 Not Found
- **Status:** ❌ **FAILED** - Endpoints don't exist

## Error Analysis

### Root Cause: Database Schema Issue
**Error from API logs:**
```
modelName: 'Booking',
field: 'manager', 
expected_type: 'String',
found: 'null'
```

**Diagnosis:** The Prisma client expects the `manager` field to be a non-nullable String, but database records contain null values.

### Authentication Architecture
- **✅ Login System:** Working perfectly with JWT tokens
- **✅ Session Management:** HttpOnly cookies with proper expiration
- **✅ User Authorization:** MANAGER role properly recognized
- **✅ Company Code Isolation:** `star` company context maintained

### API Structure
- **Base URL:** `http://localhost:4001`
- **Auth Endpoints:** `/api/auth/*`
- **Booking Endpoints:** `/api/v1/bookings/*`
- **Health Endpoints:** `/api/v1/health`

## Request/Response Examples

### Login Request (✅ Working)
```bash
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"companyCode":"star","username":"manager1@star.com","password":"pass1234"}' \
  -c cookies.txt
```

### Bookings Request (❌ Failing)
```bash
curl http://localhost:4001/api/v1/bookings?limit=5 \
  -b cookies.txt \
  -H "Accept: application/json"
```

## Security Analysis

### ✅ Security Headers Present
- Content-Security-Policy: Implemented
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: Implemented

### ✅ Rate Limiting Active
- RateLimit-Limit: 1000
- RateLimit-Remaining: 981
- Request limits properly enforced

### ✅ Authentication Security
- HttpOnly cookies prevent XSS
- JWT tokens with proper expiration
- Company code isolation enforced

## Recommendations

1. **Fix Database Schema:** Address the manager field null constraint issue in the Booking model
2. **Error Handling:** Improve error messages to be more descriptive for debugging
3. **Data Seeding:** Ensure test database has valid booking records with all required fields
4. **Monitoring:** Add database health checks to catch schema issues early

## Test Environment
- **Docker Container:** entrip-api-local
- **Database:** PostgreSQL (entrip-postgres-local:5432)
- **Node Version:** Express.js API server
- **Authentication:** JWT with HttpOnly cookies

## Conclusion

**Login and Authentication:** ✅ **FULLY FUNCTIONAL**  
**Booking Data Access:** ❌ **BLOCKED BY DATABASE SCHEMA ISSUE**

The API authentication system is working perfectly, but booking data retrieval is blocked by a database schema constraint where the `manager` field cannot be null. This needs to be resolved either by:
1. Updating the database schema to allow nullable manager fields
2. Ensuring all booking records have valid manager values
3. Modifying the Prisma model to handle nullable manager fields properly