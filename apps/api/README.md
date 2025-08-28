# Entrip API Server

Express.js based API server for the Entrip travel management system.

## Features

- RESTful API endpoints
- JWT authentication
- Optimistic locking with ETags
- WebSocket support (Socket.io)
- Prisma ORM with PostgreSQL
- Swagger documentation

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (for session management)

### Installation

```bash
# Install dependencies
pnpm install

# Setup database
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### Environment Variables

Create a `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/entrip?schema=public

# Server
PORT=4001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Outbox
OUTBOX_ENABLED=false

# Test Routes (development only)
ENABLE_TEST_ROUTES=false  # Set to true in dev, false in prod
```

## Optimistic Locking

All booking endpoints support ETag-based optimistic locking:

### Headers

- **GET requests**: Include `If-None-Match` header to receive 304 Not Modified responses
- **PATCH/PUT requests**: `If-Match` header is required (returns 428 if missing, 412 if mismatched)
- **All responses**: Include `ETag: "version"` header with current version

### Example Usage

```bash
# Create booking (returns ETag: "1")
curl -X POST http://localhost:4001/api/v1/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=..." \
  -d '{"customerName":"Test", ...}'

# Get with If-None-Match (returns 304 if unchanged)
curl http://localhost:4001/api/v1/bookings/123 \
  -H "If-None-Match: \"1\""

# Update with If-Match (required for updates)
curl -X PATCH http://localhost:4001/api/v1/bookings/123 \
  -H "If-Match: \"1\"" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Updated"}'
```

### Testing Optimistic Locking

```bash
# Run smoke test for all scenarios
./smoke-test.sh

# Test concurrent updates
node concurrent-test.js
```

## System User Setup

Create a system user for automated operations:

```sql
-- Execute once in PostgreSQL
INSERT INTO "User" (
  id, companyCode, username, name, email, 
  role, password, createdAt, updatedAt
) VALUES (
  'system', 'ENTRIP_MAIN', 'system', 'System User', 
  'system@entrip.com', 'ADMIN', 
  '$2b$10$YourHashedPassword', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;
```

## Development

### Running the Server

```bash
# Development mode with hot reload
pnpm dev

# Production mode
pnpm start

# Build for production
pnpm build
```

### Test Routes

Enable test routes in development:

```bash
# In .env file
ENABLE_TEST_ROUTES=true

# Available test routes:
# - /api/test-respond - Test server response
# - /api/test-db - Test database connectivity
```

**⚠️ Warning**: Never enable test routes in production!

### API Documentation

Swagger UI is available in development:

```
http://localhost:4001/docs
```

## Architecture

### Directory Structure

```
src/
├── app.ts              # Express app configuration
├── index.ts            # Server entry point
├── middleware/         # Custom middleware
│   ├── auth.middleware.ts
│   ├── preconditions.ts  # ETag handling
│   └── validate.ts
├── modules/            # Domain modules
│   └── booking/
│       ├── booking.controller.ts
│       ├── booking.service.ts
│       └── booking.dto.ts
├── routes/            # API routes
├── services/          # Business logic
└── lib/              # Utilities
```

### Key Components

1. **Optimistic Locking**: Version-based concurrency control using ETags
2. **Atomic Updates**: Prisma's `updateMany` with version checking
3. **Middleware Chain**: Authentication → Validation → Preconditions → Handler
4. **Error Handling**: Centralized error handler with proper status codes

## Production Deployment

### Security Checklist

- [ ] Change JWT_SECRET to a strong secret
- [ ] Set NODE_ENV=production
- [ ] Disable test routes (ENABLE_TEST_ROUTES=false)
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure logging and monitoring

### Database Migrations

```bash
# Run migrations in production
npx prisma migrate deploy

# Verify database status
npx prisma migrate status
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT_SECRET is set and matches between services
2. **428 Precondition Required**: Include If-Match header for PATCH/PUT requests
3. **412 Precondition Failed**: Version mismatch, fetch latest version
4. **Database connection**: Verify DATABASE_URL and PostgreSQL is running

### Debug Mode

Enable debug logging:

```bash
DEBUG=entrip:* pnpm dev
```

## Contributing

1. Create feature branch
2. Write tests
3. Ensure all tests pass
4. Submit pull request

## License

UNLICENSED