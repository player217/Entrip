# Prisma Schema Comparison Analysis: API v1 vs v2

## Executive Summary

This document provides a comprehensive comparison between the Prisma schemas of API v1 (apps/api) and API v2 (packages/api), analyzing their differences, migration requirements, and compatibility issues. The analysis reveals two distinct architectural approaches: v1 follows a comprehensive enterprise system design while v2 adopts a simplified, domain-focused structure.

## Schema Overview

### API v1 (apps/api): Production System
- **Models**: 32 total models
- **Architecture**: Comprehensive enterprise system with messaging, booking, finance, and integration features
- **Migration History**: Active development with 8 migration files
- **Status**: Currently running in production (Docker port 4001→4000)

### API v2 (packages/api): Simplified System
- **Models**: 19 total models
- **Architecture**: Clean, domain-focused design with reduced complexity
- **Migration History**: Limited with 3 migration files
- **Status**: Development/testing system (prepared for port 4002)

## Detailed Model Analysis

### Core Models Comparison

#### 1. User Model

**API v1 - Enterprise Features**:
```prisma
model User {
  id              String          @id @default(cuid())
  email           String          @unique
  name            String
  password        String
  role            UserRole        @default(USER)
  department      String?
  companyCode     String          @default("ENTRIP_MAIN")
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  version         Int             @default(1) // Optimistic locking

  // Extensive Relations (14 different relation types)
  bookings        Booking[]
  conversations   ConversationParticipant[]
  sentMessages    Message[]
  // ... plus 11 more relations
}
```

**API v2 - Simplified Design**:
```prisma
model User {
  id              String          @id @default(cuid())
  email           String          // No unique constraint
  name            String
  password        String
  role            UserRole        @default(USER)
  department      String?
  companyCode     String          @default("ENTRIP_MAIN")
  isActive        Boolean         @default(true)
  lastLoginAt     DateTime?       // Additional field
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  version         Int             @default(1)

  // Focused Relations (11 relation types)
  bookings        Booking[]
  financeRecords  FinanceRecord[]
  // ... 9 more relations

  @@unique([email, companyCode]) // Compound unique
}
```

**Key Differences**:
- **v1**: Global unique email, 14 relation types
- **v2**: Company-scoped email uniqueness, 11 relation types, added lastLoginAt

#### 2. Booking Model

**API v1 - Comprehensive Structure (40+ fields)**:
```prisma
model Booking {
  // Enhanced fields
  bookingNumber   String          @unique
  teamType        String          // Required
  origin          String          // Required
  manager         String          // Required
  representative  String?         // Customer info
  contact         String?
  email           String?
  memo            String?         // 500 char limit

  // JSON fields (to be deprecated)
  flightInfo      Json?           // 향후 제거 예정
  hotelInfo       Json?           // 향후 제거 예정

  // New normalized relations
  flights         Flight[]
  vehicles        Vehicle[]
  hotels          Hotel[]
  settlements     Settlement[]
}
```

**API v2 - Simplified Structure (16 fields)**:
```prisma
model Booking {
  // Basic fields only
  teamName        String
  type            BookingType
  origin          String
  destination     String
  startDate       DateTime
  endDate         DateTime
  totalPax        Int             @default(1)
  coordinator     String
  revenue         Decimal?
  notes           String?
  status          BookingStatus   @default(pending)

  // No JSON fields
  // No detailed relations (only history)
}
```

**Key Differences**:
- **v1**: 40+ fields with customer details, financial info, normalized relations
- **v2**: 16 essential fields only, no customer details, simplified structure

### Models Present in v1 Only (13 models)

#### Messaging System (8 models)
1. **Conversation** - Chat rooms and channels
2. **ConversationParticipant** - User participation in conversations
3. **Message** - Individual messages with threading support
4. **MessageRead** - Read receipt tracking
5. **MessageAttachment** - File attachments
6. **MessageReaction** - Emoji reactions
7. **UserPresence** - Online status tracking
8. **Transaction** - Financial transactions

#### Booking Detail Models (4 models)
9. **Flight** - Normalized flight information
10. **Vehicle** - Transportation details
11. **Hotel** - Accommodation details
12. **Settlement** - Financial settlement records

