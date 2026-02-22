# Entrip Project Guide for Claude

## 🎯 Quick Start Commands

### Development
```bash
# Start all services with Docker
pnpm dev:docker

# Start individual services
pnpm dev:api     # Legacy API (port 4001)
pnpm dev:web     # Next.js web app (port 3000)
pnpm dev:all     # All services without Docker

# Database operations
pnpm db:migrate  # Run migrations
pnpm db:seed     # Seed database
pnpm db:reset    # Reset and reseed
pnpm db:studio   # Open Prisma Studio

# Code quality
pnpm lint        # Run ESLint
pnpm typecheck   # TypeScript type checking
pnpm test        # Run tests
```

## 🏗️ Architecture Overview

### Monorepo Structure (pnpm workspaces)
```
Entrip/
├── apps/
│   ├── api/         # Legacy API (v1) - Currently in production
│   └── web/         # Next.js 14 frontend
├── packages/
│   ├── api/         # New API (v2) - Clean architecture (development)
│   ├── shared/      # Shared types, utilities, hooks
│   ├── ui/          # Component library
│   └── design-tokens/ # Design system tokens
└── scripts/         # Build and utility scripts
```

### Tech Stack
- **Backend**: Node.js, Express.js, Prisma ORM
- **Frontend**: Next.js 14, React, TypeScript
- **Database**: PostgreSQL
- **Real-time**: Socket.io WebSocket
- **Container**: Docker Compose
- **Package Manager**: pnpm (workspaces)

## 🐳 Docker Services

```yaml
Services:
- postgres:5432     # PostgreSQL database
- api:4001          # Legacy API (apps/api)
- api-v2:4002       # New API (packages/api) - not yet active
- web:3000          # Next.js application
- crawler:8001      # Python flight crawler
```

### Docker Commands
```bash
# Build and start
docker-compose -f docker-compose.dev.yml up --build

# Stop all containers
docker-compose down

# Clean rebuild
docker system prune -af
docker-compose up --build
```

## 🔐 Authentication System

### Login Credentials
All demo accounts use password: `pass1234`

```javascript
// Company codes (must match exactly)
entrip, j1, startour, happytravel

// Demo accounts
admin@entrip.com, manager@entrip.com, user@entrip.com
admin@j1.com, manager@j1.com
admin@startour.com, manager@startour.com
admin@happytravel.com, manager@happytravel.com
```

### Auth Flow
1. Login sends `companyCode`, `username`, `password`
2. Server validates with bcrypt
3. Sets HttpOnly cookie for session
4. Frontend stores token in localStorage (backup)

## 📊 Database Schema

### Key Models
- **User**: Authentication and company association
- **Booking**: Core booking entity with 40+ fields
- **Message/Conversation**: Real-time messaging
- **Flight/Hotel/Vehicle**: Travel components
- **Transaction/Settlement**: Financial records

### Migration Commands
```bash
# Create migration
pnpm db:migrate dev --name migration_name

# Apply migrations
pnpm db:migrate deploy

# Reset database
pnpm db:reset
```

## ⚠️ Critical Warnings

### NEVER Delete These Files
```
❌ packages/shared/src/lib/apiClient.ts     # Workspace shared client
❌ apps/web/src/lib/axios.ts                # Web app proxy client
❌ apps/web/lib/api.ts                       # Development temp client
❌ apps/web/src/lib/api.ts                   # Production client

These files look similar but serve DIFFERENT purposes!
```

### File Duplication Explanation
- **API Clients (4 different ones)**: Each handles different auth methods and environments
- **useBookings hooks (2 versions)**: Standard vs WebSocket-enhanced
- **Auth stores (2 copies)**: Legacy compatibility

## 🚀 Common Development Tasks

### Adding a New Feature
1. Check existing patterns in codebase
2. Use appropriate package (`@entrip/shared` for logic, `@entrip/ui` for components)
3. Follow TypeScript strict patterns
4. Add to appropriate route in apps/web/app/

### Fixing Authentication Issues
1. Check User table has `companyCode` field
2. Verify bcrypt password hashing
3. Ensure cookie settings in auth routes
4. Check middleware.ts isn't blocking

### Database Changes
1. Modify `apps/api/prisma/schema.prisma`
2. Run `pnpm db:migrate dev --name descriptive_name`
3. Update types with `pnpm db:generate`
4. Test with `pnpm db:studio`

## 🔄 API Migration Status

Currently running two API versions:
- **v1 (apps/api)**: Production API with WebSocket support
- **v2 (packages/api)**: New clean architecture (not yet active)

Migration is in progress - DO NOT remove v1 until v2 is fully tested!

## 🐛 Common Issues & Solutions

### Docker Build Fails
```bash
# Clean everything and rebuild
docker system prune -af
docker-compose down -v
docker-compose up --build
```

### Login Not Working
1. Check database has users: `pnpm db:studio`
2. Verify companyCode matches exactly
3. Check password is hashed with bcrypt
4. Ensure cookies are enabled

### TypeScript Errors
```bash
# Rebuild all packages in order
pnpm build:packages
pnpm typecheck
```

### Port Conflicts
- API: 4001 (host) → 4000 (container)
- Web: 3000
- PostgreSQL: 5432
- Crawler: 8001

## 📝 Project Context

This is a travel management system with:
- Multi-company support (companyCode segregation)
- Real-time booking updates (WebSocket)
- Messaging system
- Flight schedule crawler
- Financial tracking

The codebase is transitioning from a monolithic structure (apps/api) to a clean architecture (packages/api) while maintaining backward compatibility.

## 💡 Best Practices

1. **Always check existing patterns** before implementing new features
2. **Use TypeScript strictly** - avoid `any` types
3. **Follow the monorepo structure** - shared logic goes in packages/
4. **Test with Docker** to match production environment
5. **Don't remove "duplicate" files** - they serve different purposes
6. **Check company context** - all data is segregated by companyCode

## 🔗 Important Files

- `/apps/api/src/index.ts` - Main API server entry
- `/apps/web/app/layout.tsx` - Root layout with providers
- `/packages/shared/src/types/index.ts` - Shared TypeScript types
- `/apps/api/prisma/schema.prisma` - Database schema
- `/docker-compose.dev.yml` - Docker services configuration

## 🚦 Development Workflow

1. Start Docker services: `pnpm dev:docker`
2. Make changes in appropriate package/app
3. Test locally: `pnpm test`
4. Check types: `pnpm typecheck`
5. Lint code: `pnpm lint`
6. Commit with clear message

Remember: This is a production system in active development. Be careful with database migrations and API changes!