<!-- TEMPLATE_VERSION: SINGLE_FILE_V1 -->
<!-- LOCAL_COMMIT: f4b11b7 -->
⚠️ 오프라인 환경입니다. git push 금지.

# 🔖 Entrip 예약·관리 1차 개발 작업

## 1. 기존 지시
```
## Entrip 예약·관리 1차 개발 작업 지시서

> **목표** – "예약 등록 → 조회 → 수정 → 상태변경" 전체 플로우를 **PostgreSQL + Prisma + Express**에서 동작하도록 구현한다.
> 모든 작업은 **로컬**에서 수행하며, 원격 Git push는 하지 않는다.

### 0. 환경 준비
- Postgres 컨테이너 기동
- .env 설정 (DATABASE_URL=postgresql://entrip:entrip@localhost:5432/entrip?schema=public)

### 1. DB 스키마 & 마이그레이션
- Booking 모델 (최소 필드)
- BookingType enum (incentive, golf, honeymoon, airtel, etc)
- BookingStatus enum (pending, confirmed, done, cancelled)
- 마이그레이션 실행

### 2. 서비스 레이어 작성
- createBooking, listBookings, getBooking, updateBooking, changeStatus

### 3. API 라우터
- POST /, GET /, GET /:id, PATCH /:id, PATCH /:id/status

### 4. 시드 데이터
- 3개 샘플 예약 데이터

### 5. 단위 & 통합 테스트
- Jest + Supertest 기반 API 테스트

### 6. 프런트엔드 연결 (요약)
- SWR 훅 URL 교체
- NewTeamModal save → POST /bookings
- 캘린더 드래그 → PATCH /bookings/:id
- 상태 드롭다운 → PATCH /bookings/:id/status
```

## 2. 계획
1. 환경 준비 (PostgreSQL docker-compose, .env 설정)
2. API 프로젝트 구조 생성 (apps/api/)
3. Prisma 스키마 정의 (Booking 모델 + enum들)
4. 서비스 레이어 구현 (CRUD 기능)
5. Express API 라우터 구현 (RESTful endpoints)
6. 시드 데이터 작성 및 실행
7. Jest 기반 단위/통합 테스트 작성
8. 로컬 커밋 수행

## 3. 작업 내용
```bash
# 1. 환경 준비
mkdir -p infra apps/api/src/{services,routes} apps/api/prisma apps/api/tests

# PostgreSQL docker-compose 설정
cat > infra/postgres.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: entrip-postgres
    environment:
      POSTGRES_USER: entrip
      POSTGRES_PASSWORD: entrip
      POSTGRES_DB: entrip
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
volumes:
  postgres_data:
EOF

# .env 설정
echo 'DATABASE_URL=postgresql://entrip:entrip@localhost:5432/entrip?schema=public' > apps/api/.env

# 2. package.json 생성
# 3. Prisma 스키마 생성 (Booking 모델)
# 4. 서비스 레이어 구현
# 5. API 라우터 구현
# 6. Express 앱 메인 파일 생성
# 7. 시드 데이터 파일 생성
# 8. Jest 테스트 파일 생성
# 9. TypeScript/Jest 설정 파일 생성
```

## 4. 핵심 코드 스냅샷

### Prisma 스키마 (apps/api/prisma/schema.prisma)
```prisma
model Booking {
  id          String        @id @default(cuid())
  teamName    String        @db.VarChar(100)
  type        BookingType
  origin      String        @db.VarChar(60)
  destination String        @db.VarChar(60)
  startDate   DateTime
  endDate     DateTime
  totalPax    Int           @default(1)
  coordinator String        @db.VarChar(60)
  revenue     Decimal?      @db.Numeric(14, 2)
  status      BookingStatus @default(pending)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?
}

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
```

### 서비스 레이어 (apps/api/src/services/booking.service.ts)
```typescript
import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// 등록
export const createBooking = (dto: any) =>
  prisma.booking.create({ data: dto });

// 목록
export const listBookings = (query: any) =>
  prisma.booking.findMany({
    where: { deletedAt: null, ...query.filters },
    orderBy: { startDate: 'asc' },
    skip: query.skip,
    take: query.take
  });

// 상세
export const getBooking = (id: string) =>
  prisma.booking.findUnique({ where: { id } });

// 수정
export const updateBooking = (id: string, dto: any) =>
  prisma.booking.update({ where: { id }, data: dto });

// 상태변경
export const changeStatus = (id: string, status: BookingStatus) =>
  prisma.booking.update({ where: { id }, data: { status } });
```

### API 라우터 (apps/api/src/routes/booking.route.ts)
```typescript
import { Router } from 'express';
import * as svc from '../services/booking.service';

const r = Router();

r.post('/', async (req, res) => {
  try {
    const b = await svc.createBooking(req.body);
    res.status(201).json(b);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

r.get('/', async (req, res) => {
  try {
    const list = await svc.listBookings(req.query);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id, PATCH /:id, PATCH /:id/status 구현
```

### Express 앱 메인 파일 (apps/api/src/app.ts)
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRouter from './routes/booking.route';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/bookings', bookingRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;
```

## 5. 기타 / 이슈
- Docker 없이 환경 구성: WSL2에서 Docker 사용 불가로 PostgreSQL 컨테이너 기동 생략
- 실제 DB 연결 없이 구조만 생성: 마이그레이션 및 시드 실행은 PostgreSQL 연결 후 수행 예정
- 프로젝트 구조만 생성: 의존성 설치 및 빌드는 별도 수행 필요

## 6. 다음 단계
- PostgreSQL 컨테이너 기동 (Docker 환경 준비 후)
- 의존성 설치: `cd apps/api && pnpm install`
- Prisma 마이그레이션: `pnpm dlx prisma migrate dev --name init-booking`
- 시드 데이터 실행: `pnpm run seed`
- API 서버 기동: `pnpm run dev`
- 테스트 실행: `pnpm test`
- 프런트엔드 연동 작업 시작