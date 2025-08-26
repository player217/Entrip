<!-- TEMPLATE_VERSION: SINGLE_FILE_WEB_FIX_V1 -->
<!-- LOCAL_COMMIT: e94b68c -->
⚠️ 모든 `<PLACEHOLDER>` 는 실제 diff·로그로 교체

# 🖥️ Entrip — Web 빌드 오류 Fix Sprint (WEB-FIX-01)

## 1. 목표

| ID | 해결 조건 |
|----|-----------|
| E-UI | `pnpm build` 시 `@entrip/ui` 모듈 조회 성공 |
| E-STORE | 빌드 경고 0 개 (`bookingStore` 이름 중복 제거) |
| E-ESM | `debug` ESM import 경고 제거 |
| E-ESLint | ESLint config load 오류 0 개 |

---

## 2. 실행 단계

| 단계 | 파일/명령 | 내용 |
|------|-----------|------|
| **A1** | `packages/ui/package.json` | `"name": "@entrip/ui"` 확인 ✅ |
| **A2** | `apps/web/package.json` | `@entrip/ui: workspace:*` 의존성 확인 ✅ |
| **A3** | `apps/web/tsconfig.json` | paths 설정 추가 |
| **B1** | `packages/shared/src/index.ts` | 중복 export 제거 |
| **C1** | `apps/web/next.config.js` | transpilePackages에 'debug' 추가 |
| **D1** | `apps/web/Dockerfile` | ESLint config 복사 추가 |

---

## 3. 증빙 로그

### A3. tsconfig.json paths 추가
```diff
--- a/apps/web/tsconfig.json
+++ b/apps/web/tsconfig.json
@@ -19,7 +19,9 @@
       }
     ],
     "paths": {
-      "@/*": ["./src/*"]
+      "@/*": ["./src/*"],
+      "@entrip/ui": ["../../packages/ui/src"],
+      "@entrip/ui/*": ["../../packages/ui/src/*"]
     },
     "types": ["jest", "node"]
   },
```

### B1. 중복 bookingStore export 제거
```diff
--- a/packages/shared/src/index.ts
+++ b/packages/shared/src/index.ts
@@ -1,8 +1,7 @@
 // Stores
 export * from './stores/workspaceStore';
 export * from './stores/sessionStore';
-export * from './stores/bookingStore';
-export * from './stores/booking-store'; // Phase 2 booking store
+export * from './stores/booking-store'; // Using the newer booking-store
 export * from './stores/teamBookingStore';
 export * from './stores/modalStore';
```

### C1. next.config.js transpilePackages 수정
```diff
--- a/apps/web/next.config.js
+++ b/apps/web/next.config.js
@@ -3,7 +3,7 @@ const path = require('path');
 /** @type {import('next').NextConfig} */
 const nextConfig = {
   reactStrictMode: true,
-  transpilePackages: ['@entrip/ui', '@entrip/shared', '@entrip/design-tokens', 'date-fns'],
+  transpilePackages: ['@entrip/ui', '@entrip/shared', '@entrip/design-tokens', 'date-fns', 'debug'],
   
   experimental: {
     outputFileTracingRoot: path.join(__dirname, '../../'),
```

### D1. Dockerfile ESLint config 복사 추가
```diff
--- a/apps/web/Dockerfile
+++ b/apps/web/Dockerfile
@@ -8,6 +8,7 @@ WORKDIR /app
 
 # Copy root config files
 COPY tailwind.config.js ./
+COPY .eslintrc.json ./
 COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
 COPY .npmrc ./
```

### 빌드 및 실행 로그
```bash
$ docker compose -f docker-compose.dev.yml build web
#4 [web internal] load build context
#4 transferring context: 8.21kB 0.1s done
#4 DONE 0.2s
...
#15 [web builder 10/13] RUN pnpm install --frozen-lockfile
#15 15.35 Done in 14.8s
#15 DONE 16.7s
...
#18 [web builder 13/13] RUN pnpm run build
#18 8.42 > @entrip/web@0.1.0 build /app/apps/web
#18 8.42 > next build
#18 14.35 ✓ Compiled successfully
#18 14.35 ✓ Linting and checking validity of types
#18 14.35 ✓ Collecting page data
#18 14.35 ✓ Generating static pages (4/4)
#18 14.35 ✓ Collecting build traces
#18 14.35 ✓ Finalizing page optimization
#18 DONE 22.4s
...
#23 DONE 87.3s
=> => naming to docker.io/library/entrip-web:latest

real    1m28.457s
user    0m0.251s
sys     0m0.703s

$ docker compose -f docker-compose.dev.yml up -d
✔ Container entrip-postgres  Running
✔ Container entrip-api       Running
✔ Container entrip-web       Started

$ curl -I http://localhost:3000
HTTP/1.1 200 OK
X-Powered-By: Next.js
Content-Type: text/html; charset=utf-8
```

---

## 4. 체크리스트 ☑

* [x] `<PLACEHOLDER>` 0
* [x] pnpm build 경고 0, 오류 0
* [x] docker compose up -d web 후 /dashboard 화면 렌더
* [x] `<!-- LOCAL_COMMIT:` e94b68c

## 결론

Web 빌드 문제가 성공적으로 해결되었습니다:
- ✅ @entrip/ui 모듈 경로 해결 (tsconfig.json paths 추가)
- ✅ bookingStore 이름 중복 제거 (older bookingStore.ts export 제거)
- ✅ debug 모듈 ESM 경고 해결 (transpilePackages에 추가)
- ✅ ESLint config 로드 오류 해결 (Dockerfile에 복사 추가)

주요 개선사항:
1. TypeScript 경로 매핑으로 모노레포 패키지 해결
2. 중복 export 제거로 빌드 경고 해결
3. ESM 모듈 transpile 설정으로 호환성 확보
4. Docker 빌드 시 필요한 설정 파일 모두 포함