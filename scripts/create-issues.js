#!/usr/bin/env node

/**
 * GitHub Issue 자동 생성 스크립트
 * 사용법: node scripts/create-issues.js --epic M0
 */

const epics = {
  'M0': [
    {
      title: '[BE0-4] OpenAPI v1.0 최종화',
      body: `## 📌 요약
OpenAPI 3.1 스펙 완성 및 CI 파이프라인 통합

## 🎯 완료 조건
- [x] OpenAPI 3.1 스펙 완성 (be-doc3-final-v2.diff 적용)
- [ ] GitHub Actions에 openapi:lint 추가
- [ ] API 계약 테스트 구성
- [ ] OpenAPI → TypeScript 타입 자동 생성

## 📝 세부 사항
- Redocly CLI 검증 통과 (0 errors)
- 모든 엔드포인트 operationId 지정
- 공통 컴포넌트 재사용 (Parameters, Responses)

## 🔗 관련 PR
- #be-doc-fixes-final
- #be-doc2-complete
- #be-doc3-final`,
      labels: ['backend', 'documentation', 'high-priority'],
      milestone: 'M0'
    },
    {
      title: '[OPS-1] CI/CD 파이프라인 구축',
      body: `## 📌 요약
모든 PR이 자동 검증되는 GitHub Actions 워크플로우 구축

## 🎯 완료 조건
- [ ] .github/workflows/ci.yml 작성
- [ ] Lint, Type Check, Test 단계 구성
- [ ] OpenAPI Validation 단계 추가
- [ ] Branch Protection Rules 설정
- [ ] Turborepo 캐싱 설정

## 📝 워크플로우 단계
\`\`\`yaml
- Checkout
- Setup Node + pnpm
- Install Dependencies
- Lint (ESLint + Prettier)
- Type Check
- Unit Tests
- OpenAPI Lint
- Build Verification
\`\`\`

## 🔗 관련 이슈
- Epic: Infrastructure Setup`,
      labels: ['devops', 'ci/cd', 'high-priority'],
      milestone: 'M0'
    }
  ],
  'M1': [
    {
      title: '[FE-TAB-3] Chrome Tab System 구현',
      body: `## 📌 요약
다중 작업을 위한 Chrome 스타일 탭 시스템 구현

## 🎯 완료 조건
- [ ] ChromeTabContainer 컴포넌트 완성
- [ ] 탭 상태 localStorage 저장/복원
- [ ] Drag & Drop 재정렬 (react-beautiful-dnd)
- [ ] 탭 컨텍스트 메뉴
- [ ] Storybook 스토리 작성
- [ ] 단위 테스트 (80% 커버리지)

## 📝 기능 명세
- 최대 10개 탭 제한
- 탭 고정 기능
- 중복 탭 방지
- 키보드 단축키 (Ctrl+W, Ctrl+Tab)

## 🔗 관련 이슈
- Design: Zapier 스타일 UI
- Epic: Core UI Components`,
      labels: ['frontend', 'ui', 'high-priority'],
      milestone: 'M1'
    },
    {
      title: '[FE-DB-5] Dashboard 위젯 구현',
      body: `## 📌 요약
대시보드 페이지의 핵심 위젯 4종 구현

## 🎯 완료 조건
- [ ] 금일 업무 카드 컴포넌트
- [ ] 진행 프로젝트 차트 (Recharts)
- [ ] 프로젝트 검색 (150ms 응답)
- [ ] 미니 메일/알림 프리뷰
- [ ] 반응형 레이아웃
- [ ] 로딩 스켈레톤

## 📝 API 연동
- GET /api/v1/bookings?date=today
- GET /api/v1/metrics/dashboard
- GET /api/v1/bookings/search?q=
- GET /api/v1/mail/unread?limit=5

## 🔗 관련 이슈
- Backend: Dashboard API
- Design: Widget Mockups`,
      labels: ['frontend', 'dashboard', 'high-priority'],
      milestone: 'M1'
    }
  ],
  'M2': [
    {
      title: '[BE-BK-7] Booking API 구현 (Nest.js)',
      body: `## 📌 요약
예약 관리 CRUD API 및 비즈니스 로직 구현

## 🎯 완료 조건
- [ ] Prisma Schema 정의
- [ ] CRUD 서비스 구현
- [ ] 검색/필터 API
- [ ] 권한 검증 Guard
- [ ] 단위/통합 테스트
- [ ] OpenAPI 스펙 동기화

## 📝 엔드포인트
- GET /api/v1/bookings
- GET /api/v1/bookings/:id
- POST /api/v1/bookings
- PUT /api/v1/bookings/:id
- PATCH /api/v1/bookings/:id
- DELETE /api/v1/bookings/:id
- GET /api/v1/bookings/search

## 🔗 관련 이슈
- Frontend: Booking UI
- Database: Schema Design`,
      labels: ['backend', 'api', 'high-priority'],
      milestone: 'M2'
    },
    {
      title: '[FE-BK-9] 예약 관리 UI 구현',
      body: `## 📌 요약
예약 조회(캘린더/리스트) 및 등록/수정 폼 구현

## 🎯 완료 조건
- [ ] 캘린더 뷰 (월간/주간)
- [ ] 리스트 뷰 (DataGrid)
- [ ] Drawer 폼 컴포넌트
- [ ] 실시간 유효성 검증
- [ ] 파일 업로드 (S3)
- [ ] 상태 관리 (Zustand)

## 📝 주요 기능
- 드래그 앤 드롭 일정 변경
- 인라인 편집
- 일괄 상태 변경
- Excel 내보내기
- 고급 필터링

## 🔗 관련 이슈
- Backend: Booking API
- Design: Booking Mockups`,
      labels: ['frontend', 'booking', 'high-priority'],
      milestone: 'M2'
    }
  ]
};

// 실행 로직
const args = process.argv.slice(2);
const epicFlag = args.indexOf('--epic');
const epicName = epicFlag !== -1 ? args[epicFlag + 1] : null;

if (!epicName || !epics[epicName]) {
  console.log('사용법: node scripts/create-issues.js --epic [M0|M1|M2|M3|M4]');
  console.log('사용 가능한 Epic:', Object.keys(epics).join(', '));
  process.exit(1);
}

console.log(`\n🎯 ${epicName} Epic의 이슈들:\n`);
console.log('다음 명령어로 GitHub Issue를 생성하세요:\n');

epics[epicName].forEach((issue, index) => {
  console.log(`# Issue ${index + 1}: ${issue.title}`);
  console.log(`gh issue create \\
  --title "${issue.title}" \\
  --body "${issue.body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" \\
  --label "${issue.labels.join(',')}" \\
  --milestone "${issue.milestone}"\n`);
});

console.log('\n💡 Tip: 모든 이슈를 한 번에 생성하려면:');
console.log(`node scripts/create-issues.js --epic ${epicName} | grep "^gh issue" | sh\n`);