#### Integration & Resilience (13 models)
13. **IntegrationProvider** - External API provider management
14. **ExternalCallLog** - API call logging and monitoring
15. **FxRateCache** - Exchange rate caching
16. **FlightStatusCache** - Flight status caching
17. **IntegrationInbox** - Event deduplication
18. **IdempotencyKey** - Request deduplication
19. **Outbox** - Reliable event publishing
20. **AuditLog** - System audit trail
21. **Document** - File management
22. **BookingEvent** - Booking lifecycle events
23. **ExchangeRate** - Exchange rate management
24. **Approval** - Approval workflow
25. **Account** - Financial account management

### Models Present in v2 Only (2 models)

1. **FinanceRecord** - Simplified financial tracking
2. **ApprovalStep** - Multi-step approval workflow

### Shared Models with Differences (4 models)

#### 1. CalendarEvent
- **v1**: Basic calendar functionality
- **v2**: Enhanced with creator/updater tracking, company scoping

#### 2. BookingHistory
- **v1**: Comprehensive audit trail with JSON change tracking
- **v2**: Basic history tracking

#### 3. UserPresence
- **v1**: Full presence system with typing indicators
- **v2**: Basic online/offline status

#### 4. MessageRead/MessageReaction
- **v1**: Full messaging ecosystem
- **v2**: Simplified message tracking

## Enum Comparison

### BookingType Enums
**v1**: `PACKAGE | FIT | GROUP | BUSINESS | INCENTIVE` (business-focused)
**v2**: `incentive | golf | honeymoon | airtel | etc` (activity-focused)

### BookingStatus Enums
**v1**: `PENDING | CONFIRMED | IN_PROGRESS | CANCELLED | COMPLETED` (workflow-focused)
**v2**: `pending | confirmed | done | cancelled` (simplified states)

### Case Convention
- **v1**: UPPER_CASE enums
- **v2**: lowercase enums

## Architecture Patterns

### v1: Enterprise Monolith
```
Features:
✅ Real-time messaging system
✅ Comprehensive booking management
✅ Financial transaction tracking
✅ Document management
✅ Integration resilience patterns
✅ Audit logging
✅ Multi-tenant architecture
✅ Optimistic locking

Complexity: HIGH
Maintainability: MODERATE
Feature Completeness: COMPREHENSIVE
```

### v2: Domain-Focused Microservice
```
Features:
✅ Clean domain separation
✅ Simplified booking core
✅ Basic messaging support
✅ Multi-step approvals
✅ Finance record tracking
❌ No document management
❌ No integration patterns
❌ Limited audit capabilities

Complexity: LOW
Maintainability: HIGH
Feature Completeness: FOCUSED
```

## Migration Analysis

### Forward Migration (v1 → v2)

#### ⚠️ BREAKING CHANGES
1. **Data Loss Risk**: 13 v1-only models with no v2 equivalent
2. **Booking Data**: Customer details, financial info, normalized relations lost
3. **Messaging System**: Complete messaging infrastructure not transferable
4. **Integration Data**: External API logs, caches, resilience data lost

#### Migration Requirements
```sql
-- Critical Data Preservation
1. Export v1 messaging conversations → External backup
2. Export v1 financial transactions → External system
3. Export v1 booking details (flights, hotels, vehicles) → JSON backup
4. Export v1 audit logs → Compliance storage

-- Schema Mapping
1. User.email unique → User.email+companyCode unique
2. Booking (40 fields) → Booking (16 fields) [DATA LOSS]
3. BookingType enum mapping required
4. BookingStatus enum mapping required

-- New v2 Features
1. FinanceRecord system setup
2. Multi-step ApprovalStep configuration
3. Enhanced CalendarEvent features
```

### Backward Migration (v2 → v1)

#### ✅ FEASIBLE (with data expansion)
```sql
-- Schema Extensions Needed
1. Add missing Booking fields (24 fields)
2. Recreate messaging system (8 models)
3. Recreate integration system (13 models)
4. Convert compound unique constraints

-- Data Mapping
1. v2.FinanceRecord → v1.Transaction + Account
2. v2.ApprovalStep → v1.Approval (flatten multi-step)
3. Basic → Enhanced CalendarEvent features
```

## Compatibility Assessment

### Database Compatibility
| Aspect | v1 | v2 | Compatible |
|--------|----|----|------------|
| Primary Keys | cuid() | cuid() | ✅ |
| Timestamps | DateTime | DateTime | ✅ |
| Enums | UPPER_CASE | lowercase | ❌ |
| Relations | Complex | Simple | ⚠️ |
| Indexes | Comprehensive | Basic | ⚠️ |

