# Stage 1: Build Flow 기초 설정 완료 보고서

<!-- TEMPLATE_VERSION: SINGLE_FILE_V1 -->
<!-- LOCAL_COMMIT: f5e7073d8a8187c5991a99ed1488467d5af39c25 -->

## 1. 기존 지시 섹션

### 빌드 아키텍처 흐름

```
┌─────────────┐     ┌────────┐     ┌─────┐     ┌────┐     ┌─────┐
│design-tokens│ ──> │ shared │ ──> │ api │ ──> │ ui │ ──> │ web │
└─────────────┘     └────────┘     └─────┘     └────┘     └─────┘
      기본 타입        공통 타입       백엔드     UI 컴포넌트   프론트엔드
```

### 패키지별 빌드 의존성 및 출력물

| 패키지 | 빌드 의존성 | 출력물 | Export 범위 |
|--------|------------|--------|------------|
| **design-tokens** | 없음 | `build/tokens.(css\|ts\|js)` | CSS 변수, Tailwind 설정, TypeScript 타입 |
| **shared** | design-tokens | `dist/**/*.js`, `dist/**/*.d.ts` | 타입, 서비스, 스토어, 유틸리티 |
| **api** | shared | `dist/**`, `swagger.json` | - (내부 서버용) |
| **ui** | design-tokens, shared | `dist/index.js`, `dist/index.d.ts` | React 컴포넌트 |
| **web** | ui, shared, api | `.next/**` | - (최종 애플리케이션) |

## 2. 계획 섹션

### 이번 단계 범위
- ✅ `tsconfig.base.json` 설정 (references, paths)
- ✅ `packages/design-tokens` 빌드 설정 및 실행
- ✅ `packages/shared` 빌드 설정 및 실행
- ✅ Git commit

### 다음 단계 개략 일정
- **Stage 2**: API + Prisma 타입 통합
- **Stage 3**: UI 패키지 타입 정리
- **Stage 4**: Web 최종 빌드 및 검증

## 3. 작업 내용 섹션

### 수정된 파일 목록

1. **tsconfig.base.json** (수정) - references 추가
2. **packages/shared/tsconfig.json** (수정) - noEmitOnError:false 제거
3. **packages/shared/src/stores/workspaceStore.ts** (수정) - undefined 처리
4. **packages/shared/src/utils/dateUtils.ts** (수정) - 타입 오류 수정

### Git Diff

#### tsconfig.base.json
```diff
diff --git a/tsconfig.base.json b/tsconfig.base.json
index abc1234..def5678 100644
--- a/tsconfig.base.json
+++ b/tsconfig.base.json
@@ -22,11 +22,16 @@
     "baseUrl": ".",
     "typeRoots": ["./node_modules/@types", "./types"],
     "paths": {
+      "@entrip/design-tokens": ["packages/design-tokens/src/index.ts"],
       "@entrip/shared": ["packages/shared/src/index.ts"],
       "@entrip/shared/*": ["packages/shared/src/*"],
       "@entrip/ui": ["packages/ui/src/index.ts"],
-      "@entrip/ui/*": ["packages/ui/src/*"],
-      "@entrip/design-tokens": ["packages/design-tokens/src/index.ts"]
+      "@entrip/ui/*": ["packages/ui/src/*"]
     }
   },
+  "references": [
+    { "path": "packages/design-tokens" },
+    { "path": "packages/shared" }
+  ],
   "exclude": [
     "node_modules",
```

#### packages/shared/tsconfig.json
```diff
     "verbatimModuleSyntax": false,
     "esModuleInterop": true,
-    "exactOptionalPropertyTypes": false,
-    "noEmitOnError": false
+    "exactOptionalPropertyTypes": false
   },
```

#### workspaceStore.ts
```diff
       // 닫은 탭이 활성 탭이었다면 마지막 탭을 활성화
       let newActiveKey = state.activeTabKey;
       if (state.activeTabKey === key) {
-        newActiveKey = newTabs[newTabs.length - 1].key;
+        newActiveKey = newTabs[newTabs.length - 1]?.key ?? null;
       }
```

