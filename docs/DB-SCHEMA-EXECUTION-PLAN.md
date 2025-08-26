# 📋 DB 스키마 작성 실행 계획서 (주석 포함)

> **작성일**: 2025-01-13  
> **목적**: DB-SCHEMA-INSTRUCTION.md를 단계별로 실행하기 위한 상세 계획

## 🎯 전체 목표
OpenAPI 3.1 스펙에 정의된 모든 스키마를 PostgreSQL + Prisma ORM으로 완전히 매핑하고, 마이그레이션·시드·CI 파이프라인까지 구성

## 📝 단계별 실행 계획

### Phase 0: 사전 확인 (10분)
```bash
# [주석] 먼저 OpenAPI 스펙 파일 위치와 내용을 확인해야 함
# Entrip API.txt 파일에서 Schemas 섹션을 분석하여 모든 모델 목록을 작성
```
- [ ] OpenAPI 스펙 파일 (Entrip API.txt) 위치 확인
- [ ] Schemas 섹션에서 모델 목록 추출
  - Booking
  - CalendarEvent
  - FinanceRecord
  - Approval & ApprovalStep
  - Account
  - Team (참조용)
  - Customer (참조용)
  - AuditLog

### Phase 1: 환경 설정 (30분)
```bash
# [주석] Docker가 설치되어 있지 않으면 먼저 설치 필요
# WSL 환경에서는 Docker Desktop for Windows 사용 권장
```
- [ ] Docker 설치 상태 확인
- [ ] `infra/postgres.yml` 파일 생성
  ```yaml
  # [주석] PostgreSQL 14 버전 사용, 기본 포트 5432
  version: '3.8'
  services:
    postgres:
      image: postgres:14-alpine
      environment:
        POSTGRES_USER: entrip
        POSTGRES_PASSWORD: entrip
        POSTGRES_DB: entrip
      ports:
        - "5432:5432"
      volumes:
        - postgres_data:/var/lib/postgresql/data
  volumes:
    postgres_data:
  ```
- [ ] PostgreSQL 컨테이너 실행
- [ ] 연결 테스트

### Phase 2: Prisma 초기 설정 (20분)
```bash
# [주석] apps/api 디렉토리가 없으면 packages/api 사용
# Prisma는 별도 패키지로 관리하는 것이 좋음
```
- [ ] `packages/api` 디렉토리 생성 (없는 경우)
- [ ] `packages/api/package.json` 생성
  ```json
  {
    "name": "@entrip/api",
    "version": "1.0.0",
    "private": true,
    "scripts": {
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate dev",
      "db:push": "prisma db push",
      "db:seed": "tsx prisma/seed.ts"
    },
    "dependencies": {
      "@prisma/client": "^5.7.0",
      "express": "^4.18.2"
    },
    "devDependencies": {
      "prisma": "^5.7.0",
      "@types/express": "^4.17.21",
      "tsx": "^4.7.0"
    }
  }
  ```
- [ ] Prisma 설치: `pnpm install`
- [ ] Prisma 초기화: `pnpm dlx prisma init`
- [ ] `.env` 파일에 DATABASE_URL 설정

