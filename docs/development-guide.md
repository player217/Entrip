# Entrip 개발 가이드

## 시작하기

### 필수 사항
- Node.js 18.0.0 이상
- pnpm 8.0.0 이상

### 설치 및 실행
```bash
# 의존성 설치
pnpm install

# 디자인 토큰 빌드
pnpm run build:tokens

# 개발 서버 실행
pnpm run dev

# Storybook 실행
pnpm run storybook
```

## 프로젝트 구조

```
Entrip/
├── apps/
│   └── web/                   # Next.js 메인 애플리케이션
├── packages/
│   ├── design-tokens/        # 디자인 토큰 시스템
│   ├── ui/                   # 공통 UI 컴포넌트
│   └── shared/               # 공유 유틸리티, 타입
└── .storybook/               # Storybook 설정
```

## 개발 규칙

### 1. 디자인 토큰 사용
- 색상, 간격, 그림자 등은 반드시 디자인 토큰 사용
- 직접적인 수치 입력 금지
- `var(--color-brand-500)` 또는 Tailwind 클래스 사용

```tsx
// ❌ 잘못된 예
<div style={{ color: '#0050c8' }}>

// ✅ 올바른 예
<div className="text-brand-500">
```

### 2. 컴포넌트 작성
- 모든 컴포넌트는 TypeScript로 작성
- Props 인터페이스 명시적 정의
- forwardRef 사용하여 ref 전달
- 스토리북 스토리 필수 작성

```tsx
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', ...props }, ref) => {
    // 구현
  }
);
```

### 3. 스타일링
- Tailwind CSS 우선 사용
- 복잡한 스타일은 clsx로 조합
- CSS-in-JS 사용 금지

```tsx
import clsx from 'clsx';

const className = clsx(
  'base-classes',
  condition && 'conditional-classes',
  customClassName
);
```

### 4. 상태 관리
- 로컬 상태: useState, useReducer
- 전역 상태: Zustand
- 서버 상태: SWR 또는 React Query

### 5. Git 커밋 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드, 패키지 등 기타 작업
```

## 주요 스크립트

- `pnpm dev` - 개발 서버 실행
- `pnpm build` - 프로덕션 빌드
- `pnpm storybook` - 스토리북 실행
- `pnpm lint` - ESLint 검사
- `pnpm format` - Prettier 포맷팅

## 테스트

### 단위 테스트
```bash
pnpm test
```

### E2E 테스트
```bash
pnpm test:e2e
```

## 배포

### 환경 변수
- `.env.example` 참고하여 `.env.local` 생성
- 필수 환경 변수 설정

### 빌드 및 배포
```bash
pnpm build
pnpm start
```

## 문제 해결

### 디자인 토큰이 반영되지 않을 때
```bash
pnpm run build:tokens
```

### 타입 에러가 발생할 때
```bash
pnpm tsc --noEmit
```

### 의존성 문제가 발생할 때
```bash
pnpm clean
pnpm install
```

## 추가 리소스
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [React 문서](https://react.dev)
- [TypeScript 문서](https://www.typescriptlang.org/docs)
- [Storybook 문서](https://storybook.js.org/docs)
