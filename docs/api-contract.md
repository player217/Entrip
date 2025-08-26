# API Contract

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://api.entrip.co.kr`

## Authentication
All API requests require authentication token in the header:
```
Authorization: Bearer <token>
```

## Endpoints

### Dashboard
#### GET /api/dashboard/stats
Get dashboard statistics

**Response:**
```json
{
  "todayBookings": 12,
  "activeProjects": 24,
  "pendingApprovals": 3,
  "unreadMessages": 5,
  "monthlyRevenue": 85000000,
  "monthlyProfit": 12000000
}
```

### Exchange Rates
#### GET /api/fx
Get current exchange rates

**Response:**
```json
{
  "rates": [
    {
      "currency": "USD",
      "rate": 1320.50,
      "change": 0.5
    }
  ],
  "updatedAt": "2025-06-15T10:30:00Z"
}
```

### Bookings
#### GET /api/bookings
Get booking list

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status (pending|confirmed|completed|cancelled)

**Response:**
```json
{
  "bookings": [
    {
      "id": "1",
      "teamName": "삼성전자 연수팀",
      "type": "인센티브",
      "destination": "방콕",
      "startDate": "2025-06-20",
      "endDate": "2025-06-23",
      "status": "confirmed",
      "totalPax": 45,
      "revenue": 68000000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 48,
    "totalPages": 5
  }
}
```

#### GET /api/bookings/:id
Get booking details

**Response:**
```json
{
  "id": "1",
  "teamName": "삼성전자 연수팀",
  "type": "인센티브",
  "destination": "방콕",
  "origin": "인천",
  "startDate": "2025-06-20",
  "endDate": "2025-06-23",
  "status": "confirmed",
  "totalPax": 45,
  "revenue": 68000000,
  "cost": 52000000,
  "profit": 16000000,
  "coordinator": {
    "id": "user1",
    "name": "김엔트립",
    "email": "kim@entrip.co.kr"
  },
  "flights": [...],
  "hotels": [...]
}
```

### Approvals
#### GET /api/approvals
Get approval list

**Query Parameters:**
- `status` (string): Filter by status (pending|approved|rejected)

**Response:**
```json
{
  "approvals": [
    {
      "id": "1",
      "type": "payment",
      "bookingId": "1",
      "teamName": "삼성전자 연수팀",
      "amount": 15000000,
      "description": "호텔 예약금",
      "status": "pending",
      "requestedAt": "2025-06-15T10:30:00Z",
      "requester": "김엔트립"
    }
  ]
}
```

## Error Responses
All error responses follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication failed
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `INTERNAL_ERROR`: Internal server error
