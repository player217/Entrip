# Entrip 테스팅 가이드

## 개요
이 문서는 Entrip 프로젝트의 테스트 작성 가이드입니다.

## 테스트 원칙

### 1. 테스트 커버리지 목표
- 전체 라인 커버리지: **85% 이상**
- 핵심 컴포넌트 커버리지: **90% 이상**
- 유틸리티 함수 커버리지: **100%**

### 2. 테스트 작성 시점
- 기능 구현과 테스트는 **별도 티켓**으로 관리
- 기능 PR 머지 전 테스트 PR 필수
- TDD 권장 (선택사항)

## 테스트 구조

### 1. 파일 위치
```
component/
├── Component.tsx
├── Component.types.ts
└── __tests__/
    └── Component.test.tsx
```

### 2. 테스트 템플릿
```typescript
import { render, screen } from '@/test/utils/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '../ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    
    render(<ComponentName onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle edge cases', () => {
    // 엣지 케이스 테스트
  });
});
```

## 테스트 유형

### 1. 단위 테스트 (Unit Tests)
- 개별 컴포넌트/함수의 동작 검증
- 외부 의존성은 모킹
- 빠른 실행 속도

### 2. 통합 테스트 (Integration Tests)
- 여러 컴포넌트 간 상호작용 검증
- 실제 데이터 플로우 테스트
- API 호출은 MSW로 모킹

### 3. E2E 테스트 (End-to-End Tests)
- Playwright 사용
- 주요 사용자 시나리오 검증
- CI에서만 실행

## 모킹 전략

### 1. API 모킹 (MSW)
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/bookings', (req, res, ctx) => {
    return res(ctx.json({ data: mockBookings }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 2. 모듈 모킹
```typescript
jest.mock('@/hooks/useBookings', () => ({
  useBookings: jest.fn(() => ({
    data: mockData,
    isLoading: false,
    error: null
  }))
}));
```

## 테스트 실행

### 로컬 실행
```bash
# 전체 테스트
pnpm test

# 감시 모드
pnpm test:watch

# 커버리지 포함
pnpm test --coverage

# 특정 파일만
pnpm test DataGrid.test.tsx
```

### CI 실행
```bash
# 로컬 CI (모든 검사)
pnpm ci-local
```

## 커버리지 확인

### 터미널에서 확인
```bash
pnpm test --coverage
```

### HTML 리포트 확인
```bash
open coverage/lcov-report/index.html
```

### 커버리지 뱃지 생성
```bash
pnpm tsx scripts/gen-badge.ts
```

## 자주 묻는 질문

### Q: 테스트가 너무 느려요
A: 다음을 확인하세요:
- 불필요한 렌더링 최소화
- `waitFor` 대신 `findBy` 사용
- 무거운 연산은 `beforeAll`에서 수행

### Q: 타입 오류가 발생해요
A: `@testing-library/jest-dom`이 설치되어 있고 `jest.setup.ts`에서 import하는지 확인하세요.

### Q: 커버리지가 올라가지 않아요
A: 다음을 확인하세요:
- `collectCoverageFrom` 패턴 확인
- 테스트 파일이 올바른 위치에 있는지 확인
- `jest.config.js` 설정 확인

## 참고 자료
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest](https://jestjs.io/docs/getting-started)
- [MSW](https://mswjs.io/docs/)