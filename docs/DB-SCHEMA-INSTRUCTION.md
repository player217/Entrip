# 📑 **DB 스키마 작성 + 마이그레이션 작업 지시서**

> **목표**
> OpenAPI 3.1 스펙(Entrip API.txt)에 정의된 모든 **Schemas**를 PostgreSQL + Prisma ORM으로 완전히 매핑하고, 자동 마이그레이션·시드·CI 파이프라인까지 일관되게 구성한다.

---

## 1️⃣ 준비 단계

| 항목         | 값 / 명령                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| DB 컨테이너    | `docker compose -f infra/postgres.yml up -d`                                    |
| Prisma CLI | `pnpm dlx prisma@latest`                                                        |
| 스키마 파일     | `apps/api/prisma/schema.prisma`                                                 |
| ENV 예시     | `DATABASE_URL="postgresql://entrip:entrip@localhost:5432/entrip?schema=public"` |
| 마이그레이션 폴더  | `apps/api/prisma/migrations`                                                    |
| 시드 스크립트    | `apps/api/prisma/seed.ts`                                                       |

> **TIP** : DB URL은 `.env`에만 두고, `schema.prisma`에서는 `${env:DATABASE_URL}`으로 참조.

---

## 2️⃣ 작성 규칙

1. **Naming**

   * 모델: PascalCase (`Booking`, `FinanceRecord`)
   * 필드: camelCase (`teamName`, `createdAt`)
   * Enum: PascalCase + 단수 (`BookingStatus`)
2. **공통 필드** (모든 모델에 추가)

   ```prisma
   id          String   @id @default(cuid())
   createdAt   DateTime @default(now())
   updatedAt   DateTime @updatedAt
   deletedAt   DateTime?
   ```
3. **Soft Delete** 만 사용, 실제 삭제는 실행하지 않음.
4. **관계 선언**

   * FK 이름 접미사 `Id` (`teamId`, `accountId`)
   * `onDelete: Restrict` 기본, 필요 시 `Cascade` 명시.
5. **Index**

   * 자주 조회되는 FK, `status`, `occurredAt` 등에 `@@index`.

---

## 3️⃣ 모델 매핑 안내

아래 예시는 **Booking** 스키마를 그대로 옮긴 것이다. 다른 스키마도 동일한 패턴으로 작성한다.

### 3.1 Booking 모델 예시

OpenAPI 정의 → 필드 매핑&#x20;

| OpenAPI 필드             | Prisma 타입              | 제약                |
| ---------------------- | ---------------------- | ----------------- |
| `teamName` (string)    | `String`               | @db.VarChar(100)  |
| `type` (string)        | `BookingType` (enum)   |                   |
| `origin` (string)      | `String`               | @db.VarChar(60)   |
| `destination` (string) | `String`               | @db.VarChar(60)   |
| `startDate` (date)     | `DateTime`             |                   |
| `endDate` (date)       | `DateTime`             |                   |
| `totalPax` (int ≥1)    | `Int`                  | @default(1)       |
| `coordinator` (string) | `String`               | @db.VarChar(60)   |
| `revenue` (number ≥0)  | `Decimal`              | @db.Numeric(14,2) |
| `notes` (string)       | `String?`              | @db.Text          |
| `status` (string)      | `BookingStatus` (enum) |                   |

```prisma
enum BookingType {
  incentive
  golf
  honeymoon
  airtel
  etc
}

enum BookingStatus {
  pending
  confirmed
  done
  cancelled
}

model Booking {
  id            String         @id @default(cuid())
  teamName      String         @db.VarChar(100)
  type          BookingType
  origin        String         @db.VarChar(60)
  destination   String         @db.VarChar(60)
  startDate     DateTime
  endDate       DateTime
  totalPax      Int            @default(1)
  coordinator   String         @db.VarChar(60)
  revenue       Decimal?       @db.Numeric(14, 2)
  notes         String?
  status        BookingStatus  @default(pending)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?
  /// 관계
  team          Team?          @relation(fields: [teamId], references: [id])
  teamId        String?
  auditLogs     AuditLog[]
}
```

### 3.2 CalendarEvent 모델 핵심 필드

* `start`, `end` → `DateTime`
* `allDay` → `Boolean`
* 색상 HEX → `String @db.Char(7)`
  원본 필드 참조&#x20;

### 3.3 FinanceRecord 모델 핵심 필드

