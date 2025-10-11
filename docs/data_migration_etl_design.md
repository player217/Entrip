# Data Migration ETL Design (v1 → v2)
**날짜**: 2025-09-28
**프로젝트**: Entrip Travel Management System v1→v2 Migration

## 🎯 개요

V1 데이터베이스(apps/api)에서 V2 데이터베이스(packages/api)로 안전하고 효율적인 데이터 마이그레이션을 위한 ETL(Extract, Transform, Load) 시스템 설계입니다.

## 📊 마이그레이션 범위 분석

### V1 → V2 스키마 매핑

#### 1. 공통 모델 (직접 매핑)
```yaml
# 필드명/타입이 동일한 모델들
user: User (완전 동일)
booking: Booking (필드 추가됨, 호환)
account: Account (완전 동일)
transaction: Transaction (완전 동일)
document: Document (완전 동일)
auditlog: AuditLog (완전 동일)
```

#### 2. 확장된 모델 (필드 추가)
```yaml
# V2에서 필드가 추가된 모델들
Booking:
  v1: 35개 필드
  v2: 40개 필드 (5개 추가)
  추가 필드: emergencyContact, specialRequests, internalNotes, tags, customFields

Flight:
  v1: 기본 필드
  v2: cache 필드 추가

Hotel:
  v1: 기본 필드
  v2: cache 필드 추가
```

#### 3. 새로운 모델 (V2 전용)
```yaml
# V1에 없고 V2에만 있는 모델들
ApprovalStep: 다단계 승인 프로세스
CalendarEvent: 캘린더 통합
ConversationSettings: 고급 대화 설정
FinanceRecord: 세부 재무 관리
IntegrationInbox: 이벤트 중복 제거
FlightStatusCache: 항공편 상태 캐싱
ExchangeRate: 환율 정보
MessageAttachment: 메시지 첨부파일
```

### 데이터 유형별 마이그레이션 전략

#### 🟢 Green Zone: 안전한 직접 이전
- **User, Account, Transaction, Document, AuditLog**
- **특징**: 스키마 완전 동일
- **전략**: 단순 INSERT INTO SELECT
- **위험도**: 낮음

#### 🟡 Yellow Zone: 변환 후 이전
- **Booking, Flight, Hotel, Vehicle, Settlement**
- **특징**: 필드 추가, JSON → 관계 분해
- **전략**: 변환 로직 적용 후 이전
- **위험도**: 중간

#### 🔴 Red Zone: 수동 처리 필요
- **메시징 시스템**: Conversation, Message, UserPresence 등
- **특징**: 복잡한 관계, 실시간 데이터
- **전략**: 별도 마이그레이션 스크립트
- **위험도**: 높음

## 🏗️ ETL 아키텍처 설계

### 1. 시스템 구성
```
V1 Database (PostgreSQL)
      ↓ Extract
ETL Processing Engine (Node.js + TypeScript)
      ↓ Transform
Migration Buffer (Temporary Tables)
      ↓ Load
V2 Database (PostgreSQL)
```

### 2. ETL 파이프라인 구조
```
scripts/migration/
├── src/
│   ├── extractors/         # V1 데이터 추출
│   │   ├── UserExtractor.ts
│   │   ├── BookingExtractor.ts
│   │   └── MessageExtractor.ts
│   ├── transformers/       # 데이터 변환
│   │   ├── BookingTransformer.ts
│   │   ├── EnumTransformer.ts
│   │   └── RelationMapper.ts
│   ├── loaders/           # V2 데이터 로드
│   │   ├── BatchLoader.ts
│   │   └── RelationLoader.ts
│   ├── validators/        # 데이터 검증
│   │   ├── SchemaValidator.ts
│   │   └── BusinessValidator.ts
│   └── utils/
│       ├── DatabaseConnector.ts
│       ├── MigrationLogger.ts
│       └── ErrorHandler.ts
├── config/
│   ├── migration.config.ts
│   └── database.config.ts
├── dry-run/               # 테스트 실행
│   ├── sample-data.sql
│   └── validation.spec.ts
└── main.ts               # 메인 실행 엔트리
```

## 📋 상세 구현 설계

### 1. 데이터 추출 (Extract)