### API Compatibility
| Feature | v1 Support | v2 Support | Migration Impact |
|---------|------------|------------|------------------|
| Booking CRUD | Full (40 fields) | Basic (16 fields) | 🔴 Breaking |
| Messaging | Complete | Basic | 🔴 Breaking |
| Finance | Transaction-based | Record-based | 🟡 Different |
| Calendar | Basic | Enhanced | 🟢 Additive |
| Approvals | Single-step | Multi-step | 🟡 Different |

### Client Application Impact
| Component | v1 Dependency | v2 Compatibility | Action Required |
|-----------|---------------|------------------|-----------------|
| Booking Forms | 40-field model | 16-field model | 🔴 Major refactor |
| Messaging UI | Full ecosystem | Basic only | 🔴 Feature reduction |
| Calendar | Basic events | Enhanced events | 🟢 Enhancement opportunity |
| Finance | Transaction view | Record view | 🟡 UI adjustment |

## Recommendations

### Migration Strategy Options

#### Option 1: Parallel Operation (RECOMMENDED)
```yaml
Timeline: 6-12 months
Risk: LOW
Effort: HIGH

Phase 1: Infrastructure (2 months)
- Deploy v2 alongside v1
- Set up data synchronization
- Implement feature flags

Phase 2: Feature Migration (4-6 months)
- Migrate non-breaking features first
- Gradual client migration
- Dual-write to both systems

Phase 3: Cutover (2-4 months)
- Complete client migration
- Data validation
- v1 decommission
```

#### Option 2: Big Bang Migration
```yaml
Timeline: 3-4 months
Risk: HIGH
Effort: MODERATE

Challenges:
- Complete system downtime
- Data loss for unsupported features
- Client breaking changes
- Rollback complexity
```

#### Option 3: Feature-by-Feature Migration
```yaml
Timeline: 8-15 months
Risk: MODERATE
Effort: VERY HIGH

Approach:
- Migrate booking system first
- Add messaging to v2
- Gradually enhance v2 feature parity
```

### Immediate Actions Required

#### 1. Data Protection (CRITICAL)
```bash
# Backup v1-only data before any migration
- Export messaging conversations and history
- Backup booking detail tables (Flight, Vehicle, Hotel)
- Archive financial transaction data
- Preserve audit logs for compliance
```

#### 2. Schema Alignment (HIGH PRIORITY)
```sql
-- Standardize enum conventions
- Decide on UPPER_CASE vs lowercase
- Create mapping for BookingType/BookingStatus
- Align field naming conventions

-- Index Strategy
- Review v2 index coverage
- Add performance-critical indexes
- Consider query patterns from v1
```

#### 3. API Contract Management (HIGH PRIORITY)
```typescript
// Version API responses
interface BookingV1 {
  // 40 fields including customer details
}

interface BookingV2 {
  // 16 core fields only
}

// Implement adapter pattern for gradual migration
```

## Risk Assessment

### HIGH RISK
- **Data Loss**: 13 models with no v2 equivalent
- **Feature Regression**: Messaging, document management, integration patterns
- **Client Breaking Changes**: 40-field → 16-field booking model

### MEDIUM RISK
- **Performance**: Different indexing strategies
- **Business Logic**: Enum value mappings required
- **Integration**: External API patterns not supported in v2

### LOW RISK
- **Core Functionality**: Basic CRUD operations maintained
- **Authentication**: User model largely compatible
- **Calendar**: Enhanced features in v2

## Conclusion

The v1 and v2 schemas represent fundamentally different architectural philosophies. v1 is a comprehensive enterprise system with full messaging, detailed booking management, and robust integration patterns. v2 is a simplified, domain-focused design optimized for maintainability and clarity.

**Migration is feasible but requires careful planning**:
- **v1 → v2**: Significant feature reduction, data loss risk
- **v2 → v1**: Feature expansion needed, manageable with data extension

**Recommended approach**: Parallel operation with gradual feature migration, allowing time to rebuild missing v2 capabilities while maintaining v1 production stability.

The choice between schemas should align with business priorities: comprehensive feature set (v1) vs. simplified maintainability (v2).