# 작업 티켓 템플릿

## 작업 분리 규칙

모든 기능 개발은 두 개의 별도 티켓으로 분리합니다:

### 1. 구현 티켓 (Implementation)
- **티켓 ID**: `[EPIC]-[FEATURE]-impl`
- **예시**: `FE-DG-impl` (DataGrid 구현)
- **내용**:
  - 기능 구현
  - 타입 정의
  - 기본 동작 확인

### 2. 테스트 티켓 (Test)
- **티켓 ID**: `[EPIC]-[FEATURE]-test`
- **예시**: `FE-DG-test` (DataGrid 테스트)
- **내용**:
  - 유닛 테스트 작성
  - 통합 테스트 작성
  - 커버리지 85% 이상 달성

## 티켓 템플릿

### 구현 티켓 템플릿

```markdown
## 티켓 ID: [EPIC]-[FEATURE]-impl

### 목표
[기능 설명]

### 구현 사항
- [ ] 컴포넌트/함수 구현
- [ ] TypeScript 타입 정의
- [ ] Props/인터페이스 문서화

### 완료 조건
- [ ] 기능 동작 확인
- [ ] TypeScript 오류 0개
- [ ] ESLint 경고 0개
```

### 테스트 티켓 템플릿

```markdown
## 티켓 ID: [EPIC]-[FEATURE]-test

### 목표
[EPIC]-[FEATURE]-impl의 테스트 작성

### 테스트 범위
- [ ] 정상 케이스
- [ ] 엣지 케이스
- [ ] 에러 케이스
- [ ] 통합 시나리오

### 완료 조건
- [ ] 라인 커버리지 ≥ 85%
- [ ] 모든 테스트 통과
- [ ] 테스트 문서화
```

## 작업 순서

1. **impl 티켓 작성 및 구현**
2. **impl PR 생성 (Draft)**
3. **test 티켓 작성 및 테스트 구현**
4. **test PR 생성**
5. **두 PR 모두 리뷰 통과 후 순차 머지**

> ⚠️ **중요**: test PR이 머지되기 전까지 impl PR은 Draft 상태 유지