#### UserExtractor.ts
```typescript
export class UserExtractor {
  async extractUsers(companyCode?: string): Promise<V1User[]> {
    const query = `
      SELECT * FROM "User"
      ${companyCode ? 'WHERE "companyCode" = $1' : ''}
      ORDER BY "createdAt" ASC
    `;

    return await this.v1Connection.query(query, companyCode ? [companyCode] : []);
  }

  async extractUserCount(): Promise<number> {
    const result = await this.v1Connection.query('SELECT COUNT(*) FROM "User"');
    return parseInt(result[0].count);
  }
}
```

#### BookingExtractor.ts
```typescript
export class BookingExtractor {
  async extractBookingsWithRelations(batchSize = 100, offset = 0): Promise<V1BookingWithRelations[]> {
    const query = `
      SELECT
        b.*,
        f.id as flight_id, f."flightNumber", f."departureTime",
        h.id as hotel_id, h."hotelName", h."checkInDate"
      FROM "Booking" b
      LEFT JOIN "Flight" f ON f."bookingId" = b.id
      LEFT JOIN "Hotel" h ON h."bookingId" = b.id
      ORDER BY b."createdAt" ASC
      LIMIT $1 OFFSET $2
    `;

    return await this.v1Connection.query(query, [batchSize, offset]);
  }
}
```

### 2. 데이터 변환 (Transform)

#### EnumTransformer.ts
```typescript
export class EnumTransformer {
  // V1의 소문자 enum → V2의 대문자 enum 변환
  static transformBookingStatus(v1Status: string): BookingStatus {
    const mapping = {
      'pending': 'PENDING',
      'confirmed': 'CONFIRMED',
      'in_progress': 'IN_PROGRESS',
      'cancelled': 'CANCELLED',
      'completed': 'COMPLETED'
    };

    return mapping[v1Status] || 'PENDING';
  }

  static transformTransactionType(v1Type: string): TransactionType {
    const mapping = {
      'deposit': 'DEPOSIT',
      'withdrawal': 'WITHDRAWAL',
      'transfer_in': 'TRANSFER_IN',
      'transfer_out': 'TRANSFER_OUT'
    };

    return mapping[v1Type] || 'DEPOSIT';
  }
}
```

#### BookingTransformer.ts
```typescript
export class BookingTransformer {
  static transformBooking(v1Booking: V1Booking): V2Booking {
    return {
      // 기존 필드 매핑
      id: v1Booking.id,
      bookingNumber: v1Booking.bookingNumber,
      companyCode: v1Booking.companyCode,

      // Enum 변환
      status: EnumTransformer.transformBookingStatus(v1Booking.status),
      type: EnumTransformer.transformBookingType(v1Booking.type),

      // 새 필드 기본값
      emergencyContact: null,
      specialRequests: null,
      internalNotes: null,
      tags: [],
      customFields: {},

      // JSON 필드 분해 → 관계 테이블
      // flightInfo JSON → Flight 관계로 처리
      // hotelInfo JSON → Hotel 관계로 처리

      // 메타데이터
      createdAt: v1Booking.createdAt,
      updatedAt: v1Booking.updatedAt,
      version: 1
    };
  }
}
```

### 3. 데이터 로드 (Load)

#### BatchLoader.ts
```typescript
export class BatchLoader {
  private readonly BATCH_SIZE = 1000;

  async loadUsers(users: V2User[]): Promise<void> {
    const batches = this.createBatches(users, this.BATCH_SIZE);

    for (const batch of batches) {
      await this.v2Connection.transaction(async (tx) => {
        await tx.user.createMany({
          data: batch,
          skipDuplicates: true
        });
      });

      this.logger.info(`Loaded ${batch.length} users`);
    }
  }

  async loadBookingsWithRelations(bookings: V2BookingWithRelations[]): Promise<void> {
    for (const booking of bookings) {
      await this.v2Connection.transaction(async (tx) => {
        // 1. Booking 생성
        const createdBooking = await tx.booking.create({
          data: booking.booking
        });

        // 2. Flight 관계 생성
        if (booking.flights.length > 0) {
          await tx.flight.createMany({
            data: booking.flights.map(f => ({
              ...f,
              bookingId: createdBooking.id
            }))
          });
        }

        // 3. Hotel 관계 생성
        if (booking.hotels.length > 0) {
          await tx.hotel.createMany({
            data: booking.hotels.map(h => ({
              ...h,
              bookingId: createdBooking.id
            }))
          });
        }
      });
    }
  }
}
```