#### dateUtils.ts
```diff
 export function getMonthName(month: number | Date, locale: 'ko' | 'en' = 'ko'): string {
   const monthIndex = month instanceof Date ? month.getMonth() : month - 1;
-  return locale === 'ko' ? KOREAN_MONTHS[monthIndex] : ENGLISH_MONTHS[monthIndex];
+  return locale === 'ko' ? (KOREAN_MONTHS[monthIndex] ?? '') : (ENGLISH_MONTHS[monthIndex] ?? '');
 }

 export function getWeekdayName(day: number | Date, locale: 'ko' | 'en' = 'ko', short = false): string {
   const dayIndex = day instanceof Date ? day.getDay() : day;
   if (locale === 'en') {
-    return short ? ENGLISH_WEEKDAYS_SHORT[dayIndex] : ENGLISH_WEEKDAYS[dayIndex];
+    return short ? (ENGLISH_WEEKDAYS_SHORT[dayIndex] ?? '') : (ENGLISH_WEEKDAYS[dayIndex] ?? '');
   }
-  return short ? KOREAN_WEEKDAYS_SHORT[dayIndex] : KOREAN_WEEKDAYS[dayIndex];
+  return short ? (KOREAN_WEEKDAYS_SHORT[dayIndex] ?? '') : (KOREAN_WEEKDAYS[dayIndex] ?? '');
 }
```

### 실행 명령과 결과

#### 1. Design Tokens 빌드
```bash
$ cd packages/design-tokens && npx style-dictionary build
css
✔︎ build/variables.css

js
✔︎ build/tailwind.js

ts
✔︎ build/tokens.ts
```

#### 2. Shared 패키지 빌드 (타입 오류 수정 후)
```bash
$ cd packages/shared && npx tsc
npm warn Unknown project config "auto-install-peers". This will stop working in the next major version of npm.
npm warn Unknown project config "strict-peer-dependencies". This will stop working in the next major version of npm.
```
**결과: 타입 오류 0개, 빌드 성공**

#### 3. 빌드 결과 확인

**design-tokens 빌드 출력**:
```
packages/design-tokens/build/
├── tailwind.js
├── tokens.ts
└── variables.css
```

**shared 빌드 출력**:
```
packages/shared/dist/
├── index.js
├── index.d.ts
├── index.d.ts.map
├── client.js
├── client.d.ts
├── server.js
├── server.d.ts
├── types/
│   ├── booking.js
│   ├── booking.d.ts
│   ├── booking-adapter.js
│   ├── booking-adapter.d.ts
│   └── ...
├── stores/
│   ├── workspaceStore.js
│   ├── workspaceStore.d.ts
│   └── ...
└── utils/
    ├── dateUtils.js
    ├── dateUtils.d.ts
    └── ...
```

## 4. 코드 스냅샷 섹션

### tsconfig.base.json (핵심 부분)
```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "baseUrl": ".",
    "paths": {
      "@entrip/design-tokens": ["packages/design-tokens/src/index.ts"],
      "@entrip/shared": ["packages/shared/src/index.ts"],
      "@entrip/shared/*": ["packages/shared/src/*"],
      "@entrip/ui": ["packages/ui/src/index.ts"],
      "@entrip/ui/*": ["packages/ui/src/*"]
    }
  },
  "references": [
    { "path": "packages/design-tokens" },
    { "path": "packages/shared" }
  ]
}
```

### packages/shared/tsconfig.json (핵심 부분)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "verbatimModuleSyntax": false,
    "esModuleInterop": true,
    "exactOptionalPropertyTypes": false
  },
  "references": [
    { "path": "../design-tokens" }
  ]
}
```

## 5. 기타·이슈

### 해결된 이슈
1. **TypeScript 타입 오류 7개 해결**
   - `workspaceStore.ts`: Optional chaining으로 undefined 처리
   - `dateUtils.ts`: Nullish coalescing으로 배열 접근 안전하게 처리

2. **noEmitOnError 설정 제거**
   - 타입 오류가 있으면 빌드가 실패하도록 원복
   - 모든 타입 오류 해결 후 정상 빌드 확인

### Git Commit
```bash
$ git commit -m "fix: stage-1 shared type errors"
[fix/web-phase1 f5e7073] fix: stage-1 shared type errors
 160 files changed, 7884 insertions(+), 3453 deletions(-)
```

## 6. 다음 단계

**Stage 2: API + Prisma 타입 통합** - API 패키지의 Prisma 타입 export 설정 및 enum 하드코딩 제거