# Entrip 통합 작업 Epic 분해

## 🎯 M0: CI Green & API v1 Freeze (D-2)

### Epic: BE0-4 - OpenAPI v1.0 최종화
**목표:** OpenAPI 스펙 완성 및 CI 파이프라인 통합
- ✅ OpenAPI 3.1 스펙 완성 (be-doc3-final-v2.diff 적용)
- [ ] GitHub Actions에 openapi:lint 추가
- [ ] API 계약 테스트 구성
- [ ] OpenAPI → TypeScript 타입 자동 생성

### Epic: OPS-1 - CI/CD 파이프라인 구축
**목표:** 모든 PR이 자동 검증되는 환경 구축
- [ ] GitHub Actions 워크플로우 구성
  - Lint (ESLint, Prettier)
  - Type Check
  - Unit Tests (Jest)
  - OpenAPI Validation (Redocly)
  - Build Verification
- [ ] Branch Protection Rules 설정
- [ ] Turborepo 캐싱 최적화

---

## 🏠 M1: 고정 UI + Dashboard MVP (1주)

### Epic: FE-TAB-3 - Chrome Tab System
**목표:** 다중 작업 탭 시스템 구현
- [ ] ChromeTabContainer 컴포넌트 완성
- [ ] 탭 상태 localStorage 저장/복원
- [ ] Drag & Drop 재정렬
- [ ] 탭 컨텍스트 메뉴 (닫기, 모두 닫기, 고정)

### Epic: FE-DB-5 - Dashboard 위젯
**목표:** 대시보드 핵심 위젯 구현
- [ ] 금일 업무 카드 컴포넌트
- [ ] 진행 프로젝트 차트 (Recharts)
- [ ] 프로젝트 검색 (실시간 필터링)
- [ ] 미니 메일/알림 프리뷰

### Epic: FE-HEADER-1 - 상단 고정 Action Bar
**목표:** Header 기능 컴포넌트 구현
- [ ] 환율 Ticker (SWR 15분 캐싱)
- [ ] 알림 토스트 센터
- [ ] 메신저 Launch 버튼
- [ ] 사용자 Dropdown 메뉴

---

## 📅 M2: 예약 조회·등록 End-to-End (2주)

### Epic: BE-BK-7 - Booking API (Nest.js)
**목표:** 예약 CRUD API 구현
- [ ] Prisma Schema 정의
  ```prisma
  model Booking {
    id            String   @id @default(cuid())
    customerName  String
    destination   String
    startDate     DateTime
    endDate       DateTime
    paxCount      Int
    status        BookingStatus
    totalPrice    Decimal
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
    history       BookingHistory[]
  }
  ```
- [ ] CRUD 서비스 구현
- [ ] 권한 검증 미들웨어
- [ ] 검색/필터 최적화 (인덱싱)

### Epic: FE-BK-9 - 예약 관리 UI
**목표:** 캘린더/리스트 뷰 + 등록/수정 폼
- [ ] 캘린더 뷰 (월간/주간)
- [ ] 리스트 뷰 (DataGrid)
- [ ] Drawer 폼 컴포넌트
- [ ] 실시간 유효성 검증
- [ ] 파일 업로드 (S3 연동)

---

## 📊 M3: 운영현황 차트 + 승인 플로우 (2주)

### Epic: FE-AN-4 - Analytics Dashboard
**목표:** 운영 현황 시각화
- [ ] 기간 선택기 (DateRangePicker)
- [ ] 매출/수익률 Dual-Axis Chart
- [ ] 담당자별 Pie Chart
- [ ] PDF 보고서 생성 (@react-pdf/renderer)

### Epic: BE-AP-2 - Approval System
**목표:** 결재 워크플로우 구현
- [ ] Approval 엔티티 설계
- [ ] 역할 기반 권한 체크
- [ ] 일괄 결재 API
- [ ] FCM Push 알림 연동

---

## 💰 M4: 계좌관리 + 메신저 Bridge (2주)

### Epic: BE-AC-1 - Account Management
**목표:** 계좌 및 거래내역 관리
- [ ] Account CRUD API
- [ ] Transaction 내역 관리
- [ ] 프로젝트 외 집행 처리

### Epic: FE-MS-3 - Messenger Integration
**목표:** Mattermost 연동
- [ ] OAuth SSO 구현
- [ ] 메신저 Embed
- [ ] 알림 동기화

---

## 🔧 기술 스택 & 인프라

### 데이터베이스 마이그레이션
```bash
# Prisma 초기 설정
npx prisma init
npx prisma migrate dev --name init

# 시드 데이터
npx prisma db seed
```

### API 타입 생성
```json
{
  "scripts": {
    "api:gen": "openapi-typescript openapi.json -o packages/shared/src/generated/api.d.ts",
    "api:watch": "nodemon --watch openapi.json --exec npm run api:gen"
  }
}
```

### 환경 변수 설정
```env
# .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/entrip
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
S3_BUCKET=entrip-uploads
FCM_SERVER_KEY=
MATTERMOST_URL=
```

---

## 📋 Issue 템플릿

### Feature Issue
```markdown
## 📌 요약
[기능 요약 1-2줄]

## 🎯 완료 조건
- [ ] 구현 완료
- [ ] 단위 테스트 작성
- [ ] Storybook 스토리 추가 (UI 컴포넌트)
- [ ] 문서 업데이트

## 📝 세부 사항
[구현 세부사항]

## 🔗 관련 이슈
- Epic: #
- API: #
```

### Backend Issue
```markdown
## 📌 요약
[API 엔드포인트 요약]

## 🎯 완료 조건
- [ ] API 구현
- [ ] OpenAPI 스펙 업데이트
- [ ] 단위/통합 테스트
- [ ] Postman 컬렉션 추가

## 📝 엔드포인트
- `GET /api/v1/...`
- `POST /api/v1/...`

## 🔗 관련 이슈
- Epic: #
- Frontend: #
```

---

## 🚀 실행 계획

### Week 0 (D-2)
1. CI 파이프라인 구축
2. OpenAPI 최종화
3. 개발 환경 표준화

### Week 1-2
1. 고정 UI 구현 (Header, Sidebar, Tabs)
2. Dashboard MVP
3. 기본 라우팅 설정

### Week 3-4
1. Booking 전체 플로우
2. 캘린더/리스트 뷰
3. 등록/수정 폼

### Week 5-6
1. Analytics 차트
2. Approval 시스템
3. 권한 관리

### Week 7-8
1. Account Management
2. Messenger 연동
3. 성능 최적화

### Week 9+
1. 테스트 커버리지 80%
2. 문서화
3. 배포 준비