### 4. 데이터 검증 (Validation)

#### SchemaValidator.ts
```typescript
export class SchemaValidator {
  async validateUserMigration(): Promise<ValidationResult> {
    const v1Count = await this.v1Connection.query('SELECT COUNT(*) FROM "User"');
    const v2Count = await this.v2Connection.query('SELECT COUNT(*) FROM "User"');

    return {
      table: 'User',
      v1Count: parseInt(v1Count[0].count),
      v2Count: parseInt(v2Count[0].count),
      isValid: v1Count[0].count === v2Count[0].count,
      missingRecords: []
    };
  }

  async validateBookingIntegrity(): Promise<ValidationResult> {
    // 예약-항공편 관계 검증
    const orphanedFlights = await this.v2Connection.query(`
      SELECT f.id, f."bookingId"
      FROM "Flight" f
      LEFT JOIN "Booking" b ON f."bookingId" = b.id
      WHERE b.id IS NULL
    `);

    return {
      table: 'Flight-Booking Relations',
      orphanedRecords: orphanedFlights,
      isValid: orphanedFlights.length === 0
    };
  }
}
```

### 5. 메인 마이그레이션 스크립트

#### main.ts
```typescript
export class MigrationRunner {
  async runMigration(options: MigrationOptions): Promise<void> {
    try {
      this.logger.info('🚀 Starting V1 → V2 Migration');

      // Phase 1: 안전한 모델 마이그레이션
      await this.migrateUsers();
      await this.migrateAccounts();
      await this.migrateTransactions();

      // Phase 2: 복잡한 모델 마이그레이션
      await this.migrateBookings();
      await this.migrateFlights();
      await this.migrateHotels();

      // Phase 3: 메시징 시스템 (선택적)
      if (options.includeMessaging) {
        await this.migrateConversations();
        await this.migrateMessages();
      }

      // Phase 4: 검증
      await this.runValidation();

      this.logger.info('✅ Migration completed successfully');

    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      await this.rollback();
      throw error;
    }
  }

  private async migrateUsers(): Promise<void> {
    this.logger.info('👥 Migrating Users...');

    const userExtractor = new UserExtractor(this.v1Connection);
    const batchLoader = new BatchLoader(this.v2Connection);
    const validator = new SchemaValidator(this.v1Connection, this.v2Connection);

    const users = await userExtractor.extractUsers();
    await batchLoader.loadUsers(users);

    const validation = await validator.validateUserMigration();
    if (!validation.isValid) {
      throw new Error(`User migration validation failed: ${JSON.stringify(validation)}`);
    }

    this.logger.info(`✅ Migrated ${users.length} users`);
  }
}
```

## 🧪 Dry-run 테스트 시스템

### 1. 샘플 데이터 생성
```sql
-- dry-run/sample-data.sql
-- V1 테스트 데이터 생성
INSERT INTO "User" (id, email, "companyCode", role, "createdAt") VALUES
('test-user-1', 'test1@example.com', 'TEST', 'admin', NOW()),
('test-user-2', 'test2@example.com', 'TEST', 'user', NOW());

INSERT INTO "Booking" (id, "bookingNumber", "companyCode", status, "totalPrice", "userId", "createdAt") VALUES
('test-booking-1', 'TEST001', 'TEST', 'pending', 500000, 'test-user-1', NOW());

INSERT INTO "Flight" ("id", "bookingId", "flightNumber", "departureTime") VALUES
('test-flight-1', 'test-booking-1', 'KE001', NOW() + INTERVAL '1 day');
```

