# Entrip Project Guide for Claude

## 🎯 Quick Start Commands
MCP 자동설치를 위해, Agents.md 파일에 넣을 내용:

MCP 자동설치하기
공통 주의사항 
1. 현재 사용 환경을 확인할 것. 모르면 사용자에게 물어볼 것. 
2. OS(윈도우,리눅스,맥) 및 환경들(WSL,파워셀,명령프롬프트등)을 파악해서 그에 맞게 세팅할 것. 모르면 사용자에게 물어볼 것. 
4. 특정 MCP 설치시, 바로 설치하지 말고, 해당 MCP의 공식 사이트 확인하고 현재 OS 및 환경 매치하여, 공식 설치법부터 확인할 것 
5. MCP 설치 후, 다음 방법으로 정상 설치 여부 확인할 것
   ($env:RUST_LOG="codex=debug"; codex "/mcp"  :  이렇게 실행하여 설치한 MCP에 대한 로그를 확인할 것)

6. 설정 시, API KEY 환경 변수 설정이 필요한 경우, 가상의 API 키로 디폴트로 설치 및 설정 후, 올바른 API 키 정보를 입력해야 함을 사용자에게 알릴 것 
7. 설치 요청 받은 MCP만 설치하면 돼. 혹시 이미 설치된 다른 MCP 에러 있어도, 그냥 둘 것 
8. 일단, 터미널에서 설치하려는 MCP 작동 성공한 경우, 성공 시의 인자 및 환경 변수 이름을 활용해, 올바른 위치의 config.toml 파일에 MCP 설정을 직접할 것 


MCP 설정의 예:
~/.codex/config.toml(홈 디렉터리) 파일의 [mcp_servers.*] 섹션에 적어둔 커맨드를 실행해 MCP 서버에 붙습니다


예시: (아래는 단지 예시이지만, 올바른 내용입니다)
# ~/.codex/config.toml

[mcp_servers.brightData]
command = "npx"
args    = ["-y", "@brightdata/mcp"]
env     = { 
  API_TOKEN = "bd_your_api_key_here"  
}

[mcp_servers.playwright]
command = "npx"
args    = ["@playwright/mcp@latest"]
### Development
```bash
# Start all services with Docker (shorthand)
pnpm dev:docker

# Equivalent long form (for reference)
docker-compose -f docker-compose.dev.yml up --build

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

추가 자료:
- 자세한 단계별 MCP 설정 가이드는 `docs/MCP_SETUP.md`를 참고하세요.
- 자동 설정 스크립트: `bash scripts/setup-mcp-config.sh --provider brightData --api-token bd_XXXX --yes`

### Tests (Container-first)
- Run API-only tests inside container (isolated DB):
  - `pnpm test:api:container`
- Run full monorepo tests inside container (shared → ui → web → api):
  - `pnpm test:full:container`
- Notification API E2E from host:
  - `API_URL=http://localhost:4002/api/v2 bash scripts/test-notifications.nojq.sh`

### CI (GitHub Actions)
- Full container tests run on push/PR via `.github/workflows/full-tests.yml`.
  - Uses Docker Compose services (`postgres`, `redis`, `api-v2`).
  - Executes the same container-first test flow as local `pnpm test:full:container`.

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
// 주의: 일부 시드에서는 매니저 계정이 manager1@entrip.com 으로 생성됩니다.
admin@entrip.com, manager@entrip.com (또는 manager1@entrip.com), user@entrip.com
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
### Booking API Version Toggle

- Set `BOOKING_API_MODE=v2` (server) or `NEXT_PUBLIC_BOOKING_API_MODE=v2` (web) to switch the shared booking service to the v2 endpoints.
- Set `TEAM_BOOKING_API_MODE=v2` (server) or `NEXT_PUBLIC_TEAM_BOOKING_API_MODE=v2` (web) if you need the shared team booking service to target `/api/v2/team-bookings`.
- Shared team booking service now normalizes v2 payloads (null-safe arrays, enum coercion, attachment/category mapping) so web callers keep the legacy DTO shape.
- Default remains `v1`; when v2 is enabled the shared layer automatically maps responses and handles If-Match headers for updates/deletes.
- Tests can pin a mode via `bookingService.__setModeForTests('v2')`, `__setBookingServiceModeForTests('v2')`, or `__setTeamBookingServiceModeForTests('v2')`.

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