* 금액 `amount` → `Decimal @db.Numeric(14,2)`
* 환율 `exchangeRate` → `Decimal(10,4)`
* 상태 ENUM(`pending/approved/rejected`)  &#x20;

### 3.4 Approval + ApprovalStep

* `Approval` ↔ `ApprovalStep` 1\:N
* `currentStep` 계산은 DB 트리거 대신 서비스 로직으로 처리
* `steps.order`에 유니크 제약 (`@@unique([approvalId, order])`)  &#x20;

> **작업 방법** : 각 OpenAPI Schemas 블록을 보고 위 스타일대로 모델을 반복 작성한다.

---

## 4️⃣ 마이그레이션 절차

1. **기본 마이그레이션 생성**

   ```bash
   pnpm dlx prisma migrate dev --name init-schema
   ```
2. **스키마 수정 시**

   ```bash
   pnpm dlx prisma migrate dev --name <change-desc>
   ```
3. **CI용 배포 명령** (GitHub Actions)

   ```yml
   - name: Migrate DB
     run: pnpm dlx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   ```
4. **프리뷰 환경**

   * Pull/PR마다 `DATABASE_URL`에 브랜치명 접미사(`entrip_preview_<sha>`)로 생성.
   * `prisma migrate deploy` 실행 후 `prisma db push` 로 초기화.

---

## 5️⃣ 시드 데이터

`apps/api/prisma/seed.ts`

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.booking.createMany({
    data: [
      {
        teamName: 'Demo Incentive',
        type: 'incentive',
        origin: 'ICN',
        destination: 'HND',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-05'),
        totalPax: 30,
        coordinator: '홍길동',
        revenue: 12000000,
        status: 'confirmed'
      }
    ]
  })
}

main().finally(() => prisma.$disconnect())
```

실행:

```bash
pnpm ts-node apps/api/prisma/seed.ts
```

---

## 6️⃣ Express 서비스 레이어 적용

```ts
// apps/api/src/services/booking.service.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createBooking = (dto: BookingCreateDto) =>
  prisma.booking.create({ data: dto });

export const listBookings = (query: ListQuery) =>
  prisma.booking.findMany({ where: { deletedAt: null }, ...query });

// PATCH /bookings/:id/status
export const updateStatus = (id: string, status: BookingStatus) =>
  prisma.booking.update({
    where: { id },
    data: { status }
  });
```

컨트롤러·라우터는 기존 구조 유지, 서비스만 교체.

---

## 7️⃣ QA 체크리스트

| 항목         | 확인 방법                                           |
| ---------- | ----------------------------------------------- |
| 모델 간 관계    | Prisma `prisma validate` 통과                     |
| Enum 누락 여부 | `grep -E "enum .*{" schema.prisma` 결과 ↔ OpenAPI |
| 마이그레이션 성공  | `psql -d entrip -c '\d booking'` 컬럼 확인          |
| 시드 삽입      | `SELECT COUNT(*) FROM booking;`                 |
| API 통합     | Postman `POST /bookings` → DB 반영                |

---

## 8️⃣ 커밋·PR 규칙

1. 커밋 메시지: `feat(db): add Booking & Calendar models`
2. PR 제목: `[DB] Booking/Calendar schema & migration`
3. PR 체크리스트

   * [ ] `prisma format` 실행
   * [ ] `pnpm lint && pnpm test` 통과
   * [ ] 마이그레이션 파일 포함
   * [ ] 시드 스크립트 업데이트

---

### 🚀 **바로 실행 순서**

1. Postgres 컨테이너 기동
2. `.env` 설정 → `DATABASE_URL` 입력
3. `schema.prisma`에 공통 필드 + **Booking** 모델부터 작성
4. `pnpm dlx prisma migrate dev --name init-booking`
5. Express 서비스 레이어 교체 후 `/bookings` API 호출 테스트
6. 동일 방식으로 Calendar → Finance → Approval → Account 모델 순차 추가
7. CI 파이프라인에 `prisma migrate deploy` 스텝 추가
8. `seed.ts` 작성 후 `ts-node` 실행으로 데모 데이터 채움

> 이 지시서를 그대로 수행하면 **OpenAPI ↔ DB ↔ Express** 전 구간이 일치하며, 이후 프런트엔드에서는 SWR 훅만 교체해도 실데이터로 전환됩니다.