### 2. 검증 테스트
```typescript
// dry-run/validation.spec.ts
describe('Migration Dry Run', () => {
  beforeAll(async () => {
    await setupTestDatabases();
    await seedV1TestData();
  });

  it('should migrate users correctly', async () => {
    await migrationRunner.migrateUsers();

    const v1Users = await v1Connection.query('SELECT * FROM "User" ORDER BY id');
    const v2Users = await v2Connection.query('SELECT * FROM "User" ORDER BY id');

    expect(v2Users.length).toBe(v1Users.length);
    expect(v2Users[0].email).toBe(v1Users[0].email);
  });

  it('should handle enum transformations', async () => {
    await migrationRunner.migrateBookings();

    const v2Booking = await v2Connection.query(
      'SELECT status FROM "Booking" WHERE id = $1',
      ['test-booking-1']
    );

    expect(v2Booking[0].status).toBe('PENDING'); // 대문자 변환 확인
  });
});
```

## ⚙️ 실행 명령어

### 1. Dry-run 모드
```bash
# 테스트 데이터로 마이그레이션 검증
pnpm migration:dry-run

# 특정 회사만 테스트
pnpm migration:dry-run --company=TEST

# 사용자만 테스트
pnpm migration:dry-run --tables=users,accounts
```

### 2. 실제 마이그레이션
```bash
# 전체 마이그레이션
pnpm migration:run --confirm

# 단계별 실행
pnpm migration:run --phase=1  # 안전한 모델만
pnpm migration:run --phase=2  # 복잡한 모델 추가
pnpm migration:run --phase=3  # 메시징 시스템

# 특정 회사만 마이그레이션
pnpm migration:run --company=j1 --confirm
```

### 3. 검증 및 복구
```bash
# 데이터 무결성 검증
pnpm migration:validate

# 롤백 (긴급 시)
pnpm migration:rollback

# 로그 조회
pnpm migration:logs
```

## 📊 성능 및 모니터링

### 1. 예상 처리 시간
```yaml
사용자 (1,000명): 30초
예약 (10,000건): 5분
메시지 (100,000건): 15분
전체 마이그레이션: 30분 (예상)
```

### 2. 모니터링 지표
- **처리량**: records/second
- **메모리 사용량**: 프로세스별 메모리
- **DB 연결**: connection pool 상태
- **에러율**: failed records / total records

### 3. 알림 시스템
```typescript
// Slack/Discord 알림
await notifier.send({
  channel: '#dev-alerts',
  message: `✅ Migration Phase 1 완료: ${userCount}명 사용자 이전`
});

// 에러 알림
await notifier.sendError({
  error: migrationError,
  context: 'Booking migration failed at record 1,234'
});
```

## 🛡️ 안전 조치

### 1. 백업 전략
```bash
# V1 데이터 백업
pg_dump entrip_v1 > backup_v1_$(date +%Y%m%d_%H%M%S).sql

# V2 마이그레이션 전 스냅샷
pg_dump entrip_v2 > snapshot_v2_pre_migration.sql
```

### 2. 롤백 시나리오
- **전체 롤백**: V2 데이터베이스 초기화 후 재시작
- **부분 롤백**: 특정 테이블만 초기화 후 재마이그레이션
- **데이터 복구**: 백업에서 특정 레코드 복구

### 3. 위험 완화
- **점진적 마이그레이션**: 회사별/테이블별 단계적 실행
- **실시간 모니터링**: 메모리, CPU, DB 성능 추적
- **자동 중단**: 에러율 5% 초과 시 자동 중단

## 📋 실행 체크리스트

### 마이그레이션 전 준비
- [ ] V1, V2 데이터베이스 백업 완료
- [ ] 마이그레이션 스크립트 Dry-run 테스트 통과
- [ ] 모니터링 시스템 활성화
- [ ] 롤백 절차 문서화
- [ ] 팀 알림 및 다운타임 공지

### 마이그레이션 실행
- [ ] Phase 1: 기본 모델 마이그레이션
- [ ] Phase 2: 복잡한 모델 마이그레이션
- [ ] Phase 3: 메시징 시스템 마이그레이션
- [ ] 각 단계별 검증 완료
- [ ] 성능 지표 확인

### 마이그레이션 후 검증
- [ ] 데이터 무결성 검증
- [ ] 관계 무결성 검증
- [ ] 성능 테스트
- [ ] 애플리케이션 연동 테스트
- [ ] 사용자 수용 테스트

---
**문서 버전**: 1.0.0
**작성일**: 2025-09-28
**상태**: 📋 **설계 완료**