### Phase 3: 스키마 작성 - 기본 구조 (15분)
```prisma
# [주석] datasource와 generator는 Prisma의 필수 설정
# previewFeatures는 필요에 따라 추가 (jsonProtocol 등)
```
- [ ] `packages/api/prisma/schema.prisma` 기본 구조 작성
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  generator client {
    provider = "prisma-client-js"
  }
  ```

### Phase 4: 스키마 작성 - Booking 모델 (30분)
```prisma
# [주석] 첫 번째 모델은 가장 중요한 Booking부터 시작
# Team 모델은 아직 없으므로 관계는 나중에 추가
```
- [ ] BookingType, BookingStatus enum 작성
- [ ] Booking 모델 작성 (관계 제외)
- [ ] 공통 필드 패턴 확인
- [ ] `prisma validate` 실행

### Phase 5: 첫 번째 마이그레이션 (20분)
```bash
# [주석] 첫 마이그레이션은 기본 구조 확립이 중요
# 실패하면 migrations 폴더를 삭제하고 다시 시도
```
- [ ] 마이그레이션 생성: `pnpm db:migrate -- --name init-booking`
- [ ] 생성된 SQL 파일 검토
- [ ] 데이터베이스 확인 (테이블 생성 여부)
- [ ] Prisma Client 생성: `pnpm db:generate`

### Phase 6: Express 서비스 연동 (45분)
```typescript
# [주석] 기존 MSW mock을 실제 DB 서비스로 교체
# 트랜잭션 처리와 에러 핸들링 중요
```
- [ ] `packages/api/src/services/booking.service.ts` 생성
- [ ] CRUD 메서드 구현
- [ ] 상태 변경 메서드 구현
- [ ] 에러 처리 로직 추가
- [ ] 기존 Mock 핸들러와 인터페이스 맞추기

### Phase 7: 나머지 모델 추가 (2시간)
```prisma
# [주석] 모델 간 관계는 모든 모델이 정의된 후 추가
# 순환 참조 주의 (예: Team ↔ Booking)
```
- [ ] CalendarEvent 모델
  - [ ] 색상 필드는 HEX 형식 검증 추가
  - [ ] allDay 필드 처리 로직
- [ ] FinanceRecord 모델
  - [ ] 금액 필드 정밀도 설정
  - [ ] 환율 계산 로직 고려
- [ ] Approval & ApprovalStep 모델
  - [ ] 1:N 관계 설정
  - [ ] order 유니크 제약
- [ ] Account 모델
  - [ ] 역할 기반 접근 제어 필드
- [ ] 보조 모델 (Team, Customer, AuditLog)

### Phase 8: 모델 관계 설정 (30분)
```prisma
# [주석] 관계 설정 시 onDelete 정책 신중히 결정
# Soft Delete 사용하므로 대부분 Restrict 사용
```
- [ ] Booking ↔ Team 관계
- [ ] Booking ↔ Customer 관계
- [ ] FinanceRecord ↔ Booking 관계
- [ ] Approval ↔ 관련 엔티티 관계
- [ ] AuditLog ↔ 모든 엔티티 관계 (polymorphic)

### Phase 9: 인덱스 최적화 (20분)
```prisma
# [주석] 쿼리 패턴 분석 후 인덱스 추가
# 복합 인덱스는 순서가 중요함
```
- [ ] 자주 조회되는 필드 인덱스
  - [ ] status 필드들
  - [ ] 날짜 필드들 (startDate, endDate)
  - [ ] FK 필드들
- [ ] 복합 인덱스 추가
  - [ ] (teamId, status)
  - [ ] (startDate, endDate)

### Phase 10: 시드 데이터 작성 (30분)
```typescript
# [주석] 개발/테스트용 기본 데이터 세트
# 실제 업무 시나리오를 반영한 데이터 구성
```
- [ ] `packages/api/prisma/seed.ts` 작성
- [ ] 각 모델별 샘플 데이터 5-10개
- [ ] 관계 데이터 포함
- [ ] 다양한 상태값 포함
- [ ] 시드 실행 및 검증

### Phase 11: CI/CD 파이프라인 (30분)
```yaml
# [주석] GitHub Actions에서 마이그레이션 자동화
# PR별로 프리뷰 DB 생성 고려
```
- [ ] `.github/workflows/db-migrate.yml` 생성
- [ ] 마이그레이션 검증 스텝
- [ ] 프리뷰 환경 설정
- [ ] 롤백 전략 수립

### Phase 12: 문서화 및 검증 (30분)
```markdown
# [주석] 팀원들이 로컬에서 쉽게 셋업할 수 있도록
# 트러블슈팅 가이드 포함
```
- [ ] DB 셋업 가이드 작성
- [ ] 스키마 다이어그램 생성 (prisma-erd-generator)
- [ ] API ↔ DB 매핑 문서
- [ ] 로컬 개발 환경 가이드

## ⏱️ 예상 소요 시간
- **총 소요 시간**: 약 7-8시간
- **Phase 1-6**: 3시간 (기본 구조 및 Booking 모델)
- **Phase 7-9**: 3시간 (나머지 모델 및 관계)
- **Phase 10-12**: 1-2시간 (시드, CI/CD, 문서화)

## 🚨 주의 사항
1. **마이그레이션 실패 시**
   - `prisma/migrations` 폴더 삭제
   - 데이터베이스 초기화: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
   - 다시 마이그레이션 실행

2. **타입 불일치 시**
   - OpenAPI 스펙과 Prisma 타입 매핑 재확인
   - Decimal vs Float 선택 주의
   - DateTime vs String(ISO) 변환

3. **성능 고려사항**
   - N+1 쿼리 방지 (include 사용)
   - 대량 데이터 처리 시 cursor 기반 페이지네이션
   - 복잡한 집계는 Raw Query 고려

## 📊 진행 상황 추적
각 Phase 완료 시마다:
1. 커밋 생성
2. 테스트 실행
3. 진행률 업데이트
4. 이슈 사항 기록

## 🎯 성공 기준
- [ ] 모든 OpenAPI 스키마가 Prisma 모델로 매핑됨
- [ ] 마이그레이션이 성공적으로 적용됨
- [ ] 시드 데이터가 정상 삽입됨
- [ ] Express API가 실제 DB와 연동됨
- [ ] CI/CD 파이프라인이 작동함
- [ ] 문서화가 완료됨

---

> **다음 단계**: Phase 0부터 순차적으로 실행하며, 각 단계별 결과를 확인 후 진행