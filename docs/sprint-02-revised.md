# Sprint 02 — Detailed Task Breakdown (Revised)

**기간**: 2025-06-17 (화) ~ 2025-06-28 (토) / 10 BD (2주)  
**목표**: Phase 2 우선 과제(P0 ~ P2) 완료 + E2E 기초 구축

## 0. 스프린트 운영 규칙

| 구분 | 내용 |
|------|------|
| Stand-up | 매일 10:00 / 15분, 진행·막힘 공유 |
| Branch Name | `feature/<task-id>-<slug>` ex) `feature/P0-sidebar-nav` |
| Commit Style | `feat:` / `fix:` / `test:` / `chore:` + 1-line summary |
| PR Checklist | ✓ lint 통과 ✓ unit test 통과 ✓ Storybook Story 추가 ✓ Docs 업데이트 |
| Definition of Done | 코드 + 테스트 + 스토리 + 문서 + CI green + review 2인 OK |

### Branch Name 예시
- `feature/Sprint02-P0-1-sidebar-nav` - 라우트 상수화 작업
- `feature/Sprint02-P1-2-ui-components` - UI 컴포넌트 작업
- `feature/Sprint02-P2-1-reservations-page` - 예약 페이지 구현
- `fix/Sprint02-msw-dev-only` - MSW 개발 환경 제한 수정

## 1. 문서 & PR 템플릿

### PR 템플릿 (.github/PULL_REQUEST_TEMPLATE.md)
```markdown
## 변경 사항
- [ ] 어떤 기능을 추가/수정했나요?

## 체크리스트
- [ ] lint 통과
- [ ] unit test 통과
- [ ] Storybook Story 추가 (UI 컴포넌트의 경우)
- [ ] 문서 업데이트

## 스크린샷 (해당되는 경우)
```

### API 문서 초안 (docs/api-contract.md)
- 엔드포인트·파라미터 표
- Swagger 참고 링크
- 인증 방식 명시

## 2. Task Matrix

### 🟥 P0 (스프린트 내 절대 완료)

| ID | 모듈 | 세부 작업 | 담당 | Est | 도착 조건 |
|----|------|-----------|------|-----|-----------|
| P0-1 | Layout | Sidebar·Header 링크 경로 상수화 (`routes.ts`) + active 상태 처리 (`usePathname`) | FE 공통 | 3h | 모든 메뉴 ▶ 정확한 라우팅, `<NavItem active>` 색상 변경 |
| P0-2 | Storybook | Header, Sidebar, ExchangeTicker, Loader 스토리 작성 + Docs tab 정리 | FE 공통 | 4h | `pnpm storybook` → 4 컴포넌트 Docs 표시 |
| P0-3 | MSW | `src/mocks/` 폴더 + `browser.ts`, `handlers.ts` 작성, `msw init public/` → SW 등록, dev bootstrap | FE 플랫폼 | 5h | `pnpm dev` 콘솔 "MSW enabled" 표시 & 더미 /fx 응답 OK |

### 🟧 P1 (품질 보증 강화)

| ID | 모듈 | 세부 작업 | 담당 | Est | 도착 조건 |
|----|------|-----------|------|-----|-----------|
| P1-1 | Testing | Zustand store (unit) 3종 테스트 (`dashboard`, `booking`, `session`) | FE 테스트 | 6h | CI `pnpm test` green, 커버리지 > 60% line |
| P1-2 | UI | Loader, Error 컴포넌트 구현 + 공통 스핀 SVG 토큰 사용 + 스토리 | FE 컴포넌트 | 3h | 로딩/에러 상태 모두 통일된 스타일, Docs tab 표시 |

### 🟨 P2 (기능 스켈레톤)

| ID | 모듈 | 세부 작업 | 담당 | Est | 도착 조건 |
|----|------|-----------|------|-----|-----------|
| P2-1 | 예약 관리 | `/reservations` 페이지 Container → Tab: Calendar, List | 예약 팀 | 2d | 페이지 렌더링 + View 전환 무에러 |
| P2-2 | 통계 대시보드 | `/stats` 페이지 • 매출 ChartCard (Bar) • 담당자 DoughnutCard (Pie) | 통계 팀 | 1.5d | 더미 데이터로 두 그래프 출력 ✔ |

### 🟩 P3 (기초 E2E 체계)

| ID | 모듈 | 세부 작업 | 담당 | Est | 도착 조건 |
|----|------|-----------|------|-----|-----------|
| P3-1 | QA | Playwright 셋업 (`playwright.config.ts`) + GH Action job 추가 | QA | 4h | CI run → playwright-report artifact 업로드 |
| P3-2 | QA | 대시보드 → Sidebar 클릭 → 예약 페이지 전환 시나리오 1건 구현 | QA | 3h | e2e 테스트 녹색, 스크린샷 캡처 저장 |

**총 추정**: ~ 7.5 MD (개발) / ~ 1 MD (QA)

## 3. 공통 코드 가이드

### 3-1. 라우트 상수 예시
```typescript
// packages/shared/routes.ts
export const ROUTES = {
  home: '/',
  stats: '/stats',
  reservations: '/reservations',
  approval: '/approval',
  accounts: '/accounts',
  mail: '/mail',
  chat: '/chat'
} as const;
```

### 3-2. MSW 엔트리
```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

```typescript
// apps/web/app/layout.tsx (client-side only)
if (process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
  import('../../mocks').then(({ worker }) => worker.start());
}
```

### 3-3. Zustand 테스트 패턴

**Dashboard Store 테스트**
```typescript
import { act } from '@testing-library/react';
import { useDashboardStore } from '../stores/dashboard';

test('setStats updates state', () => {
  const { result } = renderHook(() => useDashboardStore());
  act(() => result.current.setStats(dummyStats));
  expect(result.current.stats).toEqual(dummyStats);
});
```

**Booking Store 테스트**
```typescript
test('addBooking adds new booking', () => {
  const { result } = renderHook(() => useBookingStore());
  const newBooking = { id: '1', teamName: '테스트팀', ... };
  
  act(() => result.current.addBooking(newBooking));
  expect(result.current.bookings).toContainEqual(newBooking);
});
```

**Session Store 테스트**
```typescript
test('login updates user session', () => {
  const { result } = renderHook(() => useSessionStore());
  const userData = { id: '1', name: '김엔트립', role: 'admin' };
  
  act(() => result.current.login(userData));
  expect(result.current.user).toEqual(userData);
  expect(result.current.isAuthenticated).toBe(true);
});
```

### 3-4. Loader/Error 통일 토큰

**Tailwind Config**
```javascript
// tailwind.config.js extend
animation: {
  spin: 'spin 1s linear infinite',
  shimmer: 'shimmer 2s linear infinite',
},
keyframes: {
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' }
  }
}
```

**Global CSS (추가 필요)**
```css
/* apps/web/app/globals.css */
@layer utilities {
  .shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
  }
}
```

## 4. CI Workflow 확장

### 4-1. 기본 CI 워크플로
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build:tokens
      - run: pnpm lint
      - run: pnpm test -- --runInBand
      - run: pnpm build --filter apps/web...
```

### 4-2. E2E 워크플로 (별도)
```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm build --filter=web
      - run: npx start-server-and-test 'pnpm --filter=web start' http://localhost:3000 'npx playwright test'
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### 4-3. Storybook & Chromatic (추후)
```yaml
- name: Build Storybook
  run: pnpm build-storybook
  
- name: Publish to Chromatic
  uses: chromaui/action@v1
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

## 5. 스프린트 달력 (수정)

| 날짜 | 주요 목표 |
|------|-----------|
| 6/17 (화) | P0-1 착수 / MSW 설계 |
| 6/19 (목) | P0 전체 PR Merge → 빙고 리뷰 |
| 6/20 (금) | P1 테스트 구현 완료 / P1 PR |
| 6/24 (화) | P2 예약·통계 페이지 스켈레톤 완료 |
| 6/26 (목) | P3 E2E 시나리오 통과 / 리포트 아카이브 |
| 6/28 (토) | Sprint Review + Retro + Phase 3 계획 확정 |

**담당 팀은 위 표에 따라 브랜치 생성 후 작업 착수, Stand-up 때 진행 상황 공유 바랍니다.**  
**문의·이슈는 GitHub Issue + Slack #entrip-frontend 채널에 등록하